/**
 * Dinero en colones costarricenses.
 *
 * Todo monto se guarda y se opera como ENTERO DE CENTIMOS. Nunca float:
 * 0.1 + 0.2 !== 0.3 y una cotizacion de evento no puede descuadrar por
 * redondeo. La conversion a decimal ocurre solo al formatear.
 */

/** Un colon = 100 centimos. */
export const CENTIMOS_POR_COLON = 100;

/** Impuesto de ventas de Costa Rica (docs/CONTEXT.md §6). */
export const IVA_PCT = 13;

/** Cargo por servicio (docs/CONTEXT.md §6). */
export const SERVICIO_PCT = 10;

/** Convierte colones enteros a centimos. `9975` -> `997500`. */
export function colonesACentimos(colones: number): number {
  return Math.round(colones * CENTIMOS_POR_COLON);
}

/**
 * Formatea centimos como colones: `997500` -> `"₡9.975"`.
 *
 * Sin decimales por defecto: los precios del menu son colones enteros y
 * `₡9.975,00` mete ruido visual en una carta.
 */
export function formatCRC(centimos: number, opts?: { decimales?: boolean }): string {
  const decimales = opts?.decimales ?? false;
  const partes = new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: decimales ? 2 : 0,
    maximumFractionDigits: decimales ? 2 : 0,
  }).formatToParts(centimos / CENTIMOS_POR_COLON);

  // El ICU de Node separa miles con espacio fino en es-CR ("₡9 975"), pero
  // la marca especifica punto ("₡12.500"). Se reconstruye desde las partes
  // en vez de hacer un replace sobre el string: el caracter que emite ICU es
  // U+202F o U+00A0 segun la version, y un replace ingenuo falla en una de
  // las dos.
  return partes
    .map((parte) => {
      if (parte.type === "group") return ".";
      if (parte.type === "decimal") return ",";
      return parte.value;
    })
    .join("")
    .replace(/\s+/g, "");
}

/** Aplica un porcentaje entero sobre centimos, redondeando al centimo. */
export function aplicarPct(centimos: number, pct: number): number {
  return Math.round((centimos * pct) / 100);
}

export type DesglosePrecio = {
  subtotal: number;
  iva: number;
  servicio: number;
  total: number;
};

/**
 * Desglosa un subtotal en IVA y servicio.
 *
 * Los dos cargos se calculan SOBRE EL SUBTOTAL, no en cascada: el servicio
 * no paga IVA ni el IVA paga servicio. Los porcentajes se reciben como
 * parametro (no se leen de la constante) porque cada evento guarda los suyos
 * y una cotizacion vieja no debe cambiar si manana sube el IVA.
 */
export function desglosar(
  subtotalCentimos: number,
  ivaPct: number = IVA_PCT,
  servicioPct: number = SERVICIO_PCT,
): DesglosePrecio {
  const iva = aplicarPct(subtotalCentimos, ivaPct);
  const servicio = aplicarPct(subtotalCentimos, servicioPct);
  return {
    subtotal: subtotalCentimos,
    iva,
    servicio,
    total: subtotalCentimos + iva + servicio,
  };
}
