/**
 * Sucursales — datos reales de docs/SUCURSALES.md y docs/CONTEXT.md §3.
 *
 * Nada de esto se inventa. Los campos que el negocio todavia no documento
 * (direcciones, desglose de mesas) estan como `null` y quedan registrados
 * en docs/CONTEXT.md §10.
 */
import type { DiaSemana } from "@/lib/datetime";

export type Zona = "interior" | "terraza" | "privado";

export type HorarioDia = {
  dia: DiaSemana;
  /** `HH:mm` hora local de Costa Rica. */
  abre: string;
  cierra: string;
};

export type Sucursal = {
  slug: string;
  nombre: string;
  conceptoZona: string;
  telefono: string;
  /** null = pendiente (vacio G en docs/CONTEXT.md §10). */
  direccion: string | null;
  capacidadTotal: number;
  capacidadMaxEvento: number;
  /** Capacidad del salon privado, o null si la sucursal no tiene. */
  capacidadSalonPrivado: number | null;
  /** null = sin confirmar para Mall San Pedro. */
  tieneBhFit: boolean | null;
  horarios: HorarioDia[];
  /**
   * Overrides de politica por sucursal. Sin valor rige `data/politicas.ts`.
   * El brief los pide configurables por sucursal, y la tabla `branches` los
   * guarda por fila.
   */
  anticipacionMinMesaHoras?: number;
  anticipacionMaxDias?: number;
};

/** Lun-jue 07:00-20:00 · vie-dom 07:00-21:00 (docs/CONTEXT.md §3). */
const HORARIO_ESTANDAR: HorarioDia[] = [
  { dia: 1, abre: "07:00", cierra: "20:00" },
  { dia: 2, abre: "07:00", cierra: "20:00" },
  { dia: 3, abre: "07:00", cierra: "20:00" },
  { dia: 4, abre: "07:00", cierra: "20:00" },
  { dia: 5, abre: "07:00", cierra: "21:00" },
  { dia: 6, abre: "07:00", cierra: "21:00" },
  { dia: 0, abre: "07:00", cierra: "21:00" },
];

/** Mall San Pedro sigue el horario del mall, no el de calle. */
const HORARIO_MALL: HorarioDia[] = [
  { dia: 1, abre: "10:00", cierra: "20:00" },
  { dia: 2, abre: "10:00", cierra: "20:00" },
  { dia: 3, abre: "10:00", cierra: "20:00" },
  { dia: 4, abre: "10:00", cierra: "20:00" },
  { dia: 5, abre: "10:00", cierra: "20:00" },
  { dia: 6, abre: "09:00", cierra: "20:00" },
  { dia: 0, abre: "09:00", cierra: "20:00" },
];

export const SUCURSALES: Sucursal[] = [
  {
    slug: "escazu",
    nombre: "Escazú",
    conceptoZona: "Ultra-diferenciación",
    telefono: "8415-7883",
    direccion: null,
    capacidadTotal: 120,
    capacidadMaxEvento: 100,
    capacidadSalonPrivado: 8,
    tieneBhFit: true,
    horarios: HORARIO_ESTANDAR,
  },
  {
    slug: "pinares",
    nombre: "Pinares / Curridabat",
    conceptoZona: "Eco-chic ejecutivo",
    telefono: "8915-7883",
    direccion: null,
    // docs/CONTEXT.md §10-E: el documento dice 180 total, pero terraza 100 +
    // interior 50 = 150. Se usa el total declarado hasta que se aclare.
    capacidadTotal: 180,
    capacidadMaxEvento: 100,
    capacidadSalonPrivado: 25,
    tieneBhFit: true,
    horarios: HORARIO_ESTANDAR,
  },
  {
    slug: "cartago",
    nombre: "Cartago",
    conceptoZona: "Primer concepto chic local",
    telefono: "8715-7883",
    direccion: null,
    capacidadTotal: 100,
    capacidadMaxEvento: 70,
    capacidadSalonPrivado: 8,
    tieneBhFit: true,
    horarios: HORARIO_ESTANDAR,
  },
  {
    slug: "san-pedro",
    nombre: "Mall San Pedro",
    conceptoZona: "Oasis de escape",
    telefono: "8815-7883",
    direccion: null,
    capacidadTotal: 40,
    capacidadMaxEvento: 35,
    capacidadSalonPrivado: null,
    tieneBhFit: null,
    horarios: HORARIO_MALL,
  },
];

/**
 * Fraccion de la capacidad total reservable por franja los fines de semana
 * (docs/CONTEXT.md §3). De lunes a viernes no hay tope: manda la capacidad
 * fisica. El 70% restante del sabado y domingo queda para walk-in.
 */
export const FRACCION_RESERVABLE_FIN_DE_SEMANA = 0.3;

export function topeReservablePorFranja(
  sucursal: Sucursal,
  dia: DiaSemana,
): number {
  const esFinDeSemana = dia === 0 || dia === 6;
  return esFinDeSemana
    ? Math.floor(sucursal.capacidadTotal * FRACCION_RESERVABLE_FIN_DE_SEMANA)
    : sucursal.capacidadTotal;
}

export function sucursalPorSlug(slug: string): Sucursal | undefined {
  return SUCURSALES.find((s) => s.slug === slug);
}
