"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { auditLog, reservations } from "@/lib/db/schema";
import { obtenerSesion, alcanceSucursal, PUEDE } from "@/lib/auth/sesion";

const ESTADOS = [
  "pendiente", "confirmada", "sentada", "completada", "cancelada", "no_show",
] as const;

/**
 * Transiciones validas del estado de una reserva.
 *
 * Se declaran explicitamente en vez de permitir cualquier cambio: marcar como
 * "sentada" una reserva ya cancelada es un error de operacion, y el sistema
 * deberia impedirlo en vez de guardarlo.
 */
const TRANSICIONES: Record<string, readonly string[]> = {
  pendiente: ["confirmada", "cancelada", "no_show"],
  confirmada: ["sentada", "cancelada", "no_show"],
  sentada: ["completada", "cancelada"],
  completada: [],
  cancelada: [],
  no_show: [],
};

const cambiarEstadoSchema = z.object({
  reservationId: z.string().uuid(),
  estado: z.enum(ESTADOS),
  motivo: z.string().trim().max(500).optional(),
});

export async function cambiarEstado(entrada: unknown) {
  const sesion = await obtenerSesion();
  if (!sesion) return { ok: false as const, error: "Sesión vencida." };

  const parsed = cambiarEstadoSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false as const, error: "Datos inválidos." };

  const { reservationId, estado, motivo } = parsed.data;
  const db = getDb();
  const alcance = alcanceSucursal(sesion);

  const [actual] = await db
    .select({ id: reservations.id, estado: reservations.estado, branchId: reservations.branchId })
    .from(reservations)
    .where(
      alcance
        ? and(eq(reservations.id, reservationId), eq(reservations.branchId, alcance))
        : eq(reservations.id, reservationId),
    )
    .limit(1);

  if (!actual) return { ok: false as const, error: "No encontramos esa reserva." };

  if (!TRANSICIONES[actual.estado]?.includes(estado)) {
    return {
      ok: false as const,
      error: `No se puede pasar de ${actual.estado} a ${estado}.`,
    };
  }

  const ahora = new Date();
  // Cada transición deja su propio timestamp: sin esto no hay lead time ni
  // tiempo de servicio, que son KPIs pedidos.
  const sellos: Record<string, Partial<typeof reservations.$inferInsert>> = {
    confirmada: { confirmedAt: ahora },
    sentada: { seatedAt: ahora },
    completada: { completedAt: ahora },
    cancelada: { cancelledAt: ahora, canceladoPor: "staff", motivoCancelacion: motivo ?? null },
    no_show: { cancelledAt: ahora, canceladoPor: "staff", motivoCancelacion: "No-show" },
  };

  await db
    .update(reservations)
    .set({ estado, ...(sellos[estado] ?? {}) })
    .where(eq(reservations.id, reservationId));

  await db.insert(auditLog).values({
    tabla: "reservations",
    registroId: reservationId,
    accion: "cambio_estado",
    actorId: sesion.staffId,
    diffJson: { de: actual.estado, a: estado, motivo: motivo ?? null },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/dia");
  return { ok: true as const };
}

const notaSchema = z.object({
  reservationId: z.string().uuid(),
  notasInternas: z.string().trim().max(2000),
});

export async function guardarNotaInterna(entrada: unknown) {
  const sesion = await obtenerSesion();
  if (!sesion) return { ok: false as const, error: "Sesión vencida." };
  if (!PUEDE.editarNotasInternas(sesion)) {
    return { ok: false as const, error: "No tenés permiso para editar notas." };
  }

  const parsed = notaSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false as const, error: "Datos inválidos." };

  const db = getDb();
  const alcance = alcanceSucursal(sesion);

  await db
    .update(reservations)
    .set({ notasInternas: parsed.data.notasInternas || null })
    .where(
      alcance
        ? and(eq(reservations.id, parsed.data.reservationId), eq(reservations.branchId, alcance))
        : eq(reservations.id, parsed.data.reservationId),
    );

  revalidatePath("/admin");
  return { ok: true as const };
}

export { TRANSICIONES };
