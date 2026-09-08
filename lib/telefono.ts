/**
 * Telefonos de Costa Rica.
 *
 * Se normaliza a E.164 (+506XXXXXXXX) porque es la clave natural del cliente:
 * el mismo numero escrito "8888-8888", "88888888" o "+506 8888 8888" tiene
 * que resolver al mismo registro, o el historial del CRM se parte en tres.
 */
const CODIGO_PAIS = "506";

/** Deja solo digitos y quita el codigo de pais si vino incluido. */
export function normalizarTelefonoCR(entrada: string): string | null {
  const digitos = entrada.replace(/\D/g, "");
  const sinPais = digitos.startsWith(CODIGO_PAIS) && digitos.length === 11
    ? digitos.slice(CODIGO_PAIS.length)
    : digitos;

  // Costa Rica usa 8 digitos. Los moviles empiezan en 6, 7 u 8; los fijos en 2.
  if (!/^[2678]\d{7}$/.test(sinPais)) return null;
  return `+${CODIGO_PAIS}${sinPais}`;
}

export function esTelefonoCRValido(entrada: string): boolean {
  return normalizarTelefonoCR(entrada) !== null;
}

/** Formato de lectura: `8888-8888`. */
export function formatearTelefono(e164: string): string {
  const d = e164.replace(/\D/g, "").slice(-8);
  return `${d.slice(0, 4)}-${d.slice(4)}`;
}
