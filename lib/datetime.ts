/**
 * Tiempo.
 *
 * Regla del proyecto: se guarda en UTC, se muestra en America/Costa_Rica.
 * Cada reserva lleva ademas `fechaLocal` (un `date` puro) para que los
 * reportes agrupen por dia de operacion sin convertir zona en cada query.
 */
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const TZ = "America/Costa_Rica";

/** Dia de la semana segun Postgres y JS: 0 = domingo … 6 = sabado. */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const NOMBRE_DIA: Record<DiaSemana, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

/**
 * Dias de baja afluencia (docs/CONTEXT.md §2). El dashboard los resalta y
 * son el objetivo de las promos por dia.
 */
export const DIAS_DEBILES: DiaSemana[] = [1, 2, 3, 4];

export function esDiaDebil(dia: DiaSemana): boolean {
  return DIAS_DEBILES.includes(dia);
}

/** Fin de semana, donde aplica el tope del 30% (docs/CONTEXT.md §3). */
export function esFinDeSemana(dia: DiaSemana): boolean {
  return dia === 0 || dia === 6;
}

/**
 * Combina una fecha local (`YYYY-MM-DD`) y una hora local (`HH:mm`) en el
 * instante UTC correspondiente.
 */
export function aUTC(fechaLocal: string, horaLocal: string): Date {
  return fromZonedTime(`${fechaLocal}T${horaLocal}:00`, TZ);
}

/** `YYYY-MM-DD` en hora de Costa Rica para un instante dado. */
export function fechaLocalDe(instante: Date): string {
  return formatInTimeZone(instante, TZ, "yyyy-MM-dd");
}

/** Minuto del dia (0-1439) en hora de Costa Rica. */
export function minutoLocalDe(instante: Date): number {
  const zonificado = toZonedTime(instante, TZ);
  return zonificado.getHours() * 60 + zonificado.getMinutes();
}

export function diaSemanaDe(instante: Date): DiaSemana {
  return toZonedTime(instante, TZ).getDay() as DiaSemana;
}

/** Formatea un instante en hora de Costa Rica. */
export function formatCR(instante: Date, patron = "d 'de' MMMM, HH:mm"): string {
  return formatInTimeZone(instante, TZ, patron);
}

export function ahora(): Date {
  return new Date();
}
