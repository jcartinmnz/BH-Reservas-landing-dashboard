import { describe, expect, it } from "vitest";
import {
  cotizarAMedida, cotizarPaquete, extrasCotizables, extrasSinPrecio,
  paquetePorSlug, rangosPresupuesto, sugerenciasParaEvento,
} from "@/lib/eventos/cotizador";
import { colonesACentimos, formatCRC } from "@/lib/money";
import { POLITICA_EVENTO } from "@/data/politicas";

describe("paquetes cerrados", () => {
  it("multiplica precio por persona por asistentes", () => {
    const c = cotizarPaquete("intermedio", 10)!;
    // ₡18.500 x 10 = ₡185.000
    expect(c.subtotalCentimos).toBe(colonesACentimos(185000));
  });

  it("aplica IVA 13% y servicio 10% sobre el subtotal, no en cascada", () => {
    const c = cotizarPaquete("intermedio", 10)!;
    expect(c.ivaCentimos).toBe(colonesACentimos(24050));
    expect(c.servicioCentimos).toBe(colonesACentimos(18500));
    expect(c.totalCentimos).toBe(colonesACentimos(227550));
  });

  it("calcula el depósito del 50% sobre el total", () => {
    const c = cotizarPaquete("premium", 20)!;
    expect(c.depositoCentimos).toBe(Math.round(c.totalCentimos / 2));
    expect(POLITICA_EVENTO.depositoPct).toBe(50);
  });

  it("no cotiza 'a la medida' como paquete cerrado", () => {
    expect(cotizarPaquete("a-la-medida", 10)).toBeNull();
  });

  it("expone el por persona con cargos incluidos", () => {
    const c = cotizarPaquete("esencial", 8)!;
    // El por persona final supera el precio de lista porque suma IVA y servicio.
    expect(c.porPersonaCentimos).toBeGreaterThan(colonesACentimos(11500));
    expect(c.porPersonaCentimos).toBe(Math.round(c.totalCentimos / 8));
  });
});

describe("cotización a la medida", () => {
  it("suma líneas del menú con precios reales", () => {
    // Salmón ₡13.950 x 8 + Mimosa ₡2.850 x 8
    const c = cotizarAMedida(
      [{ slug: "salmon", cantidad: 8 }, { slug: "mimosa-estilo-bread-house", cantidad: 8 }],
      8,
    );
    expect(c.subtotalCentimos).toBe(colonesACentimos(13950 * 8 + 2850 * 8));
    expect(c.lineas).toHaveLength(2);
  });

  it("congela el precio unitario en cada línea", () => {
    const c = cotizarAMedida([{ slug: "salmon", cantidad: 2 }], 8);
    expect(c.lineas[0].precioUnitarioCentimos).toBe(colonesACentimos(13950));
  });

  it("ignora cantidades en cero o negativas", () => {
    const c = cotizarAMedida(
      [{ slug: "salmon", cantidad: 0 }, { slug: "pinto-premium", cantidad: -3 }],
      8,
    );
    expect(c.lineas).toHaveLength(0);
    expect(c.totalCentimos).toBe(0);
  });

  it("ignora slugs que no existen en vez de romper", () => {
    const c = cotizarAMedida([{ slug: "no-existe", cantidad: 5 }], 8);
    expect(c.lineas).toHaveLength(0);
  });

  it("incluye extras con precio confirmado", () => {
    const c = cotizarAMedida([{ slug: "pastel", cantidad: 1 }], 10);
    expect(c.subtotalCentimos).toBe(colonesACentimos(25000));
  });

  it("no cotiza extras sin precio definido", () => {
    // Decoración y área privada no tienen precio en docs/. No se inventa uno.
    const c = cotizarAMedida([{ slug: "decoracion", cantidad: 1 }], 10);
    expect(c.lineas).toHaveLength(0);
    expect(extrasSinPrecio().map((e) => e.slug)).toContain("decoracion");
    expect(extrasCotizables().map((e) => e.slug)).toContain("musica-vivo");
  });
});

describe("sugerencias del cotizador", () => {
  it("pone los Estrella primero", () => {
    const s = sugerenciasParaEvento();
    expect(s[0].clasificacion).toBe("estrella");
  });

  it("nunca sugiere Perro salvo el menú infantil", () => {
    const perros = sugerenciasParaEvento().filter((i) => i.clasificacion === "perro");
    expect(perros.every((i) => i.categoria === "infantil")).toBe(true);
  });

  it("dentro de pescados prioriza el mejor margen", () => {
    // Salmón: 10,8% de food cost, el plato más rentable de la carta.
    expect(sugerenciasParaEvento("pescados")[0].nombre).toBe("Salmón");
  });
});

describe("rangos de presupuesto", () => {
  it("expone los cuatro, con 'a la medida' sin precio fijo", () => {
    const r = rangosPresupuesto();
    expect(r).toHaveLength(4);
    expect(r.find((x) => x.slug === "a-la-medida")!.precioPpCentimos).toBeNull();
  });

  it("usa los precios documentados", () => {
    const r = rangosPresupuesto();
    expect(r.find((x) => x.slug === "esencial")!.precioPpCentimos).toBe(colonesACentimos(11500));
    expect(r.find((x) => x.slug === "premium")!.precioPpCentimos).toBe(colonesACentimos(28000));
  });

  it("mantiene la inconsistencia documentada del Esencial sin corregirla sola", () => {
    // docs/CONTEXT.md §10-F: el Esencial va POR ENCIMA de su valor de carta,
    // al revés que los otros dos. Se carga tal cual está documentado.
    const p = paquetePorSlug("esencial")!;
    expect(p.precioPpColones).toBeGreaterThan(p.valorCartaColones!);
    const inter = paquetePorSlug("intermedio")!;
    expect(inter.precioPpColones).toBeLessThan(inter.valorCartaColones!);
  });
});

describe("formato de la cotización", () => {
  it("muestra montos con el formato de la marca", () => {
    const c = cotizarPaquete("intermedio", 10)!;
    expect(formatCRC(c.totalCentimos)).toBe("₡227.550");
  });
});
