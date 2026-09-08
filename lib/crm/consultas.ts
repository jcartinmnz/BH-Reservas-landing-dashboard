import "server-only";
import { and, asc, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  branches, customers, eventItems, events, packages, reservations, staff, tables,
} from "@/lib/db/schema";
import type { Sesion } from "@/lib/auth/sesion";
import { alcanceSucursal } from "@/lib/auth/sesion";
import type { Franja } from "@/lib/franjas";

export type EstadoReserva =
  | "pendiente" | "confirmada" | "sentada" | "completada" | "cancelada" | "no_show";

export type FiltrosCalendario = {
  desde: string;
  hasta: string;
  branchId?: string;
  tipo?: "mesa" | "evento";
  estado?: EstadoReserva;
  franja?: Franja;
};

/**
 * Restringe cualquier consulta a las sucursales que la sesion puede ver.
 *
 * Se aplica en TODAS las consultas del CRM, no solo donde se ve la lista: un
 * gerente de sucursal no puede leer las reservas de otra ni forzando un id en
 * la URL.
 */
function limitarPorRol(sesion: Sesion, branchIdPedido?: string) {
  const alcance = alcanceSucursal(sesion);
  if (alcance) return eq(reservations.branchId, alcance);
  return branchIdPedido ? eq(reservations.branchId, branchIdPedido) : undefined;
}

export type ReservaCalendario = {
  id: string;
  codigoPublico: string;
  startsAt: Date;
  endsAt: Date;
  fechaLocal: string;
  franja: Franja;
  tipo: "mesa" | "evento";
  estado: EstadoReserva;
  numPersonas: number;
  source: string;
  cliente: string;
  telefono: string;
  sucursal: string;
  branchId: string;
  mesa: string | null;
  ocasion: string | null;
  notasCliente: string | null;
  notasInternas: string | null;
};

export async function reservasDelRango(
  sesion: Sesion,
  f: FiltrosCalendario,
): Promise<ReservaCalendario[]> {
  const db = getDb();
  const condiciones = [
    gte(reservations.fechaLocal, f.desde),
    lte(reservations.fechaLocal, f.hasta),
    limitarPorRol(sesion, f.branchId),
    f.tipo ? eq(reservations.tipo, f.tipo) : undefined,
    f.estado ? eq(reservations.estado, f.estado) : undefined,
    f.franja ? eq(reservations.franja, f.franja) : undefined,
  ].filter(Boolean);

  const filas = await db
    .select({
      id: reservations.id,
      codigoPublico: reservations.codigoPublico,
      startsAt: reservations.startsAt,
      endsAt: reservations.endsAt,
      fechaLocal: reservations.fechaLocal,
      franja: reservations.franja,
      tipo: reservations.tipo,
      estado: reservations.estado,
      numPersonas: reservations.numPersonas,
      source: reservations.source,
      ocasion: reservations.ocasion,
      notasCliente: reservations.notasCliente,
      notasInternas: reservations.notasInternas,
      cliente: customers.nombre,
      telefono: customers.telefonoE164,
      sucursal: branches.nombre,
      branchId: branches.id,
      mesa: tables.nombre,
    })
    .from(reservations)
    .innerJoin(customers, eq(customers.id, reservations.customerId))
    .innerJoin(branches, eq(branches.id, reservations.branchId))
    .leftJoin(tables, eq(tables.id, reservations.tableId))
    .where(and(...condiciones))
    .orderBy(asc(reservations.startsAt));

  return filas as ReservaCalendario[];
}

/** Una reserva con todo su detalle, respetando el alcance del rol. */
export async function reservaPorId(sesion: Sesion, id: string) {
  const db = getDb();
  const [fila] = await db
    .select({
      id: reservations.id,
      codigoPublico: reservations.codigoPublico,
      startsAt: reservations.startsAt,
      endsAt: reservations.endsAt,
      franja: reservations.franja,
      tipo: reservations.tipo,
      estado: reservations.estado,
      numPersonas: reservations.numPersonas,
      source: reservations.source,
      ocasion: reservations.ocasion,
      notasCliente: reservations.notasCliente,
      notasInternas: reservations.notasInternas,
      createdAt: reservations.createdAt,
      confirmedAt: reservations.confirmedAt,
      seatedAt: reservations.seatedAt,
      completedAt: reservations.completedAt,
      cancelledAt: reservations.cancelledAt,
      motivoCancelacion: reservations.motivoCancelacion,
      cliente: customers.nombre,
      clienteId: customers.id,
      telefono: customers.telefonoE164,
      email: customers.email,
      sucursal: branches.nombre,
      branchId: branches.id,
      mesa: tables.nombre,
    })
    .from(reservations)
    .innerJoin(customers, eq(customers.id, reservations.customerId))
    .innerJoin(branches, eq(branches.id, reservations.branchId))
    .leftJoin(tables, eq(tables.id, reservations.tableId))
    .where(and(eq(reservations.id, id), limitarPorRol(sesion)))
    .limit(1);

  return fila ?? null;
}

/** Sucursales visibles para la sesión, para poblar los filtros. */
export async function sucursalesVisibles(sesion: Sesion) {
  const db = getDb();
  const alcance = alcanceSucursal(sesion);
  return db
    .select({ id: branches.id, nombre: branches.nombre, slug: branches.slug })
    .from(branches)
    .where(alcance ? eq(branches.id, alcance) : eq(branches.activa, true))
    .orderBy(asc(branches.nombre));
}

/* ------------------------------------------------------------ pipeline -- */

export type TarjetaEvento = {
  eventId: string;
  reservationId: string;
  codigoPublico: string;
  cliente: string;
  telefono: string;
  fechaLocal: string;
  fechaFlexible: boolean;
  numPersonas: number;
  ocasion: string;
  estadoPipeline: string;
  probabilidadPct: number;
  totalEstimado: number;
  totalConfirmado: number | null;
  deposito: number | null;
  depositoPagadoAt: Date | null;
  sucursal: string;
  paquete: string | null;
  asignadoA: string | null;
  /** Días que faltan para el evento. Negativo si ya pasó. */
  diasRestantes: number;
};

export async function pipelineEventos(sesion: Sesion, branchId?: string): Promise<TarjetaEvento[]> {
  const db = getDb();

  const filas = await db
    .select({
      eventId: events.id,
      reservationId: reservations.id,
      codigoPublico: reservations.codigoPublico,
      cliente: customers.nombre,
      telefono: customers.telefonoE164,
      fechaLocal: reservations.fechaLocal,
      fechaFlexible: events.fechaFlexible,
      numPersonas: events.numPersonas,
      ocasion: events.ocasion,
      estadoPipeline: events.estadoPipeline,
      probabilidadPct: events.probabilidadPct,
      totalEstimado: events.totalEstimadoCentimos,
      totalConfirmado: events.totalConfirmadoCentimos,
      deposito: events.depositoCentimos,
      depositoPagadoAt: events.depositoPagadoAt,
      sucursal: branches.nombre,
      paquete: packages.nombre,
      asignadoA: staff.nombre,
      diasRestantes: sql<number>`(${reservations.fechaLocal}::date - CURRENT_DATE)`,
    })
    .from(events)
    .innerJoin(reservations, eq(reservations.id, events.reservationId))
    .innerJoin(customers, eq(customers.id, reservations.customerId))
    .innerJoin(branches, eq(branches.id, reservations.branchId))
    .leftJoin(packages, eq(packages.id, events.packageId))
    .leftJoin(staff, eq(staff.id, events.asignadoA))
    .where(and(limitarPorRol(sesion, branchId)))
    .orderBy(asc(reservations.fechaLocal));

  return filas.map((f) => ({
    ...f,
    totalEstimado: Number(f.totalEstimado),
    totalConfirmado: f.totalConfirmado === null ? null : Number(f.totalConfirmado),
    deposito: f.deposito === null ? null : Number(f.deposito),
    diasRestantes: Number(f.diasRestantes),
  })) as TarjetaEvento[];
}

export async function eventoPorId(sesion: Sesion, eventId: string) {
  const db = getDb();
  const [evento] = await db
    .select({
      id: events.id,
      reservationId: events.reservationId,
      codigoPublico: reservations.codigoPublico,
      ocasion: events.ocasion,
      fechaLocal: reservations.fechaLocal,
      fechaFlexible: events.fechaFlexible,
      franja: reservations.franja,
      numPersonas: events.numPersonas,
      subtotal: events.subtotalCentimos,
      ivaPct: events.ivaPct,
      servicioPct: events.servicioPct,
      totalEstimado: events.totalEstimadoCentimos,
      totalConfirmado: events.totalConfirmadoCentimos,
      deposito: events.depositoCentimos,
      depositoPagadoAt: events.depositoPagadoAt,
      estadoPipeline: events.estadoPipeline,
      probabilidadPct: events.probabilidadPct,
      motivoPerdida: events.motivoPerdida,
      preferenciaContacto: events.preferenciaContacto,
      cliente: customers.nombre,
      telefono: customers.telefonoE164,
      email: customers.email,
      sucursal: branches.nombre,
      paquete: packages.nombre,
    })
    .from(events)
    .innerJoin(reservations, eq(reservations.id, events.reservationId))
    .innerJoin(customers, eq(customers.id, reservations.customerId))
    .innerJoin(branches, eq(branches.id, reservations.branchId))
    .leftJoin(packages, eq(packages.id, events.packageId))
    .where(and(eq(events.id, eventId), limitarPorRol(sesion)))
    .limit(1);

  if (!evento) return null;

  const items = await db
    .select({
      id: eventItems.id,
      nombre: eventItems.nombreSnapshot,
      cantidad: eventItems.cantidad,
      precioUnitario: eventItems.precioUnitarioCentimos,
    })
    .from(eventItems)
    .where(eq(eventItems.eventId, eventId));

  return {
    ...evento,
    subtotal: Number(evento.subtotal),
    totalEstimado: Number(evento.totalEstimado),
    totalConfirmado: evento.totalConfirmado === null ? null : Number(evento.totalConfirmado),
    deposito: evento.deposito === null ? null : Number(evento.deposito),
    items: items.map((i) => ({ ...i, precioUnitario: Number(i.precioUnitario) })),
  };
}

/* ------------------------------------------------------------- clientes -- */

export async function listarClientes(sesion: Sesion, busqueda?: string) {
  const db = getDb();
  const alcance = alcanceSucursal(sesion);

  // Las estadísticas se calculan, no se guardan denormalizadas: como columnas
  // se desincronizan en cuanto se edita una cancelación a mano.
  const filas = await db
    .select({
      id: customers.id,
      nombre: customers.nombre,
      telefono: customers.telefonoE164,
      email: customers.email,
      createdAt: customers.createdAt,
      consentMarketing: customers.consentMarketing,
      unsubscribedAt: customers.unsubscribedAt,
      totalReservas: count(reservations.id),
      noShows: sql<number>`count(*) filter (where ${reservations.estado} = 'no_show')`,
      completadas: sql<number>`count(*) filter (where ${reservations.estado} = 'completada')`,
      ultimaVisita: sql<Date | null>`max(${reservations.startsAt})`,
      ticketPromedio: sql<number>`coalesce(avg(${reservations.ticketEstimadoCentimos}), 0)`,
    })
    .from(customers)
    .leftJoin(
      reservations,
      alcance
        ? and(eq(reservations.customerId, customers.id), eq(reservations.branchId, alcance))
        : eq(reservations.customerId, customers.id),
    )
    .where(
      busqueda
        ? sql`${customers.nombre} ilike ${"%" + busqueda + "%"} or ${customers.telefonoE164} ilike ${"%" + busqueda + "%"}`
        : undefined,
    )
    .groupBy(customers.id)
    .orderBy(desc(count(reservations.id)))
    .limit(200);

  return filas.map((f) => ({
    ...f,
    totalReservas: Number(f.totalReservas),
    noShows: Number(f.noShows),
    completadas: Number(f.completadas),
    ticketPromedio: Number(f.ticketPromedio),
    esRecurrente: Number(f.totalReservas) > 1,
  }));
}

export { inArray };
