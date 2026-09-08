/**
 * Creacion de reservas de mesa.
 *
 * La disponibilidad se vuelve a validar en el servidor aunque el wizard ya la
 * haya mostrado: entre que el cliente ve el horario y aprieta confirmar pueden
 * pasar minutos, y otro puede haber tomado el campo.
 *
 * Aun asi, la ultima palabra la tiene Postgres. Revalidar y despues insertar
 * no es atomico entre instancias serverless, asi que las constraints de la
 * base (EXCLUDE de solape e indice unico anti duplicado) son la garantia real,
 * y aca se traducen sus errores a mensajes que el cliente entienda.
 */
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { customers, reservations } from "@/lib/db/schema";
import { aUTC } from "@/lib/datetime";
import { franjaDeMinuto, horaAMinutos } from "@/lib/franjas";
import { duracionMesa } from "@/data/politicas";
import type { Ocasion, Source } from "@/data/politicas";
import { generarCodigoPublico } from "@/lib/codigo";
import { firmarToken, hashDeToken } from "@/lib/tokens";
import { normalizarTelefonoCR } from "@/lib/telefono";
import { horariosDisponibles } from "@/lib/availability/queries";

export type DatosReserva = {
  sucursalSlug: string;
  fechaLocal: string;
  hora: string;
  numPersonas: number;
  nombre: string;
  telefono: string;
  email?: string;
  ocasion?: Ocasion;
  notasCliente?: string;
  consentMarketing: boolean;
  source?: Source;
};

export type ResultadoReserva =
  | { ok: true; codigoPublico: string; reservationId: string; token: string }
  | { ok: false; error: string; campo?: keyof DatosReserva };

/** Codigos de error de Postgres que sabemos traducir. */
const UNIQUE_VIOLATION = "23505";
const EXCLUSION_VIOLATION = "23P01";
const CHECK_VIOLATION = "23514";

function codigoPg(e: unknown): string | undefined {
  return typeof e === "object" && e !== null && "code" in e
    ? String((e as { code: unknown }).code)
    : undefined;
}

export async function crearReserva(datos: DatosReserva): Promise<ResultadoReserva> {
  const telefonoE164 = normalizarTelefonoCR(datos.telefono);
  if (!telefonoE164) {
    return { ok: false, error: "El teléfono no parece de Costa Rica.", campo: "telefono" };
  }

  const franja = franjaDeMinuto(horaAMinutos(datos.hora));
  if (!franja) {
    return { ok: false, error: "No atendemos reservas a esa hora.", campo: "hora" };
  }

  // Revalidación en el servidor: nunca se confía en lo que mandó el cliente.
  const disponibilidad = await horariosDisponibles(
    datos.sucursalSlug, datos.fechaLocal, datos.numPersonas,
  );
  if (!disponibilidad) {
    return { ok: false, error: "Esa sucursal no existe.", campo: "sucursalSlug" };
  }

  const slot = disponibilidad.slots.find((s) => s.hora === datos.hora);
  if (!slot?.disponible) {
    return { ok: false, error: "Ese horario ya no está disponible.", campo: "hora" };
  }

  const db = getDb();
  const startsAt = aUTC(datos.fechaLocal, datos.hora);
  const duracionMin = duracionMesa(datos.numPersonas);
  const endsAt = new Date(startsAt.getTime() + duracionMin * 60_000);

  // El cliente se identifica por teléfono, no por email: el email falta seguido.
  const [cliente] = await db
    .insert(customers)
    .values({
      nombre: datos.nombre,
      telefonoE164,
      email: datos.email || null,
      consentMarketing: datos.consentMarketing,
      consentAt: datos.consentMarketing ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: customers.telefonoE164,
      set: { nombre: datos.nombre, email: datos.email || null, updatedAt: new Date() },
    })
    .returning({ id: customers.id });

  const codigoPublico = generarCodigoPublico();

  try {
    const [reserva] = await db
      .insert(reservations)
      .values({
        codigoPublico,
        branchId: disponibilidad.branchId,
        customerId: cliente.id,
        tipo: "mesa",
        startsAt,
        endsAt,
        fechaLocal: datos.fechaLocal,
        franja,
        duracionMin,
        numPersonas: datos.numPersonas,
        tableId: slot.mesaId ?? null,
        estado: "pendiente",
        source: datos.source ?? "web",
        ocasion: datos.ocasion ?? null,
        notasCliente: datos.notasCliente || null,
      })
      .returning({ id: reservations.id });

    // El token viaja en el correo; la base guarda solo su hash.
    const token = firmarToken(reserva.id);
    await db
      .update(reservations)
      .set({ cancelTokenHash: hashDeToken(token) })
      .where(eq(reservations.id, reserva.id));

    return { ok: true, codigoPublico, reservationId: reserva.id, token };
  } catch (e) {
    switch (codigoPg(e)) {
      case UNIQUE_VIOLATION:
        return {
          ok: false,
          error: "Ya tenés una reserva a esa hora en esta sucursal.",
          campo: "hora",
        };
      case EXCLUSION_VIOLATION:
        // Otra instancia tomó la mesa entre la revalidación y este insert.
        return { ok: false, error: "Ese horario se acaba de ocupar.", campo: "hora" };
      case CHECK_VIOLATION:
        return { ok: false, error: "Los datos de la reserva no son válidos." };
      default:
        console.error("Falló crear la reserva:", e);
        return { ok: false, error: "No pudimos guardar la reserva. Intentá de nuevo." };
    }
  }
}

/** Busca una reserva por su código público, para la pantalla de gestión. */
export async function buscarPorCodigo(codigoPublico: string) {
  const db = getDb();
  const [r] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.codigoPublico, codigoPublico))
    .limit(1);
  return r ?? null;
}

/** Cancela una reserva viva. Idempotente sobre una ya cancelada. */
export async function cancelarReserva(reservationId: string, motivo?: string) {
  const db = getDb();
  const [r] = await db
    .update(reservations)
    .set({
      estado: "cancelada",
      cancelledAt: new Date(),
      canceladoPor: "cliente",
      motivoCancelacion: motivo || null,
    })
    .where(
      and(eq(reservations.id, reservationId), eq(reservations.estado, "pendiente")),
    )
    .returning({ id: reservations.id });
  return Boolean(r);
}
