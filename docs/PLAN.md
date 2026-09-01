# Bread House — Plan de implementación y modelo de datos

> **Estado:** propuesta Fase 0, pendiente de aprobación.
> **Bloqueo activo:** no existe el contenido de `docs/` (menú, libro de marca, sucursales).
> Sin esos archivos no se puede generar `docs/CONTEXT.md` ni `data/seed.ts` con datos reales.

---

## 1. Decisiones técnicas

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
- **No ata la decisión de proveedor.** Funciona igual sobre Supabase o sobre Neon.

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
| **0** | Lectura de `docs/`, `CONTEXT.md`, modelo de datos, plan | Este documento aprobado + `docs/CONTEXT.md` |
| **1** | Setup Next 15, esquema Drizzle + RLS, seed con datos reales, design tokens, primitivas de UI | `pnpm build` verde, migración aplicada, seed cargado |
| **2a** | Motor de disponibilidad en `lib/availability/` con tests unitarios | Suite de tests cubriendo capacidad, solapes, blackouts, anticipación |
| **2b** | Wizard público de reserva de mesa + correos de confirmación | Reserva end-to-end desde móvil, correo recibido |
| **3** | Flujo público de eventos + cotizador con recálculo en vivo | Cotización generada, evento en `solicitud`, correos |
| **4** | CRM: auth, calendario, vista de día, detalle de reserva | Login por rol, calendario con filtros, acciones de estado |
| **5** | Pipeline kanban + cotización final en PDF | Arrastrar entre etapas, PDF con marca BH |
| **6** | Dashboard de métricas y KPIs | Todos los KPIs del brief, delta vs. período anterior, export |
| **7** | Clientes, `POST /api/reservations/external` para Pani, notificaciones, deploy | Endpoint con API key, recordatorios programados, producción |

Al cerrar cada fase: demo de lo que quedó funcionando, `build` corrido, y espera de visto bueno.

---

## 4. Datos que faltan para desbloquear la Fase 0

Sin esto no arranca nada que dependa de datos reales:

1. **Menú completo** — categorías, platos, descripciones y precios vigentes; línea BH Fit x Perform;
   menú para mascotas.
2. **Libro de marca** — paleta 2026 si existe (si no, se confirma la base 2022: `#000000`,
   `#FFF042`, `#38B6AB`, Montserrat), tipografías con pesos, archivos de logo, tono de voz.
3. **Sucursales** (Escazú, Pinares/Curridabat, Cartago, Mall San Pedro) — dirección, teléfono,
   horario por día, capacidad total, capacidad máxima para eventos.
4. **Mesas por sucursal** — nombre/número, capacidad mínima y máxima, zona.
5. **Paquetes de evento** — si ya existen definidos comercialmente, o si hay que derivarlos de los
   precios del menú.
6. **Política de depósito** — porcentaje o monto fijo para confirmar un evento.
7. **Capacidad máxima por franja** por sucursal (si no está documentada, se deriva de las mesas).
