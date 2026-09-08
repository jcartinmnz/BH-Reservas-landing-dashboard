/**
 * Paquetes de evento — docs/MENU.md §18.
 *
 * ADVERTENCIA DE DATO (docs/CONTEXT.md §10-F): el documento describe un
 * descuento uniforme de 3-6% sobre el valor de carta, pero el paquete
 * Esencial queda ₡1.050 POR ENCIMA de su valor de carta mientras Intermedio
 * y Premium quedan ~6% por debajo. Los precios se cargan tal como estan
 * documentados; la inconsistencia esta reportada y sin resolver.
 */

export type Paquete = {
  slug: string;
  nombre: string;
  descripcion: string;
  /** Colones enteros por persona, antes de IVA y servicio. */
  precioPpColones: number;
  minPersonas: number;
  incluye: string[];
  /** Valor de carta de referencia, para medir el descuento. */
  valorCartaColones: number | null;
  orden: number;
};

export const PAQUETES: Paquete[] = [
  {
    slug: "esencial",
    nombre: "Esencial",
    descripcion: "Almuerzos corporativos y grupos casuales.",
    precioPpColones: 11500,
    minPersonas: 8,
    incluye: [
      "1 bebida a elección (café, té o natural, hasta ₡2.950)",
      "1 fuerte a elección: Pinto Premium, Cubano, Pollo Crispy, Pizza Margarita u Omelette Supremo",
    ],
    valorCartaColones: 10450,
    orden: 1,
  },
  {
    slug: "intermedio",
    nombre: "Intermedio",
    descripcion: "El paquete por defecto para cumpleaños y celebraciones.",
    precioPpColones: 18500,
    minPersonas: 8,
    incluye: [
      "Mimosa o smoothie de bienvenida",
      "Entrada para compartir: Tequeños, Patacones o Tacos de Birria",
      "1 fuerte estrella: Pinto con Lomito, Hamburguesa Especial, Risotto de Hongos y Lomito o Waffles Salados",
      "Postre de Turno compartido",
    ],
    valorCartaColones: 19650,
    orden: 2,
  },
  {
    slug: "premium",
    nombre: "Premium",
    descripcion: "Aniversarios, bridal showers y corporativo alto.",
    precioPpColones: 28000,
    minPersonas: 8,
    incluye: [
      "Mimosa, sangría o gin & tonic de bienvenida",
      "Entrada para compartir: Carpaccio de Salmón o Ceviche Caribeño",
      "1 fuerte premium: Salmón, Risotto con Camarones, Pasta con Entraña o Picanha",
      "Postre de Turno",
    ],
    valorCartaColones: 29800,
    orden: 3,
  },
  {
    slug: "a-la-medida",
    nombre: "A la medida",
    descripcion: "Armá el menú desde la carta completa. El total se recalcula en vivo.",
    precioPpColones: 0,
    minPersonas: 8,
    incluye: ["Selección libre del menú", "Total recalculado en vivo"],
    valorCartaColones: null,
    orden: 4,
  },
];

/** Extras de evento con precio confirmado (docs/MENU.md §19). */
export type Extra = {
  slug: string;
  nombre: string;
  /** null = precio pendiente de definir. */
  precioColones: number | null;
  unidad: string;
  nota?: string;
};

export const EXTRAS: Extra[] = [
  { slug: "pastel", nombre: "Pastel", precioColones: 25000, unidad: "unidad", nota: "10 a 15 porciones" },
  { slug: "musica-vivo", nombre: "Música en vivo", precioColones: 50000, unidad: "hora" },
  { slug: "area-privada", nombre: "Área privada", precioColones: null, unidad: "evento", nota: "Solo sucursales con salón: Pinares 25 pax, Escazú 8 pax, Cartago 8 pax" },
  // docs/CONTEXT.md §10-K: precio pendiente.
  { slug: "decoracion", nombre: "Decoración", precioColones: null, unidad: "evento" },
];
