/**
 * Cotizador de eventos.
 *
 * Funciones puras. El precio final lo confirma el administrador desde el CRM;
 * esto produce un ESTIMADO, y el flujo publico lo dice explicitamente.
 *
 * Todo en centimos enteros: una cotizacion que descuadra por redondeo es un
 * problema comercial, no un detalle.
 */
import { aplicarPct, colonesACentimos, desglosar, IVA_PCT, SERVICIO_PCT } from "@/lib/money";
import { MENU, ordenarParaCotizador, type ItemMenu } from "@/data/menu";
import { PAQUETES, EXTRAS, type Paquete } from "@/data/paquetes";
import { POLITICA_EVENTO } from "@/data/politicas";

export type LineaCotizacion = {
  slug: string;
  nombre: string;
  cantidad: number;
  /** Precio unitario congelado al cotizar. */
  precioUnitarioCentimos: number;
  subtotalCentimos: number;
};

export type Cotizacion = {
  numPersonas: number;
  paqueteSlug: string | null;
  lineas: LineaCotizacion[];
  subtotalCentimos: number;
  ivaPct: number;
  servicioPct: number;
  ivaCentimos: number;
  servicioCentimos: number;
  totalCentimos: number;
  /** Lo que hay que pagar para confirmar (50%). */
  depositoCentimos: number;
  /** Total dividido entre los asistentes, para comparar contra el presupuesto. */
  porPersonaCentimos: number;
};

/** Rangos de presupuesto, derivados de los precios reales de los paquetes. */
export type RangoPresupuesto = {
  slug: string;
  nombre: string;
  descripcion: string;
  /** null en "a la medida": no tiene precio fijo. */
  precioPpCentimos: number | null;
  incluye: string[];
};

export function rangosPresupuesto(): RangoPresupuesto[] {
  return PAQUETES.map((p) => ({
    slug: p.slug,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precioPpCentimos: p.slug === "a-la-medida" ? null : colonesACentimos(p.precioPpColones),
    incluye: p.incluye,
  }));
}

export function paquetePorSlug(slug: string): Paquete | undefined {
  return PAQUETES.find((p) => p.slug === slug);
}

/**
 * Cotiza un paquete cerrado: precio por persona x asistentes.
 */
export function cotizarPaquete(
  paqueteSlug: string,
  numPersonas: number,
  ivaPct = IVA_PCT,
  servicioPct = SERVICIO_PCT,
): Cotizacion | null {
  const paquete = paquetePorSlug(paqueteSlug);
  if (!paquete || paquete.slug === "a-la-medida") return null;

  const precioPp = colonesACentimos(paquete.precioPpColones);
  const subtotal = precioPp * numPersonas;

  return armar({
    numPersonas,
    paqueteSlug,
    lineas: [
      {
        slug: paquete.slug,
        nombre: `Paquete ${paquete.nombre}`,
        cantidad: numPersonas,
        precioUnitarioCentimos: precioPp,
        subtotalCentimos: subtotal,
      },
    ],
    ivaPct,
    servicioPct,
  });
}

export type SeleccionItem = { slug: string; cantidad: number };

/**
 * Cotiza una seleccion libre del menu ("a la medida").
 *
 * Los precios se toman del menu al momento de cotizar y quedan congelados en
 * las lineas: si manana cambia la carta, la cotizacion enviada sigue
 * cuadrando.
 */
export function cotizarAMedida(
  seleccion: SeleccionItem[],
  numPersonas: number,
  ivaPct = IVA_PCT,
  servicioPct = SERVICIO_PCT,
): Cotizacion {
  const lineas: LineaCotizacion[] = [];

  for (const sel of seleccion) {
    if (sel.cantidad <= 0) continue;

    const item = MENU.find((i) => i.slug === sel.slug);
    const extra = EXTRAS.find((e) => e.slug === sel.slug);

    if (item) {
      const precio = colonesACentimos(item.precioColones);
      lineas.push({
        slug: item.slug,
        nombre: item.nombre,
        cantidad: sel.cantidad,
        precioUnitarioCentimos: precio,
        subtotalCentimos: precio * sel.cantidad,
      });
    } else if (extra?.precioColones != null) {
      // Los extras sin precio definido (decoración, área privada) se cotizan
      // aparte: no se inventa un monto.
      const precio = colonesACentimos(extra.precioColones);
      lineas.push({
        slug: extra.slug,
        nombre: extra.nombre,
        cantidad: sel.cantidad,
        precioUnitarioCentimos: precio,
        subtotalCentimos: precio * sel.cantidad,
      });
    }
  }

  return armar({ numPersonas, paqueteSlug: "a-la-medida", lineas, ivaPct, servicioPct });
}

function armar(d: {
  numPersonas: number;
  paqueteSlug: string | null;
  lineas: LineaCotizacion[];
  ivaPct: number;
  servicioPct: number;
}): Cotizacion {
  const subtotal = d.lineas.reduce((s, l) => s + l.subtotalCentimos, 0);
  const { iva, servicio, total } = desglosar(subtotal, d.ivaPct, d.servicioPct);

  return {
    numPersonas: d.numPersonas,
    paqueteSlug: d.paqueteSlug,
    lineas: d.lineas,
    subtotalCentimos: subtotal,
    ivaPct: d.ivaPct,
    servicioPct: d.servicioPct,
    ivaCentimos: iva,
    servicioCentimos: servicio,
    totalCentimos: total,
    depositoCentimos: aplicarPct(total, POLITICA_EVENTO.depositoPct),
    porPersonaCentimos: d.numPersonas > 0 ? Math.round(total / d.numPersonas) : 0,
  };
}

/**
 * Items sugeridos para armar un paquete a medida.
 *
 * Orden: Estrella primero, luego Puzzle ("recomendacion del chef"), y dentro
 * de cada grupo mejor margen primero. Los Perro quedan fuera salvo el menu
 * infantil (docs/CONTEXT.md §5).
 *
 * El calculo vive en el servidor y devuelve items sin `foodCostPct`: ese dato
 * ordena las sugerencias pero nunca viaja al cliente.
 */
export function sugerenciasParaEvento(categoria?: string): ItemMenu[] {
  const aptos = MENU.filter(
    (i) => i.aptoEvento && (!categoria || i.categoria === categoria),
  );
  return ordenarParaCotizador(aptos);
}

/** Extras con precio confirmado; los que faltan se cotizan aparte. */
export function extrasCotizables() {
  return EXTRAS.filter((e) => e.precioColones !== null);
}

export function extrasSinPrecio() {
  return EXTRAS.filter((e) => e.precioColones === null);
}
