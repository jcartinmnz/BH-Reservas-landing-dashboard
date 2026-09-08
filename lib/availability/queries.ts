/**
 * Consultas que alimentan el motor de disponibilidad.
 *
 * El motor es puro (lib/availability/engine.ts); esta capa junta lo que
 * necesita desde Postgres.
 */
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { blackoutDates, branches, reservations, tables } from "@/lib/db/schema";
import { sucursalPorSlug, type Sucursal } from "@/data/sucursales";
import {
  calcularDisponibilidad, type Blackout, type Mesa, type ReservaExistente, type Slot,
} from "./engine";

/** Estados que ocupan campo. Una cancelada o un no-show liberan la mesa. */
export const ESTADOS_VIVOS = ["pendiente", "confirmada", "sentada"] as const;

export async function cargarContextoDelDia(slug: string, fechaLocal: string) {
  const db = getDb();

  const [branch] = await db.select().from(branches).where(eq(branches.slug, slug)).limit(1);
  if (!branch) return null;

  const [reservas, bloqueos, mesas] = await Promise.all([
    db
      .select({
        startsAt: reservations.startsAt,
        endsAt: reservations.endsAt,
        franja: reservations.franja,
        numPersonas: reservations.numPersonas,
        tableId: reservations.tableId,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.branchId, branch.id),
          eq(reservations.fechaLocal, fechaLocal),
          inArray(reservations.estado, [...ESTADOS_VIVOS]),
        ),
      ),
    db
      .select({
        franja: blackoutDates.franja,
        tipo: blackoutDates.tipo,
        capacidadOverride: blackoutDates.capacidadOverride,
      })
      .from(blackoutDates)
      .where(and(eq(blackoutDates.branchId, branch.id), eq(blackoutDates.fecha, fechaLocal))),
    db
      .select({
        id: tables.id,
        capacidadMin: tables.capacidadMin,
        capacidadMax: tables.capacidadMax,
        zona: tables.zona,
        activa: tables.activa,
      })
      .from(tables)
      .where(and(eq(tables.branchId, branch.id), eq(tables.activa, true))),
  ]);

  return {
    branchId: branch.id,
    reservas: reservas as ReservaExistente[],
    blackouts: bloqueos as Blackout[],
    mesas: mesas as Mesa[],
  };
}

/**
 * Horarios disponibles de un dia.
 *
 * Los parametros de sucursal salen de `data/sucursales.ts`, que es la fuente
 * de verdad del seed; la base aporta el estado que cambia (reservas,
 * bloqueos, mesas).
 */
export async function horariosDisponibles(
  slug: string,
  fechaLocal: string,
  numPersonas: number,
  ahora = new Date(),
): Promise<{ slots: Slot[]; branchId: string; sucursal: Sucursal } | null> {
  const sucursal = sucursalPorSlug(slug);
  if (!sucursal) return null;

  const ctx = await cargarContextoDelDia(slug, fechaLocal);
  if (!ctx) return null;

  return {
    branchId: ctx.branchId,
    sucursal,
    slots: calcularDisponibilidad({
      sucursal,
      fechaLocal,
      numPersonas,
      ahora,
      reservas: ctx.reservas,
      blackouts: ctx.blackouts,
      mesas: ctx.mesas,
    }),
  };
}
