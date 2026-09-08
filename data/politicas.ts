/**
 * Politicas de reserva — docs/POLITICAS.md y docs/CONTEXT.md §6.
 *
 * Son reglas duras del motor de disponibilidad. Viven aca y no dentro de
 * componentes: cambiar una politica no puede obligar a tocar la UI.
 */

export const POLITICA_MESA = {
  minPersonas: 1,
  /** 8 o mas pasa al flujo de eventos. */
  maxPersonas: 7,
  anticipacionMinimaHoras: 3,
  anticipacionMaximaDias: 90,
  /** Duracion por defecto segun tamano del grupo. */
  duracionMin: 90,
  duracionGrupoGrandeMin: 120,
  /** A partir de cuantas personas aplica la duracion larga. */
  umbralGrupoGrande: 5,
  toleranciaLlegadaMin: 15,
  cancelacionSinPenalidadHoras: 2,
} as const;

export const POLITICA_EVENTO = {
  minPersonas: 8,
  anticipacionMinimaHoras: 72,
  /** Porcentaje del total requerido para confirmar. */
  depositoPct: 50,
  /** No se trabaja con reembolso (docs/POLITICAS.md). */
  admiteReembolso: false,
  confirmacionMenuDiasAntes: 3,
  respuestaPrometidaHoras: 24,
} as const;

/** Duracion de mesa en minutos segun el tamano del grupo. */
export function duracionMesa(numPersonas: number): number {
  return numPersonas >= POLITICA_MESA.umbralGrupoGrande
    ? POLITICA_MESA.duracionGrupoGrandeMin
    : POLITICA_MESA.duracionMin;
}

export const OCASIONES = [
  "cumpleanos",
  "baby_shower",
  "bridal_shower",
  "almuerzo_corporativo",
  "despedida_soltero",
  "aniversario",
  "te_de_cocina",
  "reunion_especial",
  "graduacion",
  "revelacion_sexo",
  "taller_comunitario",
  "otro",
] as const;

export type Ocasion = (typeof OCASIONES)[number];

export const NOMBRE_OCASION: Record<Ocasion, string> = {
  cumpleanos: "Cumpleaños",
  baby_shower: "Baby shower",
  bridal_shower: "Bridal shower",
  almuerzo_corporativo: "Almuerzo corporativo",
  despedida_soltero: "Despedida de soltero",
  aniversario: "Aniversario",
  te_de_cocina: "Té de cocina",
  reunion_especial: "Reunión especial",
  graduacion: "Graduación",
  revelacion_sexo: "Revelación de sexo",
  taller_comunitario: "Taller o actividad comunitaria",
  otro: "Otro",
};

/** Canales por los que puede entrar una reserva (docs/CONTEXT.md §8). */
export const SOURCES = ["web", "whatsapp_pani", "instagram", "telefono", "walk_in"] as const;
export type Source = (typeof SOURCES)[number];
