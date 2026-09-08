"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { auditLog, eventActivity, eventItems, events, reservations } from "@/lib/db/schema";
import { obtenerSesion, alcanceSucursal, PUEDE } from "@/lib/auth/sesion";
import { desglosar, aplicarPct } from "@/lib/money";
import { POLITICA_EVENTO } from "@/data/politicas";

const ETAPAS = [
  "solicitud", "contactado", "cotizacion_enviada", "negociacion",
  "confirmado", "realizado", "perdido",
] as const;

export type Etapa = (typeof ETAPAS)[number];

export const NOMBRE_ETAPA: Record<Etapa, string> = {
  solicitud: "Solicitud",
  contactado: "Contactado",
  cotizacion_enviada: "Cotización enviada",
  negociacion: "Negociación",
  confirmado: "Confirmado",
  realizado: "Realizado",
  perdido: "Perdido",
};

/**
 * Probabilidad por etapa.
 *
 * Es lo que convierte "valor en pipeline" en un numero accionable: sumar el
 * total de todas las solicitudes sin ponderar da una cifra que no significa
 * nada.
 */
export const PROBABILIDAD_ETAPA: Record<Etapa, number> = {
  solicitud: 10,
  contactado: 25,
  cotizacion_enviada: 40,
  negociacion: 60,
  confirmado: 100,
  realizado: 100,
  perdido: 0,
};

/** Verifica que el evento esté dentro del alcance del rol. */
async function eventoEnAlcance(eventId: string, sesion: Awaited<ReturnType<typeof obtenerSesion>>) {
  if (!sesion) return null;
  const db = getDb();
  const alcance = alcanceSucursal(sesion);
  const [fila] = await db
    .select({ id: events.id, etapa: events.estadoPipeline, reservationId: events.reservationId })
    .from(events)
    .innerJoin(reservations, eq(reservations.id, events.reservationId))
    .where(
      alcance
        ? and(eq(events.id, eventId), eq(reservations.branchId, alcance))
        : eq(events.id, eventId),
    )
    .limit(1);
  return fila ?? null;
}

const moverSchema = z.object({
  eventId: z.string().uuid(),
  etapa: z.enum(ETAPAS),
  motivoPerdida: z.string().trim().max(500).optional(),
});

export async function moverEtapa(entrada: unknown) {
  const sesion = await obtenerSesion();
  if (!sesion) return { ok: false as const, error: "Sesión vencida." };
  if (!PUEDE.verPipeline(sesion)) return { ok: false as const, error: "Sin permiso." };

  const parsed = moverSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false as const, error: "Datos inválidos." };
  const { eventId, etapa, motivoPerdida } = parsed.data;

  // El motivo de pérdida es obligatorio: es el dato más valioso del CRM y el
  // que siempre se pierde si no se exige en el momento.
  if (etapa === "perdido" && !motivoPerdida) {
    return { ok: false as const, error: "Indicá por qué se perdió el evento." };
  }

  const evento = await eventoEnAlcance(eventId, sesion);
  if (!evento) return { ok: false as const, error: "No encontramos ese evento." };

  const db = getDb();
  await db
    .update(events)
    .set({
      estadoPipeline: etapa,
      probabilidadPct: PROBABILIDAD_ETAPA[etapa],
      motivoPerdida: etapa === "perdido" ? motivoPerdida! : null,
      fechaConfirmacion: etapa === "confirmado" ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId));

  // Confirmar el evento confirma también su reserva.
  if (etapa === "confirmado") {
    await db
      .update(reservations)
      .set({ estado: "confirmada", confirmedAt: new Date() })
      .where(eq(reservations.id, evento.reservationId));
  }

  await db.insert(eventActivity).values({
    eventId,
    tipo: "cambio_estado",
    contenido: `${evento.etapa} → ${etapa}${motivoPerdida ? ` · ${motivoPerdida}` : ""}`,
    autorId: sesion.staffId,
  });

  revalidatePath("/admin/eventos");
  return { ok: true as const };
}

const notaSchema = z.object({
  eventId: z.string().uuid(),
  tipo: z.enum(["nota", "llamada", "whatsapp"]),
  contenido: z.string().trim().min(1).max(2000),
});

export async function registrarActividad(entrada: unknown) {
  const sesion = await obtenerSesion();
  if (!sesion) return { ok: false as const, error: "Sesión vencida." };

  const parsed = notaSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false as const, error: "Datos inválidos." };

  const evento = await eventoEnAlcance(parsed.data.eventId, sesion);
  if (!evento) return { ok: false as const, error: "No encontramos ese evento." };

  const db = getDb();
  await db.insert(eventActivity).values({
    eventId: parsed.data.eventId,
    tipo: parsed.data.tipo,
    contenido: parsed.data.contenido,
    autorId: sesion.staffId,
  });

  revalidatePath(`/admin/eventos/${parsed.data.eventId}`);
  return { ok: true as const };
}

const cotizacionSchema = z.object({
  eventId: z.string().uuid(),
  lineas: z
    .array(
      z.object({
        nombre: z.string().trim().min(1).max(120),
        cantidad: z.coerce.number().int().min(1).max(1000),
        // Colones enteros; se convierten a céntimos acá.
        precioColones: z.coerce.number().int().min(0).max(10_000_000),
      }),
    )
    .max(100),
});

/** Ajusta la cotización desde el CRM y recalcula el total. */
export async function guardarCotizacion(entrada: unknown) {
  const sesion = await obtenerSesion();
  if (!sesion) return { ok: false as const, error: "Sesión vencida." };
  if (!PUEDE.editarCotizacion(sesion)) return { ok: false as const, error: "Sin permiso." };

  const parsed = cotizacionSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false as const, error: "Datos inválidos." };
  const { eventId, lineas } = parsed.data;

  const evento = await eventoEnAlcance(eventId, sesion);
  if (!evento) return { ok: false as const, error: "No encontramos ese evento." };

  const db = getDb();
  const [actual] = await db
    .select({ ivaPct: events.ivaPct, servicioPct: events.servicioPct })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  const conCentimos = lineas.map((l) => ({
    ...l,
    precioUnitarioCentimos: l.precioColones * 100,
    subtotalCentimos: l.precioColones * 100 * l.cantidad,
  }));
  const subtotal = conCentimos.reduce((s, l) => s + l.subtotalCentimos, 0);
  const { total } = desglosar(subtotal, actual.ivaPct, actual.servicioPct);

  // Se reemplazan las líneas por completo: editar una cotización es
  // reemplazarla, no acumular versiones sueltas.
  await db.delete(eventItems).where(eq(eventItems.eventId, eventId));
  if (conCentimos.length > 0) {
    await db.insert(eventItems).values(
      conCentimos.map((l) => ({
        eventId,
        menuItemId: null,
        nombreSnapshot: l.nombre,
        cantidad: l.cantidad,
        precioUnitarioCentimos: l.precioUnitarioCentimos,
      })),
    );
  }

  await db
    .update(events)
    .set({
      subtotalCentimos: subtotal,
      totalConfirmadoCentimos: total,
      depositoCentimos: aplicarPct(total, POLITICA_EVENTO.depositoPct),
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId));

  await db.insert(auditLog).values({
    tabla: "events",
    registroId: eventId,
    accion: "editar_cotizacion",
    actorId: sesion.staffId,
    diffJson: { subtotalCentimos: subtotal, totalCentimos: total },
  });

  revalidatePath(`/admin/eventos/${eventId}`);
  return { ok: true as const, subtotal, total };
}

const depositoSchema = z.object({
  eventId: z.string().uuid(),
  montoColones: z.coerce.number().int().min(0).max(100_000_000),
});

export async function registrarDeposito(entrada: unknown) {
  const sesion = await obtenerSesion();
  if (!sesion) return { ok: false as const, error: "Sesión vencida." };
  // Registrar dinero recibido queda solo en administración.
  if (!PUEDE.registrarDeposito(sesion)) {
    return { ok: false as const, error: "Solo administración registra depósitos." };
  }

  const parsed = depositoSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false as const, error: "Datos inválidos." };

  const evento = await eventoEnAlcance(parsed.data.eventId, sesion);
  if (!evento) return { ok: false as const, error: "No encontramos ese evento." };

  const db = getDb();
  await db
    .update(events)
    .set({
      depositoCentimos: parsed.data.montoColones * 100,
      depositoPagadoAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(events.id, parsed.data.eventId));

  await db.insert(eventActivity).values({
    eventId: parsed.data.eventId,
    tipo: "nota",
    contenido: `Depósito registrado: ₡${parsed.data.montoColones.toLocaleString("es-CR")}`,
    autorId: sesion.staffId,
  });

  await db.insert(auditLog).values({
    tabla: "events",
    registroId: parsed.data.eventId,
    accion: "registrar_deposito",
    actorId: sesion.staffId,
    diffJson: { montoCentimos: parsed.data.montoColones * 100 },
  });

  revalidatePath(`/admin/eventos/${parsed.data.eventId}`);
  return { ok: true as const };
}

export { ETAPAS };
