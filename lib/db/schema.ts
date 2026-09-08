/**
 * Esquema de base de datos — Bread House.
 *
 * Decisiones estructurales y su porque estan en docs/PLAN.md §2.
 * Reglas transversales:
 *   - Dinero: enteros de centimos (`bigint`), nunca float.
 *   - Tiempo: `timestamptz` en UTC + `fechaLocal` (date) para agrupar
 *     reportes sin convertir zona en cada query.
 */
import {
  bigint, boolean, date, index, integer, jsonb, pgEnum, pgTable, primaryKey,
  smallint, text, time, timestamp, uniqueIndex, uuid, varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ---------------------------------------------------------------- enums -- */

export const franjaEnum = pgEnum("franja", [
  "cafe_brunch", "fast_lunch", "tardeada_social", "social_pesada",
]);

export const zonaEnum = pgEnum("zona", ["interior", "terraza", "privado"]);

export const tipoReservaEnum = pgEnum("tipo_reserva", ["mesa", "evento"]);

/** pendiente -> confirmada -> sentada -> completada | cancelada | no_show */
export const estadoReservaEnum = pgEnum("estado_reserva", [
  "pendiente", "confirmada", "sentada", "completada", "cancelada", "no_show",
]);

export const sourceEnum = pgEnum("source", [
  "web", "whatsapp_pani", "instagram", "telefono", "walk_in",
]);

export const ocasionEnum = pgEnum("ocasion", [
  "cumpleanos", "baby_shower", "bridal_shower", "almuerzo_corporativo",
  "despedida_soltero", "aniversario", "te_de_cocina", "reunion_especial",
  "graduacion", "revelacion_sexo", "taller_comunitario", "otro",
]);

/** solicitud -> contactado -> cotizacion_enviada -> negociacion -> confirmado -> realizado | perdido */
export const pipelineEnum = pgEnum("estado_pipeline", [
  "solicitud", "contactado", "cotizacion_enviada", "negociacion",
  "confirmado", "realizado", "perdido",
]);

export const clasificacionEnum = pgEnum("clasificacion", [
  "estrella", "puzzle", "caballo", "perro",
]);

export const rolEnum = pgEnum("rol", ["admin", "gerente_sucursal", "anfitrion"]);

export const blackoutTipoEnum = pgEnum("blackout_tipo", [
  "cierre_total", "privatizacion", "feriado", "capacidad_reducida",
]);

export const canceladoPorEnum = pgEnum("cancelado_por", ["cliente", "staff", "sistema"]);

/* ----------------------------------------------------------- sucursales -- */

export const branches = pgTable("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 40 }).notNull().unique(),
  nombre: varchar("nombre", { length: 80 }).notNull(),
  conceptoZona: varchar("concepto_zona", { length: 120 }),
  direccion: text("direccion"),
  telefono: varchar("telefono", { length: 20 }),
  capacidadTotal: integer("capacidad_total").notNull(),
  capacidadMaxEvento: integer("capacidad_max_evento").notNull(),
  capacidadSalonPrivado: integer("capacidad_salon_privado"),
  tieneBhFit: boolean("tiene_bh_fit"),

  // Parametros de negocio por sucursal: el brief los pide configurables.
  duracionDefaultMin: integer("duracion_default_min").notNull().default(90),
  duracionGrupoGrandeMin: integer("duracion_grupo_grande_min").notNull().default(120),
  anticipacionMinMesaHoras: integer("anticipacion_min_mesa_horas").notNull().default(3),
  anticipacionMinEventoHoras: integer("anticipacion_min_evento_horas").notNull().default(72),
  anticipacionMaxDias: integer("anticipacion_max_dias").notNull().default(90),

  activa: boolean("activa").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Horario de apertura por dia. Normalizado (no JSON) porque el wizard lo
 * consulta en cada paso de fecha y hora, y sobre JSON eso no se indexa.
 */
export const branchHours = pgTable(
  "branch_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    /** 0 = domingo … 6 = sabado. */
    diaSemana: smallint("dia_semana").notNull(),
    abre: time("abre").notNull(),
    cierra: time("cierra").notNull(),
  },
  (t) => ({
    unicoPorDia: uniqueIndex("branch_hours_branch_dia_idx").on(t.branchId, t.diaSemana),
  }),
);

/**
 * Tope de comensales reservables por franja y dia.
 *
 * Separado de la definicion de franja (que es global y vive en
 * lib/franjas.ts) porque la capacidad varia por sucursal Y por dia:
 * lun-vie sin tope, sab-dom el 30% de la capacidad total.
 */
export const branchSlotCapacity = pgTable(
  "branch_slot_capacity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    franja: franjaEnum("franja").notNull(),
    diaSemana: smallint("dia_semana").notNull(),
    /** null = sin tope; manda la capacidad fisica de la sucursal. */
    capacidadMax: integer("capacidad_max"),
    activa: boolean("activa").notNull().default(true),
  },
  (t) => ({
    unico: uniqueIndex("branch_slot_capacity_idx").on(t.branchId, t.franja, t.diaSemana),
  }),
);

/**
 * Mesas. Se crea vacia: el desglose por sucursal todavia no existe
 * (vacio C, supuesto S-1 en docs/CONTEXT.md). El motor valida por capacidad
 * de franja hasta que se pueble, sin requerir migracion despues.
 */
export const tables = pgTable(
  "tables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    nombre: varchar("nombre", { length: 40 }).notNull(),
    capacidadMin: integer("capacidad_min").notNull(),
    capacidadMax: integer("capacidad_max").notNull(),
    zona: zonaEnum("zona").notNull().default("interior"),
    /** Si puede unirse a otra mesa para grupos que no entran en una sola. */
    combinable: boolean("combinable").notNull().default(false),
    activa: boolean("activa").notNull().default(true),
  },
  (t) => ({
    porSucursal: index("tables_branch_idx").on(t.branchId),
  }),
);

/* ----------------------------------------------------------------- menu -- */

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    nombre: varchar("nombre", { length: 120 }).notNull(),
    descripcion: text("descripcion"),
    categoria: varchar("categoria", { length: 40 }).notNull(),
    /** Centimos de colon, antes de IVA y servicio. */
    precioCentimos: bigint("precio_centimos", { mode: "number" }).notNull(),
    clasificacion: clasificacionEnum("clasificacion").notNull(),
    esBebida: boolean("es_bebida").notNull().default(false),
    esFit: boolean("es_fit").notNull().default(false),
    esMascota: boolean("es_mascota").notNull().default(false),
    aptoEvento: boolean("apto_evento").notNull().default(true),

    /**
     * INTERNO. Nunca se selecciona en queries publicas
     * (docs/CONTEXT.md §5).
     */
    foodCostPct: integer("food_cost_pct_x10"),
    unidades2026: integer("unidades_2026"),

    activo: boolean("activo").notNull().default(true),
    orden: integer("orden").notNull().default(0),
  },
  (t) => ({
    porCategoria: index("menu_items_categoria_idx").on(t.categoria),
  }),
);

/* ------------------------------------------------------------- clientes -- */

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nombre: varchar("nombre", { length: 120 }).notNull(),
    /** Clave natural real: el email falta seguido, el telefono no. */
    telefonoE164: varchar("telefono_e164", { length: 20 }).notNull().unique(),
    email: varchar("email", { length: 160 }),
    notas: text("notas"),

    // Ley 8968: consentimiento explicito y baja de comunicaciones.
    consentMarketing: boolean("consent_marketing").notNull().default(false),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    porEmail: index("customers_email_idx").on(t.email),
  }),
);

export const customerTags = pgTable(
  "customer_tags",
  {
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    tag: varchar("tag", { length: 30 }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.customerId, t.tag] }) }),
);

/* ---------------------------------------------------------------- staff -- */

/**
 * Personal del CRM.
 *
 * La clave es el EMAIL, no el id de Neon Auth. Es un problema de arranque
 * real: hay que poder dar de alta a alguien y asignarle rol ANTES de que
 * entre por primera vez, y su id de autenticacion no existe hasta ese
 * momento. `authUserId` se completa en el primer login.
 */
export const staff = pgTable("staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Id en Neon Auth (Stack). Se llena en el primer inicio de sesion. */
  authUserId: text("auth_user_id").unique(),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull().unique(),
  rol: rolEnum("rol").notNull().default("anfitrion"),
  /** null para admin: ve todas las sucursales. */
  branchId: uuid("branch_id").references(() => branches.id),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------- reservas -- */

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Codigo corto que el cliente cita por WhatsApp. Ej. BH-7F3K2. */
    codigoPublico: varchar("codigo_publico", { length: 12 }).notNull().unique(),

    branchId: uuid("branch_id").notNull().references(() => branches.id),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    tipo: tipoReservaEnum("tipo").notNull().default("mesa"),

    // UTC. La ventana [startsAt, endsAt) es lo que impide el solape.
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    /** Dia de operacion en hora de Costa Rica; agrupa reportes. */
    fechaLocal: date("fecha_local").notNull(),
    franja: franjaEnum("franja").notNull(),
    duracionMin: integer("duracion_min").notNull(),

    numPersonas: integer("num_personas").notNull(),
    tableId: uuid("table_id").references(() => tables.id),

    estado: estadoReservaEnum("estado").notNull().default("pendiente"),
    source: sourceEnum("source").notNull().default("web"),
    ocasion: ocasionEnum("ocasion"),

    notasCliente: text("notas_cliente"),
    notasInternas: text("notas_internas"),
    ticketEstimadoCentimos: bigint("ticket_estimado_centimos", { mode: "number" }),

    /** Hash del token del link de cancelar/reprogramar. Nunca el token. */
    cancelTokenHash: varchar("cancel_token_hash", { length: 64 }),

    // Un timestamp por transicion, no solo `estado`: sin esto no hay lead
    // time ni tiempo de servicio, que son KPIs pedidos.
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    seatedAt: timestamp("seated_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    canceladoPor: canceladoPorEnum("cancelado_por"),
    motivoCancelacion: text("motivo_cancelacion"),
  },
  (t) => ({
    porSucursalFecha: index("reservations_branch_fecha_idx").on(t.branchId, t.fechaLocal),
    porFranja: index("reservations_franja_idx").on(t.fechaLocal, t.franja),
    porCliente: index("reservations_customer_idx").on(t.customerId),
    porEstado: index("reservations_estado_idx").on(t.estado),
    /**
     * Regla anti doble reserva (docs/CONTEXT.md §6): el mismo cliente no
     * puede tener dos reservas vivas en la misma franja y sucursal.
     */
    sinDuplicado: uniqueIndex("reservations_sin_duplicado_idx")
      .on(t.customerId, t.branchId, t.fechaLocal, t.franja)
      .where(sql`estado in ('pendiente','confirmada')`),
  }),
);

/* -------------------------------------------------------------- eventos -- */

export const packages = pgTable("packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 40 }).notNull().unique(),
  nombre: varchar("nombre", { length: 80 }).notNull(),
  descripcion: text("descripcion"),
  precioPpCentimos: bigint("precio_pp_centimos", { mode: "number" }).notNull(),
  minPersonas: integer("min_personas").notNull().default(8),
  incluyeJson: jsonb("incluye_json"),
  orden: integer("orden").notNull().default(0),
  activo: boolean("activo").notNull().default(true),
});

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reservationId: uuid("reservation_id").notNull().references(() => reservations.id, { onDelete: "cascade" }),

    ocasion: ocasionEnum("ocasion").notNull(),
    /** El cliente marco la fecha como flexible. */
    fechaFlexible: boolean("fecha_flexible").notNull().default(false),
    numPersonas: integer("num_personas").notNull(),
    presupuestoPpCentimos: bigint("presupuesto_pp_centimos", { mode: "number" }),
    packageId: uuid("package_id").references(() => packages.id),

    subtotalCentimos: bigint("subtotal_centimos", { mode: "number" }).notNull().default(0),
    // Las tasas se guardan en la fila: si manana sube el IVA, las
    // cotizaciones ya enviadas no pueden cambiar retroactivamente.
    ivaPct: integer("iva_pct").notNull().default(13),
    servicioPct: integer("servicio_pct").notNull().default(10),
    totalEstimadoCentimos: bigint("total_estimado_centimos", { mode: "number" }).notNull().default(0),
    totalConfirmadoCentimos: bigint("total_confirmado_centimos", { mode: "number" }),
    depositoCentimos: bigint("deposito_centimos", { mode: "number" }),
    depositoPagadoAt: timestamp("deposito_pagado_at", { withTimezone: true }),

    estadoPipeline: pipelineEnum("estado_pipeline").notNull().default("solicitud"),
    /** Pondera el valor del pipeline por etapa. */
    probabilidadPct: integer("probabilidad_pct").notNull().default(10),
    asignadoA: uuid("asignado_a").references(() => staff.id),
    /** El dato mas valioso del CRM y el que siempre se olvida modelar. */
    motivoPerdida: text("motivo_perdida"),

    preferenciaContacto: varchar("preferencia_contacto", { length: 20 }),
    /** Copia inmutable de la cotizacion enviada, para el PDF. */
    cotizacionSnapshotJson: jsonb("cotizacion_snapshot_json"),

    fechaConfirmacion: timestamp("fecha_confirmacion", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    porPipeline: index("events_pipeline_idx").on(t.estadoPipeline),
    porReserva: uniqueIndex("events_reservation_idx").on(t.reservationId),
  }),
);

/**
 * Items de la cotizacion, con el precio congelado al momento de cotizar.
 * Tabla y no JSON: hay que agregar por plato para saber que se vende en
 * eventos, y el precio no puede moverse cuando cambie el menu.
 */
export const eventItems = pgTable(
  "event_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    menuItemId: uuid("menu_item_id").references(() => menuItems.id),
    /** Copia del nombre: si el item se borra del menu, la cotizacion sigue legible. */
    nombreSnapshot: varchar("nombre_snapshot", { length: 120 }).notNull(),
    cantidad: integer("cantidad").notNull().default(1),
    precioUnitarioCentimos: bigint("precio_unitario_centimos", { mode: "number" }).notNull(),
  },
  (t) => ({ porEvento: index("event_items_event_idx").on(t.eventId) }),
);

export const eventActivity = pgTable(
  "event_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    tipo: varchar("tipo", { length: 30 }).notNull(),
    contenido: text("contenido"),
    autorId: uuid("autor_id").references(() => staff.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ porEvento: index("event_activity_event_idx").on(t.eventId, t.createdAt) }),
);

/* ------------------------------------------------------------ operacion -- */

export const blackoutDates = pgTable(
  "blackout_dates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    fecha: date("fecha").notNull(),
    /** null = el dia entero. Permite cerrar solo una franja. */
    franja: franjaEnum("franja"),
    tipo: blackoutTipoEnum("tipo").notNull().default("cierre_total"),
    /** Para `capacidad_reducida`: el tope que reemplaza al normal. */
    capacidadOverride: integer("capacidad_override"),
    motivo: text("motivo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ porSucursalFecha: index("blackout_branch_fecha_idx").on(t.branchId, t.fecha) }),
);

/** Evita mandar dos veces el mismo recordatorio y hace debuggeable a Resend. */
export const notificationsLog = pgTable(
  "notifications_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reservationId: uuid("reservation_id").references(() => reservations.id, { onDelete: "cascade" }),
    tipo: varchar("tipo", { length: 40 }).notNull(),
    canal: varchar("canal", { length: 20 }).notNull().default("email"),
    estado: varchar("estado", { length: 20 }).notNull().default("pendiente"),
    providerMessageId: varchar("provider_message_id", { length: 120 }),
    error: text("error"),
    enviadoAt: timestamp("enviado_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    /** Idempotencia: un tipo de notificacion por reserva. */
    unaPorTipo: uniqueIndex("notifications_reserva_tipo_idx").on(t.reservationId, t.tipo),
  }),
);

/** Hay depositos y dinero de por medio. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tabla: varchar("tabla", { length: 60 }).notNull(),
    registroId: uuid("registro_id").notNull(),
    accion: varchar("accion", { length: 20 }).notNull(),
    actorId: uuid("actor_id").references(() => staff.id),
    diffJson: jsonb("diff_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ porRegistro: index("audit_registro_idx").on(t.tabla, t.registroId) }),
);

/* ------------------------------------------------------------ relations -- */

export const branchesRelations = relations(branches, ({ many }) => ({
  horarios: many(branchHours),
  capacidades: many(branchSlotCapacity),
  mesas: many(tables),
  reservas: many(reservations),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  branch: one(branches, { fields: [reservations.branchId], references: [branches.id] }),
  customer: one(customers, { fields: [reservations.customerId], references: [customers.id] }),
  mesa: one(tables, { fields: [reservations.tableId], references: [tables.id] }),
  evento: one(events, { fields: [reservations.id], references: [events.reservationId] }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  reserva: one(reservations, { fields: [events.reservationId], references: [reservations.id] }),
  paquete: one(packages, { fields: [events.packageId], references: [packages.id] }),
  items: many(eventItems),
  actividad: many(eventActivity),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  reservas: many(reservations),
  tags: many(customerTags),
}));
