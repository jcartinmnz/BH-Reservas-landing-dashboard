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

/**
 * Estados en los que el CLIENTE todavia puede cancelar desde el link del
 * correo.
 *
 * Vive aca y no duplicado en la UI y en el servicio: cuando estaban separados,
 * la UI ofrecia el boton para reservas confirmadas pero el servicio solo
 * cancelaba las pendientes, asi que el boton no hacia nada. Con una sola lista
 * no pueden volver a desalinearse.
 */
export const CANCELABLES_POR_CLIENTE = ["pendiente", "confirmada"] as const;

export type EstadoCancelable = (typeof CANCELABLES_POR_CLIENTE)[number];

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
