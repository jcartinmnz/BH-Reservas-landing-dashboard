/**
 * Menu completo — docs/MENU.md (Ingenieria de Menu 2026, Miller-Kasavana).
 * 124 items: 58 platos + 66 bebidas. Precios en colones enteros, ANTES de
 * IVA y servicio.
 *
 * PRIVACIDAD: `foodCostPct` y `unidades2026` son datos internos. Nunca se
 * exponen en la app publica ni en la cotizacion que ve el cliente
 * (docs/CONTEXT.md §5). El helper `aVistaPublica` los elimina.
 */

export const CLASIFICACIONES = ["estrella", "puzzle", "caballo", "perro"] as const;
export type Clasificacion = (typeof CLASIFICACIONES)[number];

export const CATEGORIAS = [
  "desayunos",
  "entradas",
  "hamburguesas",
  "ensaladas",
  "pizzas",
  "sandwiches",
  "cremas",
  "pastas",
  "risottos",
  "infantil",
  "carnes",
  "pescados",
  "postres",
  "bebidas_calientes",
  "iced_lattes",
  "chocolate",
  "te_chai",
  "milkshakes",
  "smoothies",
  "cafes_frios",
  "sodas_italianas",
  "bebidas_naturales",
  "gaseosas",
  "cervezas",
  "cocteles",
  "gin_tonics",
  "sangria",
  "mimosa",
] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const NOMBRE_CATEGORIA: Record<Categoria, string> = {
  desayunos: "Desayunos y Brunch",
  entradas: "Entradas y Bocas",
  hamburguesas: "Hamburguesas",
  ensaladas: "Ensaladas",
  pizzas: "Pizzas",
  sandwiches: "Sándwiches",
  cremas: "Cremas",
  pastas: "Pastas",
  risottos: "Risottos",
  infantil: "Menú Infantil",
  carnes: "Carnes",
  pescados: "Pescados y Mariscos",
  postres: "Postres",
  bebidas_calientes: "Bebidas Calientes",
  iced_lattes: "Iced Lattes",
  chocolate: "Chocolate",
  te_chai: "Té Chai",
  milkshakes: "Milk Shakes",
  smoothies: "Smoothies",
  cafes_frios: "Cafés Fríos",
  sodas_italianas: "Sodas Italianas",
  bebidas_naturales: "Bebidas Naturales",
  gaseosas: "Gaseosas",
  cervezas: "Cervezas",
  cocteles: "Cócteles",
  gin_tonics: "Gin & Tonics",
  sangria: "Sangría",
  mimosa: "Mimosa",
};

/** Categorias que son bebida, para el desglose de KPIs del CRM. */
const CATEGORIAS_BEBIDA = new Set<Categoria>([
  "bebidas_calientes", "iced_lattes", "chocolate", "te_chai", "milkshakes",
  "smoothies", "cafes_frios", "sodas_italianas", "bebidas_naturales",
  "gaseosas", "cervezas", "cocteles", "gin_tonics", "sangria", "mimosa",
]);

/** `[nombre, precioColones, clasificacion, foodCostPct, unidades2026]` */
type Fila = [string, number, Clasificacion, number, number];

const CRUDO: Record<Categoria, Fila[]> = {
  desayunos: [
    ["Pinto con Lomito", 9975, "estrella", 37.6, 1154],
    ["Pinto con Rib Eye", 11025, "estrella", 38.7, 654],
    ["Waffles Salados", 6195, "estrella", 25.2, 651],
    ["Tostadas de Trucha Ahumada", 6050, "estrella", 27.0, 604],
    ["Waffles Dulces", 6195, "puzzle", 30.7, 552],
    ["Pinto con Huevos Rancheros", 4725, "caballo", 32.6, 2746],
    ["Pinto Patrio", 6825, "caballo", 46.1, 2972],
    ["Omelette Supremo", 4150, "caballo", 28.2, 2276],
    ["Huevos al Gusto", 2995, "caballo", 31.5, 1348],
    ["Omelette con Carne Mechada", 5940, "caballo", 52.4, 745],
    ["Bowl de Frutas", 4150, "caballo", 28.1, 778],
    ["Bowl de Pinto Premium", 5775, "caballo", 34.8, 1362],
    ["Tostadas de Aguacate", 5775, "caballo", 31.3, 1922],
    ["Tico Bowl", 7020, "caballo", 51.3, 818],
    ["Tostadas Francesas", 5995, "caballo", 40.0, 1072],
    ["Pinto Premium", 5775, "caballo", 31.6, 8173],
    ["Bowl Español", 7090, "perro", 40.4, 412],
  ],
  entradas: [
    ["Tacos de Birria", 6750, "estrella", 32.6, 714],
    ["Carpaccio de Salmón", 7900, "puzzle", 9.6, 175],
    ["Ceviche Caribeño", 8900, "puzzle", 17.6, 381],
    ["Plato de Quesos y Embutidos", 10900, "puzzle", 23.0, 24],
    ["Nachos de Birria", 8900, "puzzle", 30.3, 240],
    ["Trio Bread House", 6900, "puzzle", 29.9, 321],
    ["Patacones", 4900, "caballo", 24.6, 727],
    ["Tequeños", 4900, "caballo", 20.0, 835],
    ["Papas Bravas", 4900, "perro", 21.3, 443],
    ["Tacos Ticos de Birria", 5500, "perro", 36.1, 155],
  ],
  hamburguesas: [
    ["Hamburguesa Especial de la Casa", 8900, "estrella", 33.4, 765],
    ["Hamburguesa Pollo Maracuyá", 8900, "puzzle", 17.5, 187],
  ],
  ensaladas: [["Ensalada César Estilo Bread House", 9500, "puzzle", 24.0, 374]],
  pizzas: [
    ["Margarita Estilo Bread House", 6500, "estrella", 26.3, 580],
    ["Jamón y Hongos", 6500, "puzzle", 32.7, 348],
    ["Suprema", 6885, "puzzle", 26.6, 297],
    ["Pepperoni", 6825, "perro", 41.7, 357],
  ],
  sandwiches: [
    ["Cubano Estilo Bread House", 7500, "estrella", 34.7, 1123],
    ["Pollo Crispy", 7500, "estrella", 33.2, 1588],
    ["Cheese Sandwich Bread House", 7500, "puzzle", 26.2, 361],
    ["Arreglado de Mano de Piedra", 3900, "caballo", 52.6, 2267],
    ["Sandwich de Jamón", 3900, "caballo", 20.7, 837],
  ],
  cremas: [["Crema de Tomate Rostizado", 5500, "caballo", 43.6, 719]],
  pastas: [
    ["Pasta Cuatro Quesos", 7245, "puzzle", 40.4, 501],
    ["Pasta con Entraña", 10450, "puzzle", 34.4, 468],
    ["Pasta con Pulpo y Camarones", 13125, "puzzle", 27.6, 96],
    ["Pasta Pomodoro", 7245, "perro", 42.0, 506],
  ],
  risottos: [
    ["Risotto de Hongos y Lomito", 9950, "estrella", 28.9, 676],
    ["Risotto de Ají de la Casa y Salmón", 9950, "puzzle", 22.4, 261],
    ["Risotto con Camarones", 9950, "puzzle", 28.5, 256],
  ],
  infantil: [
    ["Chicken Fingers", 4150, "perro", 28.1, 532],
    ["Fish & Chips", 4150, "perro", 18.6, 189],
    ["Mini Pizza", 4150, "perro", 34.3, 297],
    ["Papas Fritas", 2365, "perro", 23.2, 252],
  ],
  carnes: [
    ["Rib Eye 400 grs", 15645, "puzzle", 49.5, 394],
    ["Picanha 300 grs", 14595, "puzzle", 49.4, 282],
  ],
  pescados: [
    ["Salmón", 13950, "puzzle", 10.8, 454],
    ["Pescado", 13950, "puzzle", 15.9, 161],
    ["Gratin de Mariscos", 9900, "puzzle", 35.2, 94],
    ["Mar y Tierra", 13125, "puzzle", 36.9, 228],
  ],
  postres: [["Postre de Turno", 6900, "puzzle", 14.8, 43]],
  bebidas_calientes: [
    ["Cappuccino Irlandés", 2850, "estrella", 27.0, 657],
    ["Latte", 2950, "estrella", 15.1, 1888],
    ["Cappuccino Viennese", 2850, "puzzle", 29.8, 163],
    ["Cappuccino 1 Sabor", 2850, "puzzle", 27.0, 432],
    ["Irish Coffee con Whisky", 6325, "puzzle", 61.8, 72],
    ["Té en Leche", 2500, "puzzle", 17.3, 41],
    ["Americano", 1950, "caballo", 10.2, 7721],
    ["Café con Leche", 2150, "caballo", 18.0, 7340],
    ["Super Cappuccino", 2400, "caballo", 24.3, 823],
    ["Cappuccino Europeo", 2150, "caballo", 23.9, 6874],
    ["Té en Agua", 1900, "caballo", 5.1, 994],
    ["Mocca", 2150, "caballo", 29.2, 914],
    ["Té Premium", 3080, "caballo", 41.9, 1140],
    ["Espresso Doble", 1500, "perro", 13.3, 139],
    ["Espresso", 1250, "perro", 8.0, 222],
    ["Espresso Machiatto", 1500, "perro", 6.6, 39],
    ["Espresso Cortado Doble", 1650, "perro", 14.0, 102],
    ["Espresso Cortado", 1500, "perro", 34.5, 110],
    ["Aguadulce en Agua", 1800, "perro", 5.4, 254],
    ["Aguadulce en Leche", 2100, "perro", 20.6, 429],
  ],
  iced_lattes: [
    ["Black Iced", 2650, "puzzle", 7.5, 89],
    ["Iced Latte", 2950, "puzzle", 16.3, 421],
    ["Iced Latte Vainilla", 2950, "puzzle", 34.8, 524],
    ["Iced Latte Mocca", 2950, "puzzle", 34.8, 320],
    ["Iced Latte Caramelo", 2950, "puzzle", 34.8, 475],
  ],
  chocolate: [
    ["Chocolate Caliente", 2500, "estrella", 19.6, 1312],
    ["Chocolate Frío", 2800, "puzzle", 20.9, 398],
  ],
  te_chai: [
    ["Té Chai Frío", 2800, "puzzle", 29.9, 376],
    ["Té Chai Caliente", 2500, "caballo", 28.1, 921],
  ],
  milkshakes: [
    ["Milk Shake Chocolate", 3000, "puzzle", 27.0, 191],
    ["Milk Shake Fresa", 3000, "perro", 37.1, 229],
    ["Milk Shake Vainilla", 3000, "perro", 39.3, 142],
  ],
  smoothies: [
    ["Smoothie Maracuyá", 2900, "estrella", 4.0, 608],
    ["Smoothie Cas", 2900, "estrella", 4.0, 858],
    ["Smoothie Frutas", 2900, "puzzle", 4.0, 551],
  ],
  cafes_frios: [
    ["Pirulín", 3500, "puzzle", 30.5, 254],
    ["Pasión Alaska", 3500, "puzzle", 44.1, 230],
    ["Chocomenta", 3500, "puzzle", 30.5, 275],
    ["Almendrado", 3500, "puzzle", 30.5, 192],
  ],
  sodas_italianas: [
    ["Caribeña", 3220, "puzzle", 12.3, 247],
    ["Frutos Rojos", 3220, "puzzle", 12.3, 537],
  ],
  bebidas_naturales: [
    ["Limonada con Hierba Buena", 2500, "estrella", 11.6, 2434],
    ["Pasión Tropical", 2750, "estrella", 11.4, 928],
    ["Red Moon", 2750, "puzzle", 9.1, 428],
    ["Otras Frutas en Leche", 2800, "puzzle", 22.2, 243],
    ["Jugo de Naranja", 2000, "caballo", 28.7, 3510],
    ["Otras Frutas en Agua", 2500, "caballo", 31.8, 4587],
  ],
  gaseosas: [["Gaseosas (varios sabores)", 1750, "perro", 22.6, 543]],
  cervezas: [
    ["Imperial", 2500, "perro", 32.5, 168],
    ["Pilsen", 2500, "perro", 32.5, 138],
    ["Stella Artois", 2500, "perro", 43.0, 131],
    ["Heineken", 2500, "perro", 43.0, 109],
    ["Corona", 2500, "perro", 40.8, 102],
    ["Bavaria Gold", 2500, "perro", 42.0, 98],
    ["Modelo", 2500, "perro", 42.0, 57],
  ],
  cocteles: [
    ["Oaxaca Pasión", 6250, "puzzle", 24.7, 35],
    ["Qué Fresada!", 6250, "puzzle", 29.9, 21],
    ["Tropical Negroni", 5750, "puzzle", 32.2, 41],
    ["Mojito Bread House", 5250, "puzzle", 36.0, 20],
  ],
  gin_tonics: [
    ["That Girl...", 5000, "puzzle", 36.8, 114],
    ["Purple Iced", 5000, "puzzle", 36.9, 114],
    ["Nearly a Classic", 5000, "puzzle", 37.7, 26],
    ["Tropical Tonic", 6250, "puzzle", 34.9, 25],
  ],
  sangria: [
    ["Sangría Tinta Bread House", 4500, "puzzle", 49.1, 290],
    ["Sangría Blanca Bread House", 4500, "puzzle", 49.4, 132],
  ],
  mimosa: [["Mimosa Estilo Bread House", 2850, "estrella", 3.5, 837]],
};

export type ItemMenu = {
  slug: string;
  nombre: string;
  categoria: Categoria;
  /** Colones enteros, antes de IVA y servicio. */
  precioColones: number;
  clasificacion: Clasificacion;
  esBebida: boolean;
  /** Si puede entrar en un paquete de evento. */
  aptoEvento: boolean;
  /** @internal Nunca exponer al cliente. */
  foodCostPct: number;
  /** @internal Nunca exponer al cliente. */
  unidades2026: number;
};

function slugificar(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Regla del cotizador (docs/CONTEXT.md §5): los Perro se excluyen de los
 * paquetes de evento. Unica excepcion deliberada: el menu infantil, que es
 * Perro entero pero hace falta — los cumpleanos y baby showers llevan ninos.
 */
function esAptoEvento(clasificacion: Clasificacion, categoria: Categoria): boolean {
  if (categoria === "infantil") return true;
  return clasificacion !== "perro";
}

export const MENU: ItemMenu[] = (Object.keys(CRUDO) as Categoria[]).flatMap((categoria) =>
  CRUDO[categoria].map(([nombre, precioColones, clasificacion, foodCostPct, unidades2026]) => ({
    slug: slugificar(nombre),
    nombre,
    categoria,
    precioColones,
    clasificacion,
    esBebida: CATEGORIAS_BEBIDA.has(categoria),
    aptoEvento: esAptoEvento(clasificacion, categoria),
    foodCostPct,
    unidades2026,
  })),
);

/** Forma publica de un item: sin food cost ni unidades vendidas. */
export type ItemMenuPublico = Omit<ItemMenu, "foodCostPct" | "unidades2026">;

/**
 * Elimina los campos internos. Toda ruta publica debe pasar por aca antes de
 * serializar un item hacia el cliente.
 */
export function aVistaPublica(item: ItemMenu): ItemMenuPublico {
  const { foodCostPct: _fc, unidades2026: _u, ...publico } = item;
  void _fc;
  void _u;
  return publico;
}

export function itemPorSlug(slug: string): ItemMenu | undefined {
  return MENU.find((i) => i.slug === slug);
}

/**
 * Orden de sugerencia del cotizador: Estrella primero, luego Puzzle
 * ("recomendacion del chef"), luego Caballo. Dentro de cada grupo, mejor
 * margen primero — el food cost decide el desempate, y por eso el orden se
 * calcula en el servidor y nunca viaja al cliente.
 */
const PESO_CLASIFICACION: Record<Clasificacion, number> = {
  estrella: 0, puzzle: 1, caballo: 2, perro: 3,
};

export function ordenarParaCotizador(items: ItemMenu[]): ItemMenu[] {
  return [...items].sort((a, b) => {
    const peso = PESO_CLASIFICACION[a.clasificacion] - PESO_CLASIFICACION[b.clasificacion];
    return peso !== 0 ? peso : a.foodCostPct - b.foodCostPct;
  });
}
