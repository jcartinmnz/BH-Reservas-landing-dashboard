import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Tokens firmados para cancelar o reprogramar sin login.
 *
 * El correo de confirmacion lleva un link con el token; la base guarda solo
 * su hash. Asi, si alguien lee la tabla de reservas no puede cancelar las
 * reservas de otros.
 */
function secreto(): string {
  const s = process.env.CANCEL_TOKEN_SECRET;
  if (!s) throw new Error("Falta CANCEL_TOKEN_SECRET. Ver .env.example.");
  return s;
}

/** Token que viaja en el link del correo. */
export function firmarToken(reservationId: string): string {
  return createHmac("sha256", secreto()).update(reservationId).digest("base64url");
}

/** Hash que se guarda en la base. Nunca se guarda el token en claro. */
export function hashDeToken(token: string): string {
  return createHmac("sha256", secreto()).update(`hash:${token}`).digest("hex");
}

/** Compara en tiempo constante, para no filtrar el token por timing. */
export function tokenValido(token: string, hashGuardado: string): boolean {
  const calculado = Buffer.from(hashDeToken(token));
  const guardado = Buffer.from(hashGuardado);
  if (calculado.length !== guardado.length) return false;
  return timingSafeEqual(calculado, guardado);
}
