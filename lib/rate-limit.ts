/**
 * Rate limiting en memoria para los endpoints publicos.
 *
 * LIMITACION CONOCIDA: el estado vive en la instancia. En Vercel, con varias
 * instancias serverless, cada una lleva su propio contador, asi que el limite
 * efectivo se multiplica por la cantidad de instancias. Alcanza para frenar un
 * script casero, no para un ataque distribuido. Cuando haga falta de verdad,
 * el reemplazo natural es un contador en Postgres o en un KV.
 */
type Registro = { conteo: number; reinicioEn: number };

const memoria = new Map<string, Registro>();

/** Limpia lo vencido para que el mapa no crezca sin techo. */
function purgar(ahora: number) {
  if (memoria.size < 1000) return;
  for (const [clave, reg] of memoria) {
    if (reg.reinicioEn <= ahora) memoria.delete(clave);
  }
}

/** `true` si la operación entra dentro del límite. */
export function verificarLimite(clave: string, maximo: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  purgar(ahora);

  const reg = memoria.get(clave);
  if (!reg || reg.reinicioEn <= ahora) {
    memoria.set(clave, { conteo: 1, reinicioEn: ahora + ventanaMs });
    return true;
  }
  if (reg.conteo >= maximo) return false;
  reg.conteo += 1;
  return true;
}
