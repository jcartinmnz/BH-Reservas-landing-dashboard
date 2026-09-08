/**
 * Constantes de estado del CRM.
 *
 * Viven fuera de los archivos "use server" porque Next solo permite exportar
 * funciones async desde ahi: exportar un objeto compila igual pero revienta en
 * runtime al invocar cualquier action del archivo.
 */

/**
 * Transiciones validas del estado de una reserva.
 *
 * Se declaran explicitamente en vez de permitir cualquier cambio: marcar como
 * "sentada" una reserva ya cancelada es un error de operacion, y el sistema
 * deberia impedirlo en vez de guardarlo.
 */
export const TRANSICIONES: Record<string, readonly string[]> = {
  pendiente: ["confirmada", "cancelada", "no_show"],
  confirmada: ["sentada", "cancelada", "no_show"],
  sentada: ["completada", "cancelada"],
  completada: [],
  cancelada: [],
  no_show: [],
};

export const ETAPAS = [
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
