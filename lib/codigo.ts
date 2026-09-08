import { randomBytes } from "node:crypto";

/**
 * Codigo publico de reserva: `BH-7F3K2`.
 *
 * El cliente lo cita por WhatsApp cuando escribe a Pani, asi que tiene que
 * poder dictarse por telefono. Por eso el alfabeto excluye los caracteres que
 * se confunden al leer en voz alta: I, O, 0, 1.
 */
const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generarCodigoPublico(): string {
  const bytes = randomBytes(5);
  let codigo = "";
  for (const b of bytes) codigo += ALFABETO[b % ALFABETO.length];
  return `BH-${codigo}`;
}
