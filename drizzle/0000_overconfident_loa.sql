CREATE TYPE "public"."blackout_tipo" AS ENUM('cierre_total', 'privatizacion', 'feriado', 'capacidad_reducida');--> statement-breakpoint
CREATE TYPE "public"."cancelado_por" AS ENUM('cliente', 'staff', 'sistema');--> statement-breakpoint
CREATE TYPE "public"."clasificacion" AS ENUM('estrella', 'puzzle', 'caballo', 'perro');--> statement-breakpoint
CREATE TYPE "public"."estado_reserva" AS ENUM('pendiente', 'confirmada', 'sentada', 'completada', 'cancelada', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."franja" AS ENUM('cafe_brunch', 'fast_lunch', 'tardeada_social', 'social_pesada');--> statement-breakpoint
CREATE TYPE "public"."ocasion" AS ENUM('cumpleanos', 'baby_shower', 'bridal_shower', 'almuerzo_corporativo', 'despedida_soltero', 'aniversario', 'te_de_cocina', 'reunion_especial', 'graduacion', 'revelacion_sexo', 'taller_comunitario', 'otro');--> statement-breakpoint
CREATE TYPE "public"."estado_pipeline" AS ENUM('solicitud', 'contactado', 'cotizacion_enviada', 'negociacion', 'confirmado', 'realizado', 'perdido');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('admin', 'gerente_sucursal', 'anfitrion');--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('web', 'whatsapp_pani', 'instagram', 'telefono', 'walk_in');--> statement-breakpoint
CREATE TYPE "public"."tipo_reserva" AS ENUM('mesa', 'evento');--> statement-breakpoint
CREATE TYPE "public"."zona" AS ENUM('interior', 'terraza', 'privado');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tabla" varchar(60) NOT NULL,
	"registro_id" uuid NOT NULL,
	"accion" varchar(20) NOT NULL,
	"actor_id" uuid,
	"diff_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blackout_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"franja" "franja",
	"tipo" "blackout_tipo" DEFAULT 'cierre_total' NOT NULL,
	"capacidad_override" integer,
	"motivo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"dia_semana" smallint NOT NULL,
	"abre" time NOT NULL,
	"cierra" time NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_slot_capacity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"franja" "franja" NOT NULL,
	"dia_semana" smallint NOT NULL,
	"capacidad_max" integer,
	"activa" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(40) NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"concepto_zona" varchar(120),
	"direccion" text,
	"telefono" varchar(20),
	"capacidad_total" integer NOT NULL,
	"capacidad_max_evento" integer NOT NULL,
	"capacidad_salon_privado" integer,
	"tiene_bh_fit" boolean,
	"duracion_default_min" integer DEFAULT 90 NOT NULL,
	"duracion_grupo_grande_min" integer DEFAULT 120 NOT NULL,
	"anticipacion_min_mesa_horas" integer DEFAULT 3 NOT NULL,
	"anticipacion_min_evento_horas" integer DEFAULT 72 NOT NULL,
	"anticipacion_max_dias" integer DEFAULT 90 NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "customer_tags" (
	"customer_id" uuid NOT NULL,
	"tag" varchar(30) NOT NULL,
	CONSTRAINT "customer_tags_customer_id_tag_pk" PRIMARY KEY("customer_id","tag")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"telefono_e164" varchar(20) NOT NULL,
	"email" varchar(160),
	"notas" text,
	"consent_marketing" boolean DEFAULT false NOT NULL,
	"consent_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_telefono_e164_unique" UNIQUE("telefono_e164")
);
--> statement-breakpoint
CREATE TABLE "event_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"contenido" text,
	"autor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"menu_item_id" uuid,
	"nombre_snapshot" varchar(120) NOT NULL,
	"cantidad" integer DEFAULT 1 NOT NULL,
	"precio_unitario_centimos" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"ocasion" "ocasion" NOT NULL,
	"fecha_flexible" boolean DEFAULT false NOT NULL,
	"num_personas" integer NOT NULL,
	"presupuesto_pp_centimos" bigint,
	"package_id" uuid,
	"subtotal_centimos" bigint DEFAULT 0 NOT NULL,
	"iva_pct" integer DEFAULT 13 NOT NULL,
	"servicio_pct" integer DEFAULT 10 NOT NULL,
	"total_estimado_centimos" bigint DEFAULT 0 NOT NULL,
	"total_confirmado_centimos" bigint,
	"deposito_centimos" bigint,
	"deposito_pagado_at" timestamp with time zone,
	"estado_pipeline" "estado_pipeline" DEFAULT 'solicitud' NOT NULL,
	"probabilidad_pct" integer DEFAULT 10 NOT NULL,
	"asignado_a" uuid,
	"motivo_perdida" text,
	"preferencia_contacto" varchar(20),
	"cotizacion_snapshot_json" jsonb,
	"fecha_confirmacion" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"descripcion" text,
	"categoria" varchar(40) NOT NULL,
	"precio_centimos" bigint NOT NULL,
	"clasificacion" "clasificacion" NOT NULL,
	"es_bebida" boolean DEFAULT false NOT NULL,
	"es_fit" boolean DEFAULT false NOT NULL,
	"es_mascota" boolean DEFAULT false NOT NULL,
	"apto_evento" boolean DEFAULT true NOT NULL,
	"food_cost_pct_x10" integer,
	"unidades_2026" integer,
	"activo" boolean DEFAULT true NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "menu_items_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "notifications_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid,
	"tipo" varchar(40) NOT NULL,
	"canal" varchar(20) DEFAULT 'email' NOT NULL,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"provider_message_id" varchar(120),
	"error" text,
	"enviado_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(40) NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"descripcion" text,
	"precio_pp_centimos" bigint NOT NULL,
	"min_personas" integer DEFAULT 8 NOT NULL,
	"incluye_json" jsonb,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "packages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo_publico" varchar(12) NOT NULL,
	"branch_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"tipo" "tipo_reserva" DEFAULT 'mesa' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"fecha_local" date NOT NULL,
	"franja" "franja" NOT NULL,
	"duracion_min" integer NOT NULL,
	"num_personas" integer NOT NULL,
	"table_id" uuid,
	"estado" "estado_reserva" DEFAULT 'pendiente' NOT NULL,
	"source" "source" DEFAULT 'web' NOT NULL,
	"ocasion" "ocasion",
	"notas_cliente" text,
	"notas_internas" text,
	"ticket_estimado_centimos" bigint,
	"cancel_token_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"seated_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelado_por" "cancelado_por",
	"motivo_cancelacion" text,
	CONSTRAINT "reservations_codigo_publico_unique" UNIQUE("codigo_publico")
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"email" varchar(160) NOT NULL,
	"rol" "rol" DEFAULT 'anfitrion' NOT NULL,
	"branch_id" uuid,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"nombre" varchar(40) NOT NULL,
	"capacidad_min" integer NOT NULL,
	"capacidad_max" integer NOT NULL,
	"zona" "zona" DEFAULT 'interior' NOT NULL,
	"combinable" boolean DEFAULT false NOT NULL,
	"activa" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_staff_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blackout_dates" ADD CONSTRAINT "blackout_dates_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_hours" ADD CONSTRAINT "branch_hours_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_slot_capacity" ADD CONSTRAINT "branch_slot_capacity_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_activity" ADD CONSTRAINT "event_activity_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_activity" ADD CONSTRAINT "event_activity_autor_id_staff_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_items" ADD CONSTRAINT "event_items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_items" ADD CONSTRAINT "event_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_asignado_a_staff_id_fk" FOREIGN KEY ("asignado_a") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications_log" ADD CONSTRAINT "notifications_log_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tables" ADD CONSTRAINT "tables_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_registro_idx" ON "audit_log" USING btree ("tabla","registro_id");--> statement-breakpoint
CREATE INDEX "blackout_branch_fecha_idx" ON "blackout_dates" USING btree ("branch_id","fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_hours_branch_dia_idx" ON "branch_hours" USING btree ("branch_id","dia_semana");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_slot_capacity_idx" ON "branch_slot_capacity" USING btree ("branch_id","franja","dia_semana");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "event_activity_event_idx" ON "event_activity" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE INDEX "event_items_event_idx" ON "event_items" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "events_pipeline_idx" ON "events" USING btree ("estado_pipeline");--> statement-breakpoint
CREATE UNIQUE INDEX "events_reservation_idx" ON "events" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "menu_items_categoria_idx" ON "menu_items" USING btree ("categoria");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_reserva_tipo_idx" ON "notifications_log" USING btree ("reservation_id","tipo");--> statement-breakpoint
CREATE INDEX "reservations_branch_fecha_idx" ON "reservations" USING btree ("branch_id","fecha_local");--> statement-breakpoint
CREATE INDEX "reservations_franja_idx" ON "reservations" USING btree ("fecha_local","franja");--> statement-breakpoint
CREATE INDEX "reservations_customer_idx" ON "reservations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "reservations_estado_idx" ON "reservations" USING btree ("estado");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_sin_duplicado_idx" ON "reservations" USING btree ("customer_id","branch_id","fecha_local","franja") WHERE estado in ('pendiente','confirmada');--> statement-breakpoint
CREATE INDEX "tables_branch_idx" ON "tables" USING btree ("branch_id");--> statement-breakpoint
-- ===========================================================================
-- Integridad de solape a nivel de base de datos.
--
-- Sin esto, dos requests concurrentes pueden asignar la misma mesa al mismo
-- horario: chequear disponibilidad y despues insertar no es atomico. El
-- EXCLUDE hace que Postgres rechace el segundo insert, sin importar cuantas
-- instancias serverless corran en paralelo.
--
-- Solo aplica a reservas vivas: una cancelada o un no-show liberan la mesa.
-- Y solo cuando hay mesa asignada — mientras el desglose de mesas no exista
-- (supuesto S-1), table_id va nulo y el motor valida por capacidad de franja.
-- ===========================================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_sin_solape_mesa"
  EXCLUDE USING gist (
    "table_id" WITH =,
    tstzrange("starts_at", "ends_at") WITH &&
  )
  WHERE ("table_id" IS NOT NULL AND "estado" IN ('pendiente','confirmada','sentada'));--> statement-breakpoint
-- Una reserva no puede terminar antes de empezar.
ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_ventana_valida" CHECK ("ends_at" > "starts_at");--> statement-breakpoint
-- Grupos de mesa: 1 a 7 personas. 8 o mas es evento (docs/CONTEXT.md §6).
ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_tamano_grupo" CHECK (
    ("tipo" = 'mesa' AND "num_personas" BETWEEN 1 AND 7)
    OR ("tipo" = 'evento' AND "num_personas" >= 8)
  );--> statement-breakpoint
-- El dinero no puede ser negativo.
ALTER TABLE "events"
  ADD CONSTRAINT "events_montos_no_negativos" CHECK (
    "subtotal_centimos" >= 0
    AND "total_estimado_centimos" >= 0
    AND ("total_confirmado_centimos" IS NULL OR "total_confirmado_centimos" >= 0)
    AND ("deposito_centimos" IS NULL OR "deposito_centimos" >= 0)
  );--> statement-breakpoint
ALTER TABLE "events"
  ADD CONSTRAINT "events_probabilidad_rango" CHECK ("probabilidad_pct" BETWEEN 0 AND 100);--> statement-breakpoint
ALTER TABLE "menu_items"
  ADD CONSTRAINT "menu_items_precio_no_negativo" CHECK ("precio_centimos" >= 0);--> statement-breakpoint
ALTER TABLE "branch_hours"
  ADD CONSTRAINT "branch_hours_dia_valido" CHECK ("dia_semana" BETWEEN 0 AND 6);--> statement-breakpoint
ALTER TABLE "branch_slot_capacity"
  ADD CONSTRAINT "branch_slot_capacity_dia_valido" CHECK ("dia_semana" BETWEEN 0 AND 6);
