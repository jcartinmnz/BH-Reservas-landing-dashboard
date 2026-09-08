/**
 * Motor de disponibilidad — el corazon del sistema.
 *
 * Funciones puras: reciben todo el estado como parametro y no tocan la base.
 * Asi se pueden probar todas las reglas de negocio sin Postgres, que es donde
 * se concentran los bugs de un sistema de reservas.
 *
 * Reglas implementadas (docs/CONTEXT.md §3 y §6):
 *   - Nada en el pasado, con 3 horas de anticipacion minima y 90 dias de tope.
 *   - Dentro del horario de la sucursal, y la reserva debe TERMINAR antes de
 *     cerrar.
 *   - La hora debe caer en una de las 4 franjas.
 *   - Tope de comensales por franja: sin limite lun-vie, 30% de la capacidad
 *     sab-dom.
 *   - Blackouts por dia completo o por franja suelta.
 *   - Si hay mesas cargadas, se asigna la mas chica que cubra el grupo.
 */
import {
  franjaDeMinuto, minutosAHora, horaAMinutos, type Franja,
} from "@/lib/franjas";
import {
  aUTC, diaSemanaDe, minutoLocalDe, TZ, type DiaSemana,
} from "@/lib/datetime";
import { duracionMesa, POLITICA_MESA } from "@/data/politicas";
import { topeReservablePorFranja, type Sucursal, type Zona } from "@/data/sucursales";

/** Cada cuantos minutos se ofrece un horario. */
export const PASO_SLOT_MIN = 30;

export type MotivoNoDisponible =
  | "pasado"
  | "anticipacion_minima"
  | "fuera_de_ventana"
  | "fuera_de_horario"
  | "sin_franja"
  | "no_cierra_a_tiempo"
  | "sucursal_cerrada"
  | "franja_bloqueada"
  | "franja_llena"
  | "sin_mesa";

export const EXPLICACION_MOTIVO: Record<MotivoNoDisponible, string> = {
  pasado: "Ya pasó",
  anticipacion_minima: `Necesitamos ${POLITICA_MESA.anticipacionMinimaHoras} horas de anticipación`,
  fuera_de_ventana: `Solo tomamos reservas hasta ${POLITICA_MESA.anticipacionMaximaDias} días antes`,
  fuera_de_horario: "Fuera del horario de la sucursal",
  sin_franja: "No hay servicio de reservas a esta hora",
  no_cierra_a_tiempo: "No alcanza el tiempo de mesa antes del cierre",
  sucursal_cerrada: "La sucursal está cerrada ese día",
  franja_bloqueada: "Ese horario está reservado para un evento privado",
  franja_llena: "Sin campo a esta hora",
  sin_mesa: "No tenemos mesa para ese tamaño de grupo",
};

export type ReservaExistente = {
  startsAt: Date;
  endsAt: Date;
  franja: Franja;
  numPersonas: number;
  tableId: string | null;
};

export type Blackout = {
  /** null = el dia entero. */
  franja: Franja | null;
  tipo: "cierre_total" | "privatizacion" | "feriado" | "capacidad_reducida";
  capacidadOverride: number | null;
};

export type Mesa = {
  id: string;
  capacidadMin: number;
  capacidadMax: number;
  zona: Zona;
  activa: boolean;
};

export type HorarioSucursal = { abre: string; cierra: string };

export type ContextoDisponibilidad = {
  sucursal: Sucursal;
  /** `YYYY-MM-DD` en hora de Costa Rica. */
  fechaLocal: string;
  numPersonas: number;
  ahora: Date;
  /** Reservas vivas de ese dia y sucursal (pendiente, confirmada, sentada). */
  reservas: ReservaExistente[];
  blackouts: Blackout[];
  /** Puede venir vacio: ver supuesto S-1 en docs/CONTEXT.md §11. */
  mesas: Mesa[];
};

export type Slot = {
  /** `HH:mm` hora local. */
  hora: string;
  franja: Franja;
  disponible: boolean;
  motivo?: MotivoNoDisponible;
  /** Mesa asignada, cuando hay mesas cargadas. */
  mesaId?: string;
};

/** Horario de la sucursal para un dia de la semana. */
export function horarioDe(sucursal: Sucursal, dia: DiaSemana): HorarioSucursal | null {
  const h = sucursal.horarios.find((x) => x.dia === dia);
  return h ? { abre: h.abre, cierra: h.cierra } : null;
}

/** Dos ventanas [aIni,aFin) y [bIni,bFin) se solapan. */
export function seSolapan(aIni: Date, aFin: Date, bIni: Date, bFin: Date): boolean {
  return aIni < bFin && bIni < aFin;
}

/**
 * Comensales ya reservados en una franja.
 *
 * Cuenta personas, no reservas: el tope del fin de semana esta expresado en
 * comensales (30% de la capacidad de la sucursal).
 */
export function comensalesEnFranja(reservas: ReservaExistente[], franja: Franja): number {
  return reservas
    .filter((r) => r.franja === franja)
    .reduce((suma, r) => suma + r.numPersonas, 0);
}

/**
 * Elige la mesa mas chica que cubra el grupo y este libre en la ventana.
 *
 * Preferir la mas chica evita quemar una mesa de 6 con una pareja, que es la
 * forma tipica de perder capacidad un sabado.
 */
export function elegirMesa(
  mesas: Mesa[],
  reservas: ReservaExistente[],
  numPersonas: number,
  inicio: Date,
  fin: Date,
): Mesa | null {
  const candidatas = mesas
    .filter((m) => m.activa && m.capacidadMax >= numPersonas && m.capacidadMin <= numPersonas)
    .sort((a, b) => a.capacidadMax - b.capacidadMax);

  for (const mesa of candidatas) {
    const ocupada = reservas.some(
      (r) => r.tableId === mesa.id && seSolapan(inicio, fin, r.startsAt, r.endsAt),
    );
    if (!ocupada) return mesa;
  }
  return null;
}

/**
 * Tope de comensales reservables en una franja, ya considerando blackouts de
 * capacidad reducida.
 */
export function topeDeFranja(
  sucursal: Sucursal,
  dia: DiaSemana,
  franja: Franja,
  blackouts: Blackout[],
): number {
  const reduccion = blackouts.find(
    (b) =>
      b.tipo === "capacidad_reducida" &&
      (b.franja === null || b.franja === franja) &&
      b.capacidadOverride !== null,
  );
  const base = topeReservablePorFranja(sucursal, dia);
  return reduccion?.capacidadOverride != null
    ? Math.min(reduccion.capacidadOverride, base)
    : base;
}

/** Un blackout cierra por completo esta franja. */
function franjaBloqueada(blackouts: Blackout[], franja: Franja): boolean {
  return blackouts.some(
    (b) =>
      b.tipo !== "capacidad_reducida" && (b.franja === null || b.franja === franja),
  );
}

/**
 * Calcula todos los horarios del dia con su disponibilidad.
 *
 * Devuelve TODOS los slots, disponibles y no disponibles, cada uno con su
 * motivo. El brief lo pide asi: las horas sin campo se muestran
 * deshabilitadas, no ocultas — esconderlas deja al cliente sin saber si el
 * problema es la hora, el dia o el tamano del grupo.
 */
export function calcularDisponibilidad(ctx: ContextoDisponibilidad): Slot[] {
  const { sucursal, fechaLocal, numPersonas, ahora, reservas, blackouts, mesas } = ctx;

  const inicioDia = aUTC(fechaLocal, "00:00");
  const dia = diaSemanaDe(inicioDia);
  const horario = horarioDe(sucursal, dia);
  if (!horario) return [];

  const duracion = duracionMesa(numPersonas);
  const abreMin = horaAMinutos(horario.abre);
  const cierraMin = horaAMinutos(horario.cierra);

  // Ventana de reserva permitida.
  const horasMinimas =
    sucursal.anticipacionMinMesaHoras ?? POLITICA_MESA.anticipacionMinimaHoras;
  const diasMaximos = sucursal.anticipacionMaxDias ?? POLITICA_MESA.anticipacionMaximaDias;
  const minimo = new Date(ahora.getTime() + horasMinimas * 3600_000);
  const maximo = new Date(ahora.getTime() + diasMaximos * 86_400_000);

  const cerradaTodoElDia = blackouts.some(
    (b) => b.franja === null && b.tipo !== "capacidad_reducida",
  );

  const slots: Slot[] = [];

  for (let min = abreMin; min < cierraMin; min += PASO_SLOT_MIN) {
    const hora = minutosAHora(min);
    const inicio = aUTC(fechaLocal, hora);
    const fin = new Date(inicio.getTime() + duracion * 60_000);

    const franja = franjaDeMinuto(min);
    // Sin franja no hay slot que ofrecer. Es el caso real de la ventana
    // 20:00-21:00 en las sucursales que cierran a las 21:00 (vacio D).
    if (franja === null) continue;

    const push = (motivo: MotivoNoDisponible) =>
      slots.push({ hora, franja, disponible: false, motivo });

    if (cerradaTodoElDia) { push("sucursal_cerrada"); continue; }
    if (inicio <= ahora) { push("pasado"); continue; }
    if (inicio < minimo) { push("anticipacion_minima"); continue; }
    if (inicio > maximo) { push("fuera_de_ventana"); continue; }

    // La mesa tiene que caber completa antes del cierre.
    if (minutoLocalDe(fin) > cierraMin || fin.getTime() - inicio.getTime() > (cierraMin - min) * 60_000) {
      push("no_cierra_a_tiempo");
      continue;
    }

    if (franjaBloqueada(blackouts, franja)) { push("franja_bloqueada"); continue; }

    const tope = topeDeFranja(sucursal, dia, franja, blackouts);
    if (comensalesEnFranja(reservas, franja) + numPersonas > tope) {
      push("franja_llena");
      continue;
    }

    // Con mesas cargadas se asigna una concreta; sin ellas manda la capacidad
    // de franja (supuesto S-1).
    if (mesas.length > 0) {
      const mesa = elegirMesa(mesas, reservas, numPersonas, inicio, fin);
      if (!mesa) { push("sin_mesa"); continue; }
      slots.push({ hora, franja, disponible: true, mesaId: mesa.id });
      continue;
    }

    slots.push({ hora, franja, disponible: true });
  }

  return slots;
}

/** Agrupa los slots por franja, en orden, para renderizar el grid. */
export function agruparPorFranja(slots: Slot[]): { franja: Franja; slots: Slot[] }[] {
  const mapa = new Map<Franja, Slot[]>();
  for (const s of slots) {
    const lista = mapa.get(s.franja) ?? [];
    lista.push(s);
    mapa.set(s.franja, lista);
  }
  return [...mapa.entries()].map(([franja, slots]) => ({ franja, slots }));
}

/** Si el dia tiene al menos un horario tomable. */
export function hayCupo(slots: Slot[]): boolean {
  return slots.some((s) => s.disponible);
}

export { TZ };
