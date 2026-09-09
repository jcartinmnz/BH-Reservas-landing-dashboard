import { describe, expect, it } from "vitest";
import { aplicarPct, colonesACentimos, desglosar, formatCRC } from "@/lib/money";
import { franjaDeMinuto, horaAMinutos, nombreFranja } from "@/lib/franjas";
import { SUCURSALES, topeReservablePorFranja, sucursalPorSlug } from "@/data/sucursales";
import { MENU, aVistaPublica, ordenarParaCotizador } from "@/data/menu";
import { duracionMesa, POLITICA_MESA } from "@/data/politicas";

describe("dinero", () => {
  it("formatea colones sin decimales", () => {
    expect(formatCRC(colonesACentimos(9975))).toBe("₡9.975");
    expect(formatCRC(colonesACentimos(12500))).toBe("₡12.500");
    expect(formatCRC(colonesACentimos(950))).toBe("₡950");
  });

  it("no pierde precision al sumar", () => {
    // El caso que rompe si se usa float.
    const suma = colonesACentimos(0.1) + colonesACentimos(0.2);
    expect(suma).toBe(colonesACentimos(0.3));
  });

  it("calcula IVA y servicio sobre el subtotal, no en cascada", () => {
    const d = desglosar(colonesACentimos(100000), 13, 10);
    expect(d.iva).toBe(colonesACentimos(13000));
    expect(d.servicio).toBe(colonesACentimos(10000));
    expect(d.total).toBe(colonesACentimos(123000));
  });

  it("usa las tasas que recibe, no las constantes globales", () => {
    // Una cotizacion vieja guarda sus propias tasas y no debe moverse.
    const d = desglosar(colonesACentimos(1000), 0, 0);
    expect(d.total).toBe(colonesACentimos(1000));
  });

  it("redondea al centimo", () => {
    expect(aplicarPct(333, 13)).toBe(43);
  });
});

describe("franjas", () => {
  it("ubica cada hora en su franja", () => {
    expect(franjaDeMinuto(horaAMinutos("08:00"))).toBe("cafe_brunch");
    expect(franjaDeMinuto(horaAMinutos("13:00"))).toBe("fast_lunch");
    expect(franjaDeMinuto(horaAMinutos("16:30"))).toBe("tardeada_social");
    expect(franjaDeMinuto(horaAMinutos("19:00"))).toBe("social_pesada");
  });

  it("trata los bordes como inicio de la franja siguiente", () => {
    expect(franjaDeMinuto(horaAMinutos("12:00"))).toBe("fast_lunch");
    expect(franjaDeMinuto(horaAMinutos("15:00"))).toBe("tardeada_social");
  });

  it("devuelve null en la ventana 20:00-21:00, que no tiene franja", () => {
    // Vacio D en docs/CONTEXT.md §10: tres sucursales cierran a las 21:00
    // vie-dom, pero Social Pesada termina a las 20:00. El motor no puede
    // inventar una franja para esa hora.
    expect(franjaDeMinuto(horaAMinutos("20:30"))).toBeNull();
    expect(franjaDeMinuto(horaAMinutos("06:00"))).toBeNull();
  });

  it("marca Tardeada Social como franja en recuperacion", () => {
    expect(nombreFranja("tardeada_social")).toBe("Tardeada Social");
  });
});

describe("capacidad por franja", () => {
  it("no pone tope de lunes a viernes", () => {
    const escazu = sucursalPorSlug("escazu")!;
    // Lunes: manda la capacidad fisica.
    expect(topeReservablePorFranja(escazu, 1)).toBe(120);
  });

  it("aplica el 30% sabado y domingo", () => {
    const escazu = sucursalPorSlug("escazu")!;
    expect(topeReservablePorFranja(escazu, 6)).toBe(36);
    expect(topeReservablePorFranja(escazu, 0)).toBe(36);
  });

  it("calcula el tope de cada sucursal", () => {
    const topes = SUCURSALES.map((s) => [s.slug, topeReservablePorFranja(s, 6)]);
    expect(topes).toEqual([
      ["escazu", 36],
      ["pinares", 54],
      ["cartago", 30],
      ["san-pedro", 12],
    ]);
  });
});

describe("politicas de mesa", () => {
  it("usa 90 min hasta 4 personas y 120 desde 5", () => {
    expect(duracionMesa(1)).toBe(90);
    expect(duracionMesa(4)).toBe(90);
    expect(duracionMesa(5)).toBe(120);
    expect(duracionMesa(7)).toBe(120);
  });

  it("corta la reserva de mesa en 7 personas", () => {
    expect(POLITICA_MESA.maxPersonas).toBe(7);
  });
});

describe("menu", () => {
  it("coincide con los totales de la ingenieria de menu 2026", () => {
    // docs/MENU.md §21.
    expect(MENU.length).toBe(124);
    expect(MENU.filter((i) => !i.esBebida).length).toBe(58);
    expect(MENU.filter((i) => i.esBebida).length).toBe(66);
  });

  it("reproduce la distribucion por clasificacion", () => {
    const conteo = MENU.reduce<Record<string, number>>((acc, i) => {
      acc[i.clasificacion] = (acc[i.clasificacion] ?? 0) + 1;
      return acc;
    }, {});
    expect(conteo).toEqual({ estrella: 18, puzzle: 54, caballo: 26, perro: 26 });
  });

  it("excluye los Perro de eventos salvo el menu infantil", () => {
    const perrosAptos = MENU.filter((i) => i.clasificacion === "perro" && i.aptoEvento);
    expect(perrosAptos.every((i) => i.categoria === "infantil")).toBe(true);
    expect(perrosAptos).toHaveLength(4);
  });

  it("nunca expone food cost ni unidades en la vista publica", () => {
    const publico = aVistaPublica(MENU[0]);
    expect(publico).not.toHaveProperty("foodCostPct");
    expect(publico).not.toHaveProperty("unidades2026");
  });

  it("sugiere Estrella primero y desempata por margen", () => {
    const orden = ordenarParaCotizador(MENU.filter((i) => i.categoria === "pescados"));
    // Salmon (10,8%) es el mas rentable de la carta y debe ir primero.
    expect(orden[0].nombre).toBe("Salmón");
  });
});

describe("estados cancelables por el cliente", () => {
  it("incluye confirmada, no solo pendiente", async () => {
    const { CANCELABLES_POR_CLIENTE } = await import("@/lib/crm/estados");
    // El link de cancelar sale junto con la confirmación, así que el caso
    // normal es cancelar una reserva YA confirmada. Cuando esta lista decía
    // solo "pendiente", el botón se mostraba y no hacía nada.
    expect([...CANCELABLES_POR_CLIENTE]).toEqual(["pendiente", "confirmada"]);
  });

  it("no deja que el cliente toque estados que ya no le corresponden", async () => {
    const { CANCELABLES_POR_CLIENTE } = await import("@/lib/crm/estados");
    for (const cerrado of ["sentada", "completada", "cancelada", "no_show"]) {
      expect(CANCELABLES_POR_CLIENTE as readonly string[]).not.toContain(cerrado);
    }
  });
});
