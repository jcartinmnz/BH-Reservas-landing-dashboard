import "server-only";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { branches, customers, events, reservations } from "@/lib/db/schema";
import type { Sesion } from "@/lib/auth/sesion";
import { alcanceSucursal } from "@/lib/auth/sesion";

/**
 * Metricas del CRM.
 *
 * Los KPIs se calculan en SQL, no en TypeScript: traer todas las reservas del
 * periodo para contarlas en memoria no escala y ademas obliga a paginar.
 *
 * Todo se mide contra el periodo anterior de la misma duracion, que es lo que
 * convierte un numero en una senal.
 */
export type Rango = { desde: string; hasta: string };

/** Periodo inmediatamente anterior, de la misma duración. */
export function rangoAnterior(r: Rango): Rango {
  const desde = new Date(`${r.desde}T00:00:00Z`);
  const hasta = new Date(`${r.hasta}T00:00:00Z`);
  const dias = Math.max(1, Math.round((hasta.getTime() - desde.getTime()) / 86_400_000) + 1);
  const finAnterior = new Date(desde.getTime() - 86_400_000);
  const inicioAnterior = new Date(finAnterior.getTime() - (dias - 1) * 86_400_000);
  return {
    desde: inicioAnterior.toISOString().slice(0, 10),
    hasta: finAnterior.toISOString().slice(0, 10),
  };
}

function filtroBase(sesion: Sesion, r: Rango, branchId?: string) {
  const alcance = alcanceSucursal(sesion);
  return and(
    gte(reservations.fechaLocal, r.desde),
    lte(reservations.fechaLocal, r.hasta),
    alcance ? eq(reservations.branchId, alcance) : branchId ? eq(reservations.branchId, branchId) : undefined,
  );
}

export type ResumenReservas = {
  total: number;
  confirmadas: number;
  canceladas: number;
  noShows: number;
  completadas: number;
  comensales: number;
  promedioPorReserva: number;
  tasaCancelacion: number;
  tasaNoShow: number;
  /** Días promedio entre que se hizo la reserva y la fecha del servicio. */
  leadTimeDias: number;
};

export async function resumenReservas(
  sesion: Sesion, r: Rango, branchId?: string,
): Promise<ResumenReservas> {
  const db = getDb();
  const [f] = await db
    .select({
      total: sql<number>`count(*)`,
      confirmadas: sql<number>`count(*) filter (where ${reservations.estado} in ('confirmada','sentada','completada'))`,
      canceladas: sql<number>`count(*) filter (where ${reservations.estado} = 'cancelada')`,
      noShows: sql<number>`count(*) filter (where ${reservations.estado} = 'no_show')`,
      completadas: sql<number>`count(*) filter (where ${reservations.estado} = 'completada')`,
      comensales: sql<number>`coalesce(sum(${reservations.numPersonas}) filter (where ${reservations.estado} not in ('cancelada','no_show')), 0)`,
      leadTime: sql<number>`coalesce(avg(extract(epoch from (${reservations.startsAt} - ${reservations.createdAt})) / 86400), 0)`,
    })
    .from(reservations)
    .where(filtroBase(sesion, r, branchId));

  const total = Number(f.total);
  const comensales = Number(f.comensales);
  const vivas = total - Number(f.canceladas) - Number(f.noShows);

  return {
    total,
    confirmadas: Number(f.confirmadas),
    canceladas: Number(f.canceladas),
    noShows: Number(f.noShows),
    completadas: Number(f.completadas),
    comensales,
    promedioPorReserva: vivas > 0 ? Number((comensales / vivas).toFixed(1)) : 0,
    tasaCancelacion: total > 0 ? Number(((Number(f.canceladas) / total) * 100).toFixed(1)) : 0,
    tasaNoShow: total > 0 ? Number(((Number(f.noShows) / total) * 100).toFixed(1)) : 0,
    leadTimeDias: Number(Number(f.leadTime).toFixed(1)),
  };
}

export type PorDimension = { clave: string; reservas: number; comensales: number };

async function agrupar(
  sesion: Sesion, r: Rango, columna: ReturnType<typeof sql>, branchId?: string,
): Promise<PorDimension[]> {
  const db = getDb();
  const filas = await db
    .select({
      clave: sql<string>`${columna}::text`,
      reservas: sql<number>`count(*)`,
      comensales: sql<number>`coalesce(sum(${reservations.numPersonas}), 0)`,
    })
    .from(reservations)
    .where(
      and(
        filtroBase(sesion, r, branchId),
        sql`${reservations.estado} not in ('cancelada','no_show')`,
      ),
    )
    .groupBy(sql`${columna}`);

  return filas.map((f) => ({
    clave: f.clave,
    reservas: Number(f.reservas),
    comensales: Number(f.comensales),
  }));
}

export const porFranja = (s: Sesion, r: Rango, b?: string) =>
  agrupar(s, r, sql`${reservations.franja}`, b);

/** 0 = domingo … 6 = sábado, igual que en el resto del sistema. */
export const porDiaSemana = (s: Sesion, r: Rango, b?: string) =>
  agrupar(s, r, sql`extract(dow from ${reservations.fechaLocal}::date)`, b);

export const porCanal = (s: Sesion, r: Rango, b?: string) =>
  agrupar(s, r, sql`${reservations.source}`, b);

export async function porSucursal(sesion: Sesion, r: Rango): Promise<PorDimension[]> {
  const db = getDb();
  const filas = await db
    .select({
      clave: branches.nombre,
      reservas: sql<number>`count(*)`,
      comensales: sql<number>`coalesce(sum(${reservations.numPersonas}), 0)`,
    })
    .from(reservations)
    .innerJoin(branches, eq(branches.id, reservations.branchId))
    .where(
      and(filtroBase(sesion, r), sql`${reservations.estado} not in ('cancelada','no_show')`),
    )
    .groupBy(branches.nombre);

  return filas.map((f) => ({
    clave: f.clave,
    reservas: Number(f.reservas),
    comensales: Number(f.comensales),
  }));
}

/**
 * Ocupacion por franja: comensales reservados sobre la capacidad de la
 * sucursal, promediada por dia con servicio.
 */
export type Ocupacion = { sucursal: string; franja: string; ocupacionPct: number; comensales: number };

export async function ocupacionPorFranja(sesion: Sesion, r: Rango): Promise<Ocupacion[]> {
  const db = getDb();
  const filas = await db
    .select({
      sucursal: branches.nombre,
      franja: sql<string>`${reservations.franja}::text`,
      comensales: sql<number>`coalesce(sum(${reservations.numPersonas}), 0)`,
      dias: sql<number>`count(distinct ${reservations.fechaLocal})`,
      capacidad: branches.capacidadTotal,
    })
    .from(reservations)
    .innerJoin(branches, eq(branches.id, reservations.branchId))
    .where(
      and(filtroBase(sesion, r), sql`${reservations.estado} not in ('cancelada','no_show')`),
    )
    .groupBy(branches.nombre, reservations.franja, branches.capacidadTotal);

  return filas.map((f) => {
    const dias = Math.max(1, Number(f.dias));
    const promedioDiario = Number(f.comensales) / dias;
    return {
      sucursal: f.sucursal,
      franja: f.franja,
      comensales: Number(f.comensales),
      ocupacionPct: Number(((promedioDiario / Number(f.capacidad)) * 100).toFixed(1)),
    };
  });
}

/* -------------------------------------------------------------- eventos -- */

export type MetricasEventos = {
  porEtapa: { etapa: string; cantidad: number; valor: number }[];
  porOcasion: { ocasion: string; cantidad: number; valor: number }[];
  tasaConversion: number;
  valorPipeline: number;
  valorConfirmado: number;
  ticketPromedio: number;
  ticketPorPersona: number;
  diasCierrePromedio: number;
};

export async function metricasEventos(
  sesion: Sesion, r: Rango, branchId?: string,
): Promise<MetricasEventos> {
  const db = getDb();
  const filtro = and(
    filtroBase(sesion, r, branchId),
    eq(reservations.tipo, "evento"),
  );

  const [porEtapa, porOcasion, [agregados]] = await Promise.all([
    db
      .select({
        etapa: sql<string>`${events.estadoPipeline}::text`,
        cantidad: sql<number>`count(*)`,
        valor: sql<number>`coalesce(sum(coalesce(${events.totalConfirmadoCentimos}, ${events.totalEstimadoCentimos})), 0)`,
      })
      .from(events)
      .innerJoin(reservations, eq(reservations.id, events.reservationId))
      .where(filtro)
      .groupBy(events.estadoPipeline),
    db
      .select({
        ocasion: sql<string>`${events.ocasion}::text`,
        cantidad: sql<number>`count(*)`,
        valor: sql<number>`coalesce(sum(coalesce(${events.totalConfirmadoCentimos}, ${events.totalEstimadoCentimos})), 0)`,
      })
      .from(events)
      .innerJoin(reservations, eq(reservations.id, events.reservationId))
      .where(filtro)
      .groupBy(events.ocasion),
    db
      .select({
        total: sql<number>`count(*)`,
        confirmados: sql<number>`count(*) filter (where ${events.estadoPipeline} in ('confirmado','realizado'))`,
        valorPipeline: sql<number>`coalesce(sum(coalesce(${events.totalConfirmadoCentimos}, ${events.totalEstimadoCentimos}) * ${events.probabilidadPct} / 100) filter (where ${events.estadoPipeline} not in ('perdido','realizado')), 0)`,
        valorConfirmado: sql<number>`coalesce(sum(coalesce(${events.totalConfirmadoCentimos}, ${events.totalEstimadoCentimos})) filter (where ${events.estadoPipeline} in ('confirmado','realizado')), 0)`,
        ticket: sql<number>`coalesce(avg(coalesce(${events.totalConfirmadoCentimos}, ${events.totalEstimadoCentimos})), 0)`,
        personas: sql<number>`coalesce(sum(${events.numPersonas}), 0)`,
        valorTotal: sql<number>`coalesce(sum(coalesce(${events.totalConfirmadoCentimos}, ${events.totalEstimadoCentimos})), 0)`,
        diasCierre: sql<number>`coalesce(avg(extract(epoch from (${events.fechaConfirmacion} - ${events.createdAt})) / 86400) filter (where ${events.fechaConfirmacion} is not null), 0)`,
      })
      .from(events)
      .innerJoin(reservations, eq(reservations.id, events.reservationId))
      .where(filtro),
  ]);

  const total = Number(agregados.total);
  const personas = Number(agregados.personas);

  return {
    porEtapa: porEtapa.map((f) => ({
      etapa: f.etapa, cantidad: Number(f.cantidad), valor: Number(f.valor),
    })),
    porOcasion: porOcasion.map((f) => ({
      ocasion: f.ocasion, cantidad: Number(f.cantidad), valor: Number(f.valor),
    })),
    tasaConversion: total > 0
      ? Number(((Number(agregados.confirmados) / total) * 100).toFixed(1))
      : 0,
    valorPipeline: Math.round(Number(agregados.valorPipeline)),
    valorConfirmado: Number(agregados.valorConfirmado),
    ticketPromedio: Math.round(Number(agregados.ticket)),
    ticketPorPersona: personas > 0 ? Math.round(Number(agregados.valorTotal) / personas) : 0,
    diasCierrePromedio: Number(Number(agregados.diasCierre).toFixed(1)),
  };
}

/* ------------------------------------------------------------- clientes -- */

export type MetricasClientes = {
  nuevos: number;
  recurrentes: number;
  frecuenciaRecurrentes: number;
  topPorReservas: { nombre: string; reservas: number }[];
  topPorValor: { nombre: string; valor: number }[];
};

export async function metricasClientes(
  sesion: Sesion, r: Rango, branchId?: string,
): Promise<MetricasClientes> {
  const db = getDb();
  const filtro = filtroBase(sesion, r, branchId);

  // "Nuevo" = su primera reserva cae dentro del período. Se compara contra el
  // historial completo, no solo contra el rango: alguien que vino el año
  // pasado no es cliente nuevo.
  const [conteos] = await db
    .select({
      nuevos: sql<number>`count(*) filter (where c.primera >= ${r.desde}::date)`,
      recurrentes: sql<number>`count(*) filter (where c.primera < ${r.desde}::date)`,
      frecuencia: sql<number>`coalesce(avg(c.reservas) filter (where c.primera < ${r.desde}::date), 0)`,
    })
    .from(
      sql`(
        select ${reservations.customerId} as id,
               min(${reservations.fechaLocal}) as primera,
               count(*) as reservas
        from ${reservations}
        group by ${reservations.customerId}
      ) as c`,
    )
    .where(
      sql`c.id in (select ${reservations.customerId} from ${reservations} where ${filtro})`,
    );

  const [topReservas, topValor] = await Promise.all([
    db
      .select({ nombre: customers.nombre, reservas: sql<number>`count(*)` })
      .from(reservations)
      .innerJoin(customers, eq(customers.id, reservations.customerId))
      .where(filtro)
      .groupBy(customers.id, customers.nombre)
      .orderBy(sql`count(*) desc`)
      .limit(20),
    db
      .select({
        nombre: customers.nombre,
        valor: sql<number>`coalesce(sum(${reservations.ticketEstimadoCentimos}), 0)`,
      })
      .from(reservations)
      .innerJoin(customers, eq(customers.id, reservations.customerId))
      .where(filtro)
      .groupBy(customers.id, customers.nombre)
      .orderBy(sql`coalesce(sum(${reservations.ticketEstimadoCentimos}), 0) desc`)
      .limit(20),
  ]);

  return {
    nuevos: Number(conteos?.nuevos ?? 0),
    recurrentes: Number(conteos?.recurrentes ?? 0),
    frecuenciaRecurrentes: Number(Number(conteos?.frecuencia ?? 0).toFixed(1)),
    topPorReservas: topReservas.map((f) => ({ nombre: f.nombre, reservas: Number(f.reservas) })),
    topPorValor: topValor
      .map((f) => ({ nombre: f.nombre, valor: Number(f.valor) }))
      .filter((f) => f.valor > 0),
  };
}

/** Variación porcentual contra el período anterior. */
export function delta(actual: number, anterior: number): number | null {
  if (anterior === 0) return actual === 0 ? 0 : null;
  return Number((((actual - anterior) / anterior) * 100).toFixed(1));
}
