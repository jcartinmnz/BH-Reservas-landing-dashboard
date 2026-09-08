/**
 * Paleta de graficos.
 *
 * NO son los colores de marca directos: #FFF042 sobre blanco da 1,2:1 y es
 * invisible como marca de dato, y #38B6AB queda por debajo del piso de croma
 * (lee como gris). Esta paleta se derivo del teal de marca y se valido con el
 * script de las seis verificaciones: banda de luminosidad, piso de croma,
 * separacion en daltonismo, piso de vision normal y contraste contra la
 * superficie. Las cinco pasan.
 *
 * El orden es FIJO. Un filtro que reduce las series no puede repintar las que
 * quedan: el color sigue a la entidad, no a su posicion.
 */
export const CATEGORICA = [
  "#0D9488", // teal — ancla de marca
  "#C2410C", // naranja quemado
  "#4F46E5", // indigo
  "#BE185D", // rosa profundo
  "#8A6D0B", // oro oscuro — eco del amarillo de marca, legible
] as const;

/** Color estable por posición, para que no cambie al filtrar. */
export function colorDe(indice: number): string {
  return CATEGORICA[indice % CATEGORICA.length];
}

/** Resalte: lo que hay que mirar va en tinta, el resto en gris. */
export const RESALTE = "#0A0A0A";
export const APAGADO = "#B8B8B8";
export const EJE = "#6B6B6B";
export const GRILLA = "#E2E2E2";
