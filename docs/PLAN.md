# Bread House — Plan de implementación y modelo de datos

> **Estado:** Fase 0 completa, **pendiente del visto bueno para arrancar la Fase 1.**
> Los documentos fuente ya están en `docs/` y consolidados en `docs/CONTEXT.md`.

---

## 1. Decisiones técnicas

### Base de datos: **Neon (Lakebase Postgres)**

Decidido el 2026-09-01. Reemplaza a Supabase, que era lo que pedía el brief original.

Consecuencias sobre el brief:

- **Auth:** Neon Auth en lugar de Supabase Auth para el login del CRM. Los tres roles
  (`admin`, `gerente_sucursal`, `anfitrion`) viven en la tabla `staff` y las políticas RLS leen el
  claim del JWT de Neon Auth, no `auth.uid()` de Supabase.
- **Storage:** Neon Object Storage (S3-compatible) para fotos de sucursal, fotos de plato y los PDF
  de cotización.
- **Driver:** `@neondatabase/serverless` sobre HTTP en las rutas serverless de Vercel, con conexión
  pooled. Conexión directa solo para migraciones.
- **Ventaja operativa concreta:** una **rama de base de datos por PR**. Las migraciones del esquema
  se prueban contra una copia real sin tocar producción, que importa en un sistema donde el motor de
  disponibilidad depende de constraints a nivel de base.

### ORM: **Drizzle**

Justificación:

- **El motor de disponibilidad es SQL-pesado.** Detectar solapes de reservas, respetar capacidad por
  franja y calcular ocupación requiere rangos de tiempo (`tstzrange`), `EXCLUDE` constraints y
  agregaciones por franja/día. Con Prisma eso termina en `$queryRaw`, que pierde el tipado justo en
  la parte más delicada del sistema. Drizzle mantiene tipos sobre SQL cercano al que uno escribiría
  a mano.
- **Costo en serverless.** Prisma arrastra un engine binario; en Vercel eso pesa en tamaño de bundle
  y en cold start. Drizzle es solo TypeScript.
- **Migraciones revisables.** `drizzle-kit` emite SQL en texto plano, que se lee en el PR. Importa en
  un proyecto con RLS, donde las políticas son parte del esquema.
- **Encaja con Neon.** Es el ORM de primera clase del ecosistema Neon y funciona con el driver HTTP
  serverless sin adaptadores.

Contras asumidos: ecosistema menos "batteries included" que Prisma (studio, seeding, generadores).

### Formato de dinero

Enteros en **céntimos de CRC** (`bigint`), nunca `float`. Formateo `₡12.500` en una única utilidad
`lib/format/currency.ts`. USD solo como referencia visual, con tipo de cambio guardado en el momento
de la cotización (no en vivo, o el PDF deja de cuadrar).

### Tiempo

Todo `timestamptz` en UTC. Cada reserva guarda además `fecha_local` (`date`) derivada en
`America/Costa_Rica`, para agrupar reportes sin pelear con la conversión en cada query. Sin DST en
Costa Rica, pero el patrón se mantiene por corrección.

---

## 2. Modelo de datos propuesto

Base la del brief, con los ajustes que siguen. Cada cambio lleva su razón.

### 2.1 Catálogo y sucursales

```
branches            id, nombre, slug, direccion, telefono, lat, lng,
                    capacidad_total, capacidad_max_evento, activa,
                    duracion_default_min, duracion_grupo_grande_min,
                    anticipacion_min_mesa_horas, anticipacion_min_evento_horas,
                    anticipacion_max_dias

branch_hours        id, branch_id, dia_semana (0-6), abre, cierra
```

**Cambio:** `horarios_json` se normaliza a `branch_hours`. El wizard consulta horarios en cada paso
de fecha y hora; con JSON eso no se puede indexar ni filtrar en SQL. Los parámetros de negocio
(duraciones, anticipaciones) bajan a la sucursal porque el brief los pide configurables por sucursal.

```
franjas             (catálogo, enum + tabla)
                    codigo (cafe_brunch|fast_lunch|tardeada_social|social_pesada),
                    nombre, hora_inicio, hora_fin, orden

branch_slot_capacity  id, branch_id, franja, dia_semana,
                      capacidad_max, activa
```

**Cambio:** `time_slots` del brief mezcla dos cosas distintas — la definición de negocio de la franja
(global, estable) y la capacidad operativa (varía por sucursal **y** por día de la semana). Separarlas
permite, por ejemplo, que Escazú tenga más cupo en Social Pesada el viernes que Cartago el martes.
La franja como entidad de primera clase es además lo que habilita el análisis del CRM que pide el
brief (foco en Tardeada Social).

```
tables              id, branch_id, nombre, capacidad_min, capacidad_max,
                    zona (interior|terraza|privado), combinable, activa
```

**Cambio:** `combinable` — para grupos que no entran en una sola mesa. Sin esto la asignación
automática falla en el borde de 6–7 personas.

### 2.2 Menú

```
menu_categories     id, nombre, orden, activa
menu_items          id, category_id, nombre, descripcion, precio_centimos,
                    es_fit, es_mascota, apto_evento, activo, orden
```

**Cambio (adición):** el brief no lo lista, pero el cotizador de eventos y la personalización de
paquetes necesitan el menú **en base de datos**, no en un seed estático. El admin va a querer
cambiar precios sin redeploy. `es_fit` marca la línea BH Fit x Perform; `es_mascota` el menú para
mascotas; `apto_evento` filtra lo que puede entrar en un paquete.

### 2.3 Clientes

```
customers           id, nombre, telefono_e164 (unique), email, notas,
                    consent_marketing, consent_at, unsubscribed_at,
                    created_at, updated_at

customer_tags       customer_id, tag (vip|recurrente|corporativo)
```

**Cambios:**

- `telefono_e164` normalizado y único: es la clave natural real, el email falta seguido.
- `total_reservas` / `total_no_shows` **salen de la tabla**. Como columnas denormalizadas se
  desincronizan en cuanto haya una cancelación editada a mano. Se calculan en una vista
  `customer_stats` (materializada si el volumen lo pide).
- `consent_*` y `unsubscribed_at`: Ley 8968 — consentimiento explícito y baja de comunicaciones.

### 2.4 Reservas

```
reservations        id, codigo_publico (unique, ej. BH-7F3K2),
                    branch_id, customer_id, tipo (mesa|evento),
                    starts_at (timestamptz), ends_at (timestamptz),
                    fecha_local (date), franja, duracion_min,
                    num_personas, table_id, estado, source, ocasion,
                    notas_cliente, notas_internas, ticket_estimado_centimos,
                    cancel_token_hash,
                    created_at, confirmed_at, seated_at, completed_at,
                    cancelled_at, cancelled_by, motivo_cancelacion
```

**Cambios:**

- `fecha` + `hora` sueltos → `starts_at` / `ends_at` en UTC. Es lo que permite detectar solapes con un
  `EXCLUDE USING gist (table_id WITH =, tstzrange(starts_at, ends_at) WITH &&)`, es decir: la base
  garantiza que una mesa no se reserve dos veces, en vez de confiar en la lógica de aplicación.
- **Timestamps por transición** en vez de solo `estado`. Sin `confirmed_at` y `seated_at` no se puede
  calcular lead time real ni tiempo de servicio, y ambos son KPIs pedidos.
- `codigo_publico`: el cliente lo cita por WhatsApp; un UUID no sirve para eso.
- `cancel_token_hash`: se guarda el hash, nunca el token del link firmado.
- `cancelled_by` / `motivo_cancelacion`: distingue cancelación del cliente de la del staff.
- **Anti doble reserva** (regla del brief) como índice único parcial:
  `UNIQUE (customer_id, branch_id, fecha_local, franja) WHERE estado IN ('pendiente','confirmada')`.

### 2.5 Eventos

```
packages            id, nombre, descripcion, precio_pp_centimos,
                    min_personas, incluye_json, activo

events              id, reservation_id, ocasion, fecha_flexible,
                    presupuesto_pp_centimos, num_personas, package_id,
                    subtotal_centimos, iva_pct, servicio_pct,
                    total_estimado_centimos, total_confirmado_centimos,
                    deposito_centimos, deposito_pagado_at,
                    estado_pipeline, probabilidad_pct, asignado_a,
                    motivo_perdida, fecha_confirmacion,
                    cotizacion_snapshot_json, preferencia_contacto

event_items         id, event_id, menu_item_id, cantidad,
                    precio_unitario_centimos   -- snapshot al cotizar

event_activity      id, event_id, tipo, contenido, autor_id, created_at
```

**Cambios:**

- `items_json` → tabla `event_items`. Dos razones: hay que **congelar el precio** al momento de
  cotizar (el menú cambia y la cotización enviada debe seguir cuadrando), y hace falta agregar por
  plato para saber qué se vende en eventos. `cotizacion_snapshot_json` queda como copia inmutable de
  lo que se le mandó al cliente en PDF.
- `iva_pct` / `servicio_pct` **en la fila**, no hardcodeados: las tasas cambian y las cotizaciones
  viejas no deben mutar retroactivamente.
- `probabilidad_pct` por etapa: es lo que convierte "valor en pipeline" en un número accionable.
- `motivo_perdida`: el dato más valioso del CRM y el que siempre se olvida modelar.

### 2.6 Operación y soporte

```
staff               id (auth user id), nombre, email,
                    rol (admin|gerente_sucursal|anfitrion), branch_id, activo

blackout_dates      id, branch_id, fecha, franja (nullable), tipo
                    (cierre_total|privatizacion|feriado|capacidad_reducida),
                    capacidad_override, motivo

notifications_log   id, reservation_id, tipo, canal, estado,
                    provider_message_id, enviado_at, error

audit_log           id, tabla, registro_id, accion, actor_id, diff_json, created_at
```

**Cambios:**

- `staff` (adición): los tres roles del brief necesitan tabla; es además la base de las políticas RLS.
- `blackout_dates` gana `franja` y `tipo`: permite bloquear solo la Tardeada Social de un día sin
  cerrar la sucursal entera, que es exactamente el caso de una privatización de tarde.
- `notifications_log` (adición): evita mandar dos veces el recordatorio de 24h y hace debuggeable la
  integración con Resend.
- `audit_log` (adición): hay dinero y depósitos de por medio.

---

## 3. Plan por fases

El del brief, con dos ajustes: el motor de disponibilidad se separa como sub-fase propia con tests
(es el corazón del sistema y donde se concentran los bugs), y el PDF se decide antes de la Fase 5.

| Fase | Alcance | Entregable verificable |
|---|---|---|
| **0** | ✅ Lectura de `docs/`, `CONTEXT.md`, modelo de datos, plan | Hecho — falta el visto bueno |
| **1** | Setup Next 15, proyecto Neon, esquema Drizzle + RLS, seed con datos reales, design tokens, primitivas de UI | `pnpm build` verde, migración aplicada, seed cargado |
| **2a** | Motor de disponibilidad en `lib/availability/` con tests unitarios | Suite de tests cubriendo capacidad, solapes, blackouts, anticipación |
| **2b** | Wizard público de reserva de mesa + correos de confirmación | Reserva end-to-end desde móvil, correo recibido |
| **3** | Flujo público de eventos + cotizador con recálculo en vivo | Cotización generada, evento en `solicitud`, correos |
| **4** | CRM: auth, calendario, vista de día, detalle de reserva | Login por rol, calendario con filtros, acciones de estado |
| **5** | Pipeline kanban + cotización final en PDF | Arrastrar entre etapas, PDF con marca BH |
| **6** | Dashboard de métricas y KPIs | Todos los KPIs del brief, delta vs. período anterior, export |
| **7** | Clientes, `POST /api/reservations/external` para Pani, notificaciones, deploy | Endpoint con API key, recordatorios programados, producción |

Al cerrar cada fase: demo de lo que quedó funcionando, `build` corrido, y espera de visto bueno.

---

## 4. Estado de los datos

Los documentos fuente están en `docs/` y consolidados en `docs/CONTEXT.md`.

- **Resuelto:** horarios de las 4 sucursales, regla de capacidad 30% sáb–dom por franja, stack,
  menú completo (124 ítems con precio y clasificación), paleta y tipografía, políticas de mesa y
  evento, depósito 50%, extras, ocasiones.
- **Pendiente, no bloquea la Fase 1:** los 18 vacíos del registro `CONTEXT.md` §10. El más relevante
  es el desglose de mesas (C), cubierto por el supuesto S-1.
- **Bloquea la Fase 2b:** el vacío D — la ventana 20:00–21:00 no tiene franja asignada en las tres
  sucursales que cierran a las 21:00 de viernes a domingo. Hay que resolverlo antes de construir el
  grid de horas del wizard.
