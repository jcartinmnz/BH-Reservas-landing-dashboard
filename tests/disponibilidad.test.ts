import { describe, expect, it } from "vitest";
import {
  calcularDisponibilidad, comensalesEnFranja, elegirMesa, hayCupo,
  seSolapan, topeDeFranja, type Blackout, type ContextoDisponibilidad,
  type Mesa, type ReservaExistente,
} from "@/lib/availability/engine";
import { sucursalPorSlug } from "@/data/sucursales";
import { aUTC } from "@/lib/datetime";

const escazu = sucursalPorSlug("escazu")!;
const sanPedro = sucursalPorSlug("san-pedro")!;

/** 2026-10-05 es lunes; 2026-10-10 es sábado. */
const LUNES = "2026-10-05";
const SABADO = "2026-10-10";

/** Bien antes de cualquier fecha de prueba, para que no moleste el mínimo. */
const AHORA = aUTC("2026-09-01", "08:00");

function ctx(over: Partial<ContextoDisponibilidad> = {}): ContextoDisponibilidad {
  return {
    sucursal: escazu, fechaLocal: LUNES, numPersonas: 2, ahora: AHORA,
    reservas: [], blackouts: [], mesas: [], ...over,
  };
}

function reserva(
  fecha: string, hora: string, personas: number,
  franja: ReservaExistente["franja"], duracion = 90, tableId: string | null = null,
): ReservaExistente {
  const startsAt = aUTC(fecha, hora);
  return {
    startsAt, endsAt: new Date(startsAt.getTime() + duracion * 60_000),
    franja, numPersonas: personas, tableId,
  };
}

describe("solape de ventanas", () => {
  const a = aUTC(LUNES, "13:00"), b = aUTC(LUNES, "14:30");
  it("detecta encimado parcial", () => {
    expect(seSolapan(a, b, aUTC(LUNES, "14:00"), aUTC(LUNES, "15:00"))).toBe(true);
  });
  it("no marca solape cuando una empieza justo al terminar la otra", () => {
    // Borde clave: 14:30-16:00 debe poder tomar la mesa que se libera a las 14:30.
    expect(seSolapan(a, b, aUTC(LUNES, "14:30"), aUTC(LUNES, "16:00"))).toBe(false);
  });
});

describe("horarios ofrecidos", () => {
  it("solo ofrece horas dentro de las 4 franjas", () => {
    const slots = calcularDisponibilidad(ctx());
    expect(slots[0].hora).toBe("07:00");
    expect(slots.at(-1)!.hora).toBe("19:30");
  });

  it("no ofrece nada en la ventana 20:00-21:00 de un viernes", () => {
    // Escazú cierra a las 21:00 vie-dom, pero Social Pesada termina a las
    // 20:00 y esa hora no tiene franja asignada (vacío D).
    const slots = calcularDisponibilidad(ctx({ fechaLocal: "2026-10-09" }));
    expect(slots.some((s) => s.hora >= "20:00")).toBe(false);
  });

  it("respeta la apertura tardía de Mall San Pedro", () => {
    const slots = calcularDisponibilidad(ctx({ sucursal: sanPedro }));
    expect(slots[0].hora).toBe("10:00");
  });

  it("marca las horas sin cupo como no disponibles, no las oculta", () => {
    const slots = calcularDisponibilidad(
      ctx({ fechaLocal: SABADO, reservas: [reserva(SABADO, "13:00", 36, "fast_lunch")] }),
    );
    const lunch = slots.filter((s) => s.franja === "fast_lunch");
    expect(lunch.length).toBeGreaterThan(0);
    expect(lunch.every((s) => !s.disponible && s.motivo === "franja_llena")).toBe(true);
  });
});

describe("cierre de la sucursal", () => {
  it("no deja empezar si la mesa no termina antes de cerrar", () => {
    // Lunes cierra 20:00. Un grupo de 5 ocupa 120 min: 18:30 terminaría 20:30.
    const slots = calcularDisponibilidad(ctx({ numPersonas: 5 }));
    const tarde = slots.find((s) => s.hora === "18:30")!;
    expect(tarde.disponible).toBe(false);
    expect(tarde.motivo).toBe("no_cierra_a_tiempo");
    // 18:00 sí alcanza: termina justo a las 20:00.
    expect(slots.find((s) => s.hora === "18:00")!.disponible).toBe(true);
  });
});

describe("anticipación", () => {
  it("bloquea lo que cae dentro de las 3 horas mínimas", () => {
    const ahora = aUTC(LUNES, "12:00");
    const slots = calcularDisponibilidad(ctx({ ahora }));
    expect(slots.find((s) => s.hora === "14:00")!.motivo).toBe("anticipacion_minima");
    expect(slots.find((s) => s.hora === "15:00")!.disponible).toBe(true);
  });

  it("marca como pasado lo que ya ocurrió", () => {
    const slots = calcularDisponibilidad(ctx({ ahora: aUTC(LUNES, "12:00") }));
    expect(slots.find((s) => s.hora === "08:00")!.motivo).toBe("pasado");
  });

  it("rechaza más allá de los 90 días", () => {
    const slots = calcularDisponibilidad(
      ctx({ fechaLocal: "2027-06-01", ahora: aUTC("2026-09-01", "08:00") }),
    );
    expect(slots.every((s) => s.motivo === "fuera_de_ventana")).toBe(true);
  });
});

describe("capacidad por franja", () => {
  it("no pone tope de lunes a viernes", () => {
    expect(topeDeFranja(escazu, 1, "fast_lunch", [])).toBe(120);
  });

  it("aplica el 30% el sábado", () => {
    expect(topeDeFranja(escazu, 6, "fast_lunch", [])).toBe(36);
  });

  it("cuenta comensales, no reservas", () => {
    const reservas = [
      reserva(SABADO, "13:00", 4, "fast_lunch"),
      reserva(SABADO, "13:30", 2, "fast_lunch"),
      reserva(SABADO, "16:00", 6, "tardeada_social"),
    ];
    expect(comensalesEnFranja(reservas, "fast_lunch")).toBe(6);
    expect(comensalesEnFranja(reservas, "tardeada_social")).toBe(6);
  });

  it("cada franja tiene su propio tope, no uno compartido por día", () => {
    // Sábado con Fast Lunch lleno: Tardeada Social sigue libre.
    const slots = calcularDisponibilidad(
      ctx({ fechaLocal: SABADO, reservas: [reserva(SABADO, "13:00", 36, "fast_lunch")] }),
    );
    expect(slots.filter((s) => s.franja === "fast_lunch").every((s) => !s.disponible)).toBe(true);
    expect(slots.filter((s) => s.franja === "tardeada_social").some((s) => s.disponible)).toBe(true);
  });

  it("deja entrar justo hasta el tope y no uno más", () => {
    const base = { fechaLocal: SABADO, reservas: [reserva(SABADO, "13:00", 34, "fast_lunch")] };
    const cabe = calcularDisponibilidad(ctx({ ...base, numPersonas: 2 }));
    const noCabe = calcularDisponibilidad(ctx({ ...base, numPersonas: 3 }));
    expect(cabe.find((s) => s.franja === "fast_lunch")!.disponible).toBe(true);
    expect(noCabe.find((s) => s.franja === "fast_lunch")!.motivo).toBe("franja_llena");
  });
});

describe("blackouts", () => {
  const cierre: Blackout = { franja: null, tipo: "cierre_total", capacidadOverride: null };
  const privada: Blackout = { franja: "tardeada_social", tipo: "privatizacion", capacidadOverride: null };

  it("cierra el día entero", () => {
    const slots = calcularDisponibilidad(ctx({ blackouts: [cierre] }));
    expect(slots.every((s) => s.motivo === "sucursal_cerrada")).toBe(true);
  });

  it("bloquea una sola franja y deja el resto del día vivo", () => {
    const slots = calcularDisponibilidad(ctx({ blackouts: [privada] }));
    expect(slots.filter((s) => s.franja === "tardeada_social")
      .every((s) => s.motivo === "franja_bloqueada")).toBe(true);
    expect(slots.filter((s) => s.franja === "fast_lunch").every((s) => s.disponible)).toBe(true);
  });

  it("reduce la capacidad sin cerrar", () => {
    const reducida: Blackout = { franja: "fast_lunch", tipo: "capacidad_reducida", capacidadOverride: 10 };
    expect(topeDeFranja(escazu, 1, "fast_lunch", [reducida])).toBe(10);
    // Nunca puede subir por encima del tope normal del día.
    expect(topeDeFranja(escazu, 6, "fast_lunch", [
      { franja: "fast_lunch", tipo: "capacidad_reducida", capacidadOverride: 999 },
    ])).toBe(36);
  });
});

describe("asignación de mesa", () => {
  const mesas: Mesa[] = [
    { id: "m2", capacidadMin: 1, capacidadMax: 2, zona: "interior", activa: true },
    { id: "m4", capacidadMin: 2, capacidadMax: 4, zona: "terraza", activa: true },
    { id: "m6", capacidadMin: 4, capacidadMax: 6, zona: "interior", activa: true },
  ];

  it("elige la mesa más chica que cubra el grupo", () => {
    const m = elegirMesa(mesas, [], 2, aUTC(LUNES, "13:00"), aUTC(LUNES, "14:30"));
    expect(m?.id).toBe("m2");
  });

  it("salta a la siguiente cuando la chica está ocupada", () => {
    const ocupada = [reserva(LUNES, "13:00", 2, "fast_lunch", 90, "m2")];
    // Sin reservas, la m2 es la elegida.
    expect(elegirMesa(mesas, [], 2, aUTC(LUNES, "13:30"), aUTC(LUNES, "15:00"))?.id).toBe("m2");
    // Con la m2 tomada de 13:00 a 14:30, cae a la m4.
    expect(elegirMesa(mesas, ocupada, 2, aUTC(LUNES, "13:30"), aUTC(LUNES, "15:00"))?.id).toBe("m4");
  });

  it("devuelve null cuando ninguna mesa cubre el grupo", () => {
    expect(elegirMesa(mesas, [], 7, aUTC(LUNES, "13:00"), aUTC(LUNES, "15:00"))).toBeNull();
  });

  it("valida por capacidad de franja cuando no hay mesas cargadas", () => {
    // Supuesto S-1: sin desglose de mesas el motor igual funciona.
    const slots = calcularDisponibilidad(ctx({ mesas: [] }));
    expect(hayCupo(slots)).toBe(true);
    expect(slots.every((s) => s.mesaId === undefined)).toBe(true);
  });

  it("asigna mesa concreta cuando sí hay", () => {
    const slots = calcularDisponibilidad(ctx({ mesas }));
    expect(slots.find((s) => s.disponible)!.mesaId).toBe("m2");
  });

  it("marca sin_mesa si el grupo no entra en ninguna", () => {
    // 7 personas no caben en ninguna mesa (la mayor es de 6).
    const slots = calcularDisponibilidad(ctx({ mesas, numPersonas: 7 }));
    expect(hayCupo(slots)).toBe(false);
    expect(slots.some((s) => s.motivo === "sin_mesa")).toBe(true);
    // Los últimos del día fallan antes, por el cierre: un grupo de 7 ocupa
    // 120 min y no alcanza. Los dos motivos son ciertos; gana el primero.
    expect(slots.at(-1)!.motivo).toBe("no_cierra_a_tiempo");
  });
});
