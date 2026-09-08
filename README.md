# Bread House — Reservas y CRM

Sistema de reservas y CRM para **Bread House**, bistró & café con cuatro
sucursales en Costa Rica (Escazú, Pinares/Curridabat, Cartago y Mall San Pedro).

Dos superficies:

- **App pública** (`/reservar`) — reserva de mesa (1–7 personas) o cotización de
  evento privado (8+ personas).
- **CRM interno** (`/admin`) — calendario, vista de servicio, pipeline de
  eventos, base de clientes y dashboard de KPIs.

Todo en español (`es-CR`), zona horaria `America/Costa_Rica`, moneda CRC.

---

## Estado

| Fase | Alcance | Estado |
|---|---|---|
| 0 | Documentos fuente, `CONTEXT.md`, modelo de datos, plan | ✅ |
| 1 | Setup, esquema, seed, design tokens, primitivas de UI | ✅ |
| — | Base Neon aprovisionada, esquema aplicado, seed cargado | ✅ |
| — | Deploy en Vercel | ⬜ pendiente de importar el repo |
| 2 | Motor de disponibilidad + flujo público de mesa + correos | ✅ |
| 3 | Flujo público de eventos + cotizador | ✅ |
| 4 | CRM: auth, calendario, vista de día | ✅ |
| 5 | Pipeline de eventos + cotización en PDF | ✅ |
| 6 | Dashboard de métricas y KPIs | ✅ |
| 7 | Clientes, endpoint para Pani, notificaciones | ✅ |

La fuente de verdad del negocio es [`docs/CONTEXT.md`](docs/CONTEXT.md). El plan
y las decisiones técnicas están en [`docs/PLAN.md`](docs/PLAN.md).

---

## Stack

- **Next.js 15** (App Router) · TypeScript · React 19
- **Neon** (Lakebase Postgres) con **Drizzle** como ORM
- **Tailwind CSS v4** — tokens declarados con `@theme` en `app/globals.css`
- **Vitest** para la lógica de negocio
- Deploy en **Vercel**

---

## Setup local

```bash
pnpm install
cp .env.example .env.local     # completá DATABASE_URL y DATABASE_URL_UNPOOLED
pnpm db:migrate                # aplica el esquema
pnpm db:seed                   # carga sucursales, menú y paquetes reales
pnpm dev
```

### Base de datos

Hacen falta **dos** cadenas de conexión de Neon:

| Variable | Cuál | Para qué |
|---|---|---|
| `DATABASE_URL` | **pooled** (hostname con `-pooler`) | la aplicación |
| `DATABASE_URL_UNPOOLED` | **directa** (sin `-pooler`) | migraciones y seed |

Correr migraciones sobre la conexión pooled falla de formas que no mencionan el
pooling: PgBouncer corre en modo transacción y no soporta las sentencias de
sesión que emite `drizzle-kit`.

La base ya está aprovisionada: proyecto Neon `bh-reservas`
(`summer-smoke-58039751`), base `bh_reservas`, Postgres 17 en `aws-us-east-1`. El esquema está
aplicado y el seed cargado — las cadenas se copian de
[console.neon.tech](https://console.neon.tech).

### Verificar que el despliegue quedó conectado

`GET /api/health` responde con los conteos reales de la base:

```json
{ "estado": "ok", "base": "neon",
  "conteos": { "sucursales": 4, "menuItems": 124, "paquetes": 4, "franjas": 4 },
  "seedCompleto": true }
```

Un build verde no dice nada del enlace a Postgres — Next compila sin base. Este endpoint sí.

### Deploy en Vercel

1. Importar `jcartinmnz/BH-Reservas-landing-dashboard` desde el dashboard de Vercel.
   Se autodetecta como Next.js.
2. Cargar las variables de entorno de `.env.example` — como mínimo `DATABASE_URL`.
3. Confirmar con `GET /api/health` que `seedCompleto` es `true`.

### Rutas

**Público**

| Ruta | Qué es |
|---|---|
| `/reservar` | Entrada: mesa o evento |
| `/reservar/mesa` | Wizard de reserva (1–7 personas) |
| `/reservar/evento` | Cotizador de eventos (8+ personas) |
| `/reservar/confirmacion/[codigo]` | Confirmación con el código |
| `/reservar/gestionar/[token]` | Cancelar sin login, por token firmado |

**CRM** (`/admin`, requiere sesión y estar en `staff`)

| Ruta | Qué es |
|---|---|
| `/admin` | Calendario mensual con filtros |
| `/admin/dia` | Vista de servicio por franja, para tablet |
| `/admin/eventos` | Pipeline kanban |
| `/admin/eventos/[id]` | Detalle, cotización editable, actividad, depósito |
| `/admin/eventos/[id]/pdf` | Cotización en PDF |
| `/admin/clientes` | Base de clientes, export con consentimiento |
| `/admin/metricas` | Dashboard de KPIs |

**API**

| Ruta | Qué es |
|---|---|
| `GET /api/health` | Conexión a la base y estado del seed |
| `POST /api/reservations/external` | Alta de reservas desde Pani (header `x-api-key`) |
| `GET /api/cron/recordatorios` | Recordatorios 24h y 2h (Vercel Cron cada 15 min) |

### Integración con Pani

```bash
curl -X POST https://<dominio>/api/reservations/external \
  -H "x-api-key: $PANI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sucursalSlug": "escazu",
    "fechaLocal": "2026-10-15",
    "hora": "13:00",
    "numPersonas": 4,
    "nombre": "María Rodríguez",
    "telefono": "8888-7777",
    "source": "whatsapp_pani"
  }'
```

Pasa por la misma validación de disponibilidad y las mismas constraints que el
flujo web: un canal externo no puede saltarse la capacidad de una franja.
Devuelve `409` cuando el horario ya no está libre — los datos venían bien, lo que
cambió es el estado del mundo.

### Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | servidor de desarrollo |
| `pnpm build` | build de producción |
| `pnpm test` | tests de lógica de negocio |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:generate` | genera migración desde el esquema |
| `pnpm db:migrate` | aplica migraciones |
| `pnpm db:seed` | carga los datos reales de `docs/` |
| `pnpm db:studio` | explorador de la base |

---

## Arquitectura

```
app/                 rutas (Server Components por defecto)
components/ui/       primitivas de UI
data/                datos reales extraídos de docs/
  sucursales.ts        4 sucursales, horarios, capacidades
  menu.ts              124 ítems con precio y clasificación
  paquetes.ts          paquetes y extras de evento
  politicas.ts         reglas de reserva y evento
lib/
  db/schema.ts         esquema Drizzle
  franjas.ts           las 4 franjas horarias
  money.ts             CRC en céntimos enteros
  datetime.ts          UTC ↔ America/Costa_Rica
drizzle/             migraciones SQL
docs/                fuente de verdad del negocio
tests/               tests de lógica de negocio
```

### Decisiones que conviene conocer antes de tocar el código

**Dinero en céntimos enteros.** Nunca `float`. Una cotización de evento no
puede descuadrar por redondeo. El formato `₡12.500` se reconstruye desde
`Intl.formatToParts` porque el ICU de Node separa miles con espacio fino en
`es-CR`, no con punto.

**Tiempo en UTC, con `fecha_local` al lado.** Las reservas guardan
`starts_at`/`ends_at` en `timestamptz` más un `date` local, para agrupar
reportes por día de operación sin convertir zona en cada query.

**El solape lo impide la base, no la aplicación.** `reservations` lleva un
`EXCLUDE USING gist` sobre `(table_id, tstzrange(starts_at, ends_at))`.
Verificar disponibilidad y después insertar no es atómico: sin esa constraint,
dos requests concurrentes asignan la misma mesa.

**Los acentos de marca son solo fondo.** `#FFF042` y `#38B6AB` como color de
texto sobre blanco dan 1,2:1 y 2,3:1 — los dos reprueban WCAG AA. Los tokens se
llaman `accent-bg` / `accent-on` para que usarlos mal se note.

**`food_cost_pct` no sale nunca al cliente.** Es dato interno de la ingeniería
de menú: ordena las sugerencias del cotizador en el servidor, pero no viaja al
navegador. Toda ruta pública pasa por `aVistaPublica()`.

**Autenticar no es autorizar.** Neon Auth dice *quién* es la persona; la tabla
`staff` dice *qué* puede hacer. Lograr iniciar sesión no da acceso: si el correo
no está en `staff`, no entra. El alcance por sucursal se aplica en todas las
consultas del CRM, no solo donde se ve la lista.

**Los colores de los gráficos no son los de marca.** `#FFF042` sobre blanco da
1,2:1 y es invisible como marca de dato; `#38B6AB` queda debajo del piso de
croma y lee como gris. La paleta de `lib/charts/paleta.ts` se derivó del teal de
marca y se validó contra las seis verificaciones (luminosidad, croma,
separación en daltonismo, visión normal, contraste).

---

## Datos pendientes

El sistema no inventa datos de negocio. Lo que falta está registrado en
[`docs/CONTEXT.md`](docs/CONTEXT.md) §10 — entre otros: el desglose de mesas por
sucursal, las direcciones, los precios de BH Fit x Perform y del menú para
mascotas, y la franja de la ventana 20:00–21:00.
