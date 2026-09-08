/**
 * Creacion de solicitudes de evento.
 *
 * Un evento NO es una reserva cerrada: entra al CRM en estado `solicitud` y
 * el administrador confirma el precio. El cliente recibe un estimado, nunca
 * una confirmacion.
 */
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  branches, customers, eventItems, events, menuItems, packages, reservations,
} from "@/lib/db/schema";
import { aUTC } from "@/lib/datetime";
import { DEFINICION_FRANJAS, minutosAHora, type Franja } from "@/lib/franjas";
import { generarCodigoPublico } from "@/lib/codigo";
import { firmarToken, hashDeToken } from "@/lib/tokens";
import { normalizarTelefonoCR } from "@/lib/telefono";
import { sucursalPorSlug } from "@/data/sucursales";
import { POLITICA_EVENTO, type Ocasion, type Source } from "@/data/politicas";
import { cotizarAMedida, cotizarPaquete, type Cotizacion, type SeleccionItem } from "./cotizador";

export type DatosEvento = {
  sucursalSlug: string;
  fechaLocal: string;
  fechaFlexible: boolean;
  franja: Franja;
  ocasion: Ocasion;
  numPersonas: number;
  paqueteSlug: string;
  /** Solo para "a la medida". */
  seleccion?: SeleccionItem[];
  nombre: string;
  telefono: string;
  email?: string;
  preferenciaContacto: "whatsapp" | "llamada" | "correo";
  notas?: string;
  consentMarketing: boolean;
  source?: Source;
};

export type ResultadoEvento =
  | { ok: true; codigoPublico: string; eventId: string; cotizacion: Cotizacion }
  | { ok: false; error: string; campo?: keyof DatosEvento };

/** Cotiza sin guardar nada. Lo usa el paso de estimado en vivo. */
export function cotizarSolicitud(
  paqueteSlug: string,
  numPersonas: number,
  seleccion?: SeleccionItem[],
): Cotizacion | null {
  return paqueteSlug === "a-la-medida"
    ? cotizarAMedida(seleccion ?? [], numPersonas)
    : cotizarPaquete(paqueteSlug, numPersonas);
}

export async function crearSolicitudEvento(d: DatosEvento): Promise<ResultadoEvento> {
  const sucursal = sucursalPorSlug(d.sucursalSlug);
  if (!sucursal) return { ok: false, error: "Esa sucursal no existe.", campo: "sucursalSlug" };

  if (d.numPersonas < POLITICA_EVENTO.minPersonas) {
    return {
      ok: false,
      error: `Los eventos son desde ${POLITICA_EVENTO.minPersonas} personas.`,
      campo: "numPersonas",
    };
  }

  // El tope es por sucursal, no un único global (supuesto S-2).
  if (d.numPersonas > sucursal.capacidadMaxEvento) {
    return {
      ok: false,
      error: `${sucursal.nombre} recibe hasta ${sucursal.capacidadMaxEvento} personas por evento.`,
      campo: "numPersonas",
    };
  }

  const telefonoE164 = normalizarTelefonoCR(d.telefono);
  if (!telefonoE164) {
    return { ok: false, error: "El teléfono no parece de Costa Rica.", campo: "telefono" };
  }

  // 72 horas de anticipación mínima.
  const franja = DEFINICION_FRANJAS[d.franja];
  const startsAt = aUTC(d.fechaLocal, minutosAHora(franja.inicioMin));
  const minimo = new Date(Date.now() + POLITICA_EVENTO.anticipacionMinimaHoras * 3600_000);
  if (startsAt < minimo) {
    return {
      ok: false,
      error: `Necesitamos ${POLITICA_EVENTO.anticipacionMinimaHoras} horas de anticipación para un evento.`,
      campo: "fechaLocal",
    };
  }

  const cotizacion = cotizarSolicitud(d.paqueteSlug, d.numPersonas, d.seleccion);
  if (!cotizacion) {
    return { ok: false, error: "Ese paquete no existe.", campo: "paqueteSlug" };
  }

  const db = getDb();

  // La reserva del evento dura la franja completa: es el dato documentado, no
  // un número inventado.
  const endsAt = aUTC(d.fechaLocal, minutosAHora(franja.finMin));
  const duracionMin = franja.finMin - franja.inicioMin;

  const [cliente] = await db
    .insert(customers)
    .values({
      nombre: d.nombre,
      telefonoE164,
      email: d.email || null,
      consentMarketing: d.consentMarketing,
      consentAt: d.consentMarketing ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: customers.telefonoE164,
      set: { nombre: d.nombre, email: d.email || null, updatedAt: new Date() },
    })
    .returning({ id: customers.id });

  const [branchRow] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(eq(branches.slug, d.sucursalSlug))
    .limit(1);
  if (!branchRow) return { ok: false, error: "Esa sucursal no existe.", campo: "sucursalSlug" };

  const [paqueteRow] = await db
    .select({ id: packages.id })
    .from(packages)
    .where(eq(packages.slug, d.paqueteSlug))
    .limit(1);

  const codigoPublico = generarCodigoPublico();

  try {
    const [reserva] = await db
      .insert(reservations)
      .values({
        codigoPublico,
        branchId: branchRow.id,
        customerId: cliente.id,
        tipo: "evento",
        startsAt,
        endsAt,
        fechaLocal: d.fechaLocal,
        franja: d.franja,
        duracionMin,
        numPersonas: d.numPersonas,
        estado: "pendiente",
        source: d.source ?? "web",
        ocasion: d.ocasion,
        notasCliente: d.notas || null,
        ticketEstimadoCentimos: cotizacion.totalCentimos,
      })
      .returning({ id: reservations.id });

    const token = firmarToken(reserva.id);
    await db
      .update(reservations)
      .set({ cancelTokenHash: hashDeToken(token) })
      .where(eq(reservations.id, reserva.id));

    const [evento] = await db
      .insert(events)
      .values({
        reservationId: reserva.id,
        ocasion: d.ocasion,
        fechaFlexible: d.fechaFlexible,
        numPersonas: d.numPersonas,
        packageId: paqueteRow?.id ?? null,
        subtotalCentimos: cotizacion.subtotalCentimos,
        ivaPct: cotizacion.ivaPct,
        servicioPct: cotizacion.servicioPct,
        totalEstimadoCentimos: cotizacion.totalCentimos,
        depositoCentimos: cotizacion.depositoCentimos,
        estadoPipeline: "solicitud",
        probabilidadPct: 10,
        preferenciaContacto: d.preferenciaContacto,
        // Copia inmutable de lo que se le mostró al cliente.
        cotizacionSnapshotJson: cotizacion,
      })
      .returning({ id: events.id });

    // Las líneas se guardan con el precio congelado, y con el nombre copiado
    // por si el ítem desaparece del menú más adelante.
    if (cotizacion.lineas.length > 0) {
      const slugs = cotizacion.lineas.map((l) => l.slug);
      const items = await db
        .select({ id: menuItems.id, slug: menuItems.slug })
        .from(menuItems)
        .where(inArray(menuItems.slug, slugs));
      const porSlug = new Map(items.map((i) => [i.slug, i.id]));

      await db.insert(eventItems).values(
        cotizacion.lineas.map((l) => ({
          eventId: evento.id,
          menuItemId: porSlug.get(l.slug) ?? null,
          nombreSnapshot: l.nombre,
          cantidad: l.cantidad,
          precioUnitarioCentimos: l.precioUnitarioCentimos,
        })),
      );
    }

    return { ok: true, codigoPublico, eventId: evento.id, cotizacion };
  } catch (e) {
    console.error("Falló crear la solicitud de evento:", e);
    return { ok: false, error: "No pudimos guardar la solicitud. Intentá de nuevo." };
  }
}
