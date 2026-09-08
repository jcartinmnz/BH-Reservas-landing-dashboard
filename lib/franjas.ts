/**
 * Franjas horarias — el modelo operativo de Bread House.
 *
 * Las cuatro franjas son entidad de primera clase: gobiernan la
 * disponibilidad y son la dimension de analisis central del CRM
 * (docs/CONTEXT.md §2).
 */

export const FRANJAS = ["cafe_brunch", "fast_lunch", "tardeada_social", "social_pesada"] as const;

export type Franja = (typeof FRANJAS)[number];

export type DefinicionFranja = {
  codigo: Franja;
  nombre: string;
  /** Minuto del dia en que abre, contado desde medianoche local. */
  inicioMin: number;
  /** Minuto del dia en que cierra (exclusivo). */
  finMin: number;
  orden: number;
  /**
   * Franja marcada como objetivo de recuperacion. El dashboard la resalta
   * y las promos la usan como filtro (docs/CONTEXT.md §2).
   */
  enRecuperacion: boolean;
};

const hm = (h: number, m = 0) => h * 60 + m;

export const DEFINICION_FRANJAS: Record<Franja, DefinicionFranja> = {
  cafe_brunch: {
    codigo: "cafe_brunch",
    nombre: "Café & Brunch",
    inicioMin: hm(7),
    finMin: hm(12),
    orden: 1,
    enRecuperacion: false,
  },
  fast_lunch: {
    codigo: "fast_lunch",
    nombre: "Fast Lunch Premium",
    inicioMin: hm(12),
    finMin: hm(15),
    orden: 2,
    enRecuperacion: false,
  },
  tardeada_social: {
    codigo: "tardeada_social",
    nombre: "Tardeada Social",
    inicioMin: hm(15),
    finMin: hm(18),
    orden: 3,
    // La franja perdida: 3-6pm es el objetivo declarado de recuperacion.
    enRecuperacion: true,
  },
  social_pesada: {
    codigo: "social_pesada",
    nombre: "Social Pesada",
    inicioMin: hm(18),
    finMin: hm(20),
    orden: 4,
    enRecuperacion: false,
  },
};

export const FRANJAS_ORDENADAS: DefinicionFranja[] = FRANJAS.map(
  (f) => DEFINICION_FRANJAS[f],
).sort((a, b) => a.orden - b.orden);

/**
 * Devuelve la franja que contiene un minuto del dia, o `null` si cae fuera
 * de las cuatro.
 *
 * `null` es un caso real, no un error: las franjas cubren 07:00-20:00 pero
 * Escazu, Pinares y Cartago cierran a las 21:00 de viernes a domingo. Esa
 * ventana de 20:00-21:00 no tiene franja asignada (vacio D en
 * docs/CONTEXT.md §10) y el motor no puede inventarle una.
 */
export function franjaDeMinuto(minutoDelDia: number): Franja | null {
  const def = FRANJAS_ORDENADAS.find(
    (f) => minutoDelDia >= f.inicioMin && minutoDelDia < f.finMin,
  );
  return def?.codigo ?? null;
}

/** `"15:30"` -> `930`. */
export function horaAMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** `930` -> `"15:30"`. */
export function minutosAHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function nombreFranja(franja: Franja): string {
  return DEFINICION_FRANJAS[franja].nombre;
}
