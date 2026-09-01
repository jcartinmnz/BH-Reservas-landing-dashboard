# CONTEXT.md — Bread House

> **Fuente de verdad del proyecto.** Consolidado de `MENU.md`, `MARCA.md`, `SUCURSALES.md` y
> `POLITICAS.md`.
> ✅ = confirmado y usable en código. ⚠️ = **bloqueado, nadie lo puede inventar** (ver §10).

---

## 1. El negocio

✅ **Bread House** — bistró & café, 4 sucursales en Costa Rica.

✅ **Posicionamiento** (taller estratégico Mayo 2026): restaurante chic — experiencia real, operación
sencilla, producto de alto nivel.

✅ **Público objetivo:** mujeres 18–35, nivel socioeconómico medio-alto/alto.

✅ **Canal existente:** **Pani**, agente de WhatsApp con IA, en infraestructura separada. No se
reemplaza. El sistema expone `POST /api/reservations/external` con API key y guarda `source` para
medir su aporte por separado.

✅ **Dolor cuantificado:** ventas Ene–May 2026 vs. 2025 cayeron de ~130.286 a ~108.240 unidades
(**−17%**). Canal Uber también en caída.

---

## 2. Franjas horarias

✅ Cuatro franjas. Son entidad de primera clase en la base de datos y dimensión de análisis del CRM.

| Código | Franja | Horario | Estado |
|---|---|---|---|
| `cafe_brunch` | Café & Brunch | 07:00 – 12:00 | Fuerte |
| `fast_lunch` | Fast Lunch Premium | 12:00 – 15:00 | Fuerte |
| `tardeada_social` | Tardeada Social | 15:00 – 18:00 | **Perdida — objetivo de recuperación** |
| `social_pesada` | Social Pesada | 18:00 – 20:00 | Mujeres 23–38 |

**Dolores que el dashboard debe medir explícitamente:**

- Baja afluencia **lunes a jueves** → KPI por día de la semana, con esos días resaltados.
- **Franja 15–18h perdida** → KPI dedicado a Tardeada Social.
- Menú desmedido sin plato estrella claro (ver §5: 65% de la carta vende poco).

⚠️ Las franjas cubren 07:00–20:00, pero tres sucursales cierran a las 21:00 parte de la semana.
La ventana 20:00–21:00 no tiene franja asignada. Ver §10-D.

---

## 3. Sucursales

| | Escazú | Pinares / Curridabat | Cartago | Mall San Pedro |
|---|---|---|---|---|
| **Slug** | `escazu` | `pinares` | `cartago` | `san-pedro` |
| **Concepto de zona** | Ultra-diferenciación | Eco-chic ejecutivo | Primer concepto chic local | Oasis de escape |
| **Teléfono** | 8415-7883 | 8915-7883 | 8715-7883 | 8815-7883 |
| **Capacidad total** | 120 | 180 ⚠️ | 100 | 40 |
| **Capacidad máx. evento** | 100 | 100 | 70 | 35 |
| **Salón privado / VIP** | Sí — 8 pax | Sí — 25 pax | Sí — 8 pax | No tiene |
| **BH Fit x Perform** | ✅ Sí | ✅ Sí | ✅ Sí | ⚠️ confirmar |
| **Dirección** | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| **Mesas (desglose)** | ⚠️ | ⚠️ (terraza 100 / interior 50 pax) | ⚠️ | ⚠️ 16 mesas, sin capacidades |

### Horarios

✅ **Mall San Pedro:** lun–vie 10:00–20:00 · sáb–dom 09:00–20:00.

⚠️ **Escazú, Pinares y Cartago:** el documento dice *"lun–juv, apertura 7 am y cierre 8 pm y juv-dom
de 7 am-9pm"*. `juv` aparece en los dos rangos, así que el jueves queda solapado. Ver §10-A.

### Capacidad de reservas por franja

⚠️ El documento dice: *"de lunes a viernes sin límite y de sábado y domingo 30%"*. Falta definir
sobre qué base se calcula ese 30% y si el resto queda reservado para walk-in. Ver §10-B.

---

## 4. Marca

### Reglas duras

✅ **El logo no se puede cambiar. El nombre no se puede cambiar.** Los colores sí.

### Paleta vigente — manual 2022

`MARCA.md` §5 anuncia un rebranding 2026, pero **la sección que lo desarrollaría no existe en el
documento** (salta de §2 a §4) y el único PDF adjunto es el manual 2022. **Por lo tanto rige la
paleta 2022.**

| Rol | Token | HEX | Pantone |
|---|---|---|---|
| Primario · texto y fondos oscuros | `bh.black` | `#000000` | Black 6 C |
| Primario · CTAs y highlights | `bh.yellow` | `#FFF042` | 101 C |
| Apoyo · acentos y badges | `bh.teal` | `#38B6AB` | 7465 C |
| Base | `bh.white` | `#FFFFFF` | — |

El teal es color **de apoyo**, no un tercer primario.

### Tipografía

✅ **Montserrat**, familia única. Light `300` para cuerpo, Bold `700` para titulares, Black `900`
para display. Está en Google Fonts → `next/font/google`, sin licencias adicionales.

### Restricción crítica de contraste

Ni el amarillo ni el teal sirven como **color de texto sobre fondo claro**:

| Combinación | Ratio | |
|---|---|---|
| `#FFF042` sobre blanco | ~1,2:1 | ❌ ilegible |
| `#38B6AB` sobre blanco | ~2,3:1 | ❌ falla AA |
| Negro sobre `#FFF042` | ~15,9:1 | ✅ |
| Negro sobre `#38B6AB` | ~9:1 | ✅ |
| Blanco sobre negro | 21:1 | ✅ |

**Regla de UI:** amarillo y teal se usan **como fondo con texto negro encima**, nunca como color de
texto. Aplica a los CTAs del wizard y a los badges de estado del CRM. Objetivo WCAG **AA**.

### Logo en pantalla

El manual fija un mínimo de **7 cm de ancho** (≈265 px) para el logo principal — es una regla
pensada para impresión y no cabe en un header móvil. Para header, favicon y avatar se usa el
**monograma BH circular**, que es la versión secundaria prevista para eso.

### Dirección visual

Chic, cálida, limpia, aesthetic. Mucho aire, jerarquía tipográfica marcada, fotografía grande y
protagonista sobre fondo oscuro (es el lenguaje del manual 2022), bordes suaves, microinteracciones
discretas. **Nada de plantilla genérica de SaaS.** Mobile-first sin excepción: targets de 44px,
teclado numérico en teléfono, un solo paso visible a la vez.

---

## 5. Menú

✅ **Fuente:** Ingeniería de Menú 2026, metodología Miller-Kasavana (Studio Jorge Rojas).
124 ítems — 58 platos + 66 bebidas. Precios **antes de IVA y servicio**.
Consolidado de Escazú, Pinares y Cartago. ⚠️ No incluye Mall San Pedro.

### Regla de privacidad de datos

🔒 **`food_cost_pct` es dato interno.** Se usa para KPIs del CRM y para ordenar sugerencias del
cotizador. **Nunca se expone** en la app pública ni en la cotización que ve el cliente. Esto debe
garantizarse en la capa de datos (no seleccionar la columna en queries públicas), no solo en la UI.

### Clasificación Miller-Kasavana → comportamiento del cotizador

| Clasif. | Significado | Regla en el sistema |
|---|---|---|
| **Estrella** | Alta popularidad + alta rentabilidad | Se sugieren **primero**, siempre |
| **Puzzle** | Baja popularidad + alta rentabilidad | "Recomendación del chef" — darles visibilidad |
| **Caballo** | Alta popularidad + baja rentabilidad | Disponibles, nunca sugeridos por defecto |
| **Perro** | Baja popularidad + baja rentabilidad | **Excluidos** de paquetes — excepción: menú infantil |

Distribución: 18 Estrella · 54 Puzzle · 26 Caballo · 26 Perro.
Los 26 Caballos mueven el 62–64% del volumen; 65% de la carta vende poco.

### Ítems Estrella — prioridad del cotizador

**Platos (10):** Pinto con Lomito · Pinto con Rib Eye · Waffles Salados · Tostadas de Trucha Ahumada ·
Tacos de Birria · Hamburguesa Especial de la Casa · Margarita Estilo Bread House · Cubano Estilo
Bread House · Pollo Crispy · Risotto de Hongos y Lomito

**Bebidas (8):** Latte · Cappuccino Irlandés · Chocolate Caliente · Smoothie Maracuyá · Smoothie Cas ·
Limonada con Hierba Buena · Pasión Tropical · Mimosa Estilo Bread House

**Puzzles de margen alto a empujar en eventos:** Carpaccio de Salmón (9,6%) · Salmón (10,8%) ·
Pescado (15,9%) · Hamburguesa Pollo Maracuyá (17,5%) · Ceviche Caribeño (17,6%) · Risotto de Ají y
Salmón (22,4%).

**Anclas de negocio a recordar:** Pinto Premium es el ítem más vendido de toda la carta (8.173 u.,
Caballo). Mimosa tiene 3,5% de food cost con 837 u. — bebida de bienvenida por defecto en paquetes.
Salmón es el plato más rentable (10,8%) — fuerte del paquete Premium.

El detalle completo de los 124 ítems con precio, clasificación, food cost y unidades está en
`MENU.md` y se carga a la tabla `menu_items`.

### Líneas que existen pero no están en la ingeniería de menú

- ⚠️ **BH Fit x Perform** — Escazú y Cartago (San Pedro por confirmar), margen objetivo 65–70%.
  Ítems conocidos sin precio: café fit, batido de arándano, bowl, tostada francesa fit.
- ⚠️ **Menú para mascotas** — existe, sin ítems ni precios documentados.
- ⚠️ **Postres** — solo figura "Postre de Turno" (₡6.900). Sin carta fija, los paquetes de evento no
  pueden cerrar el cuarto tiempo.

---

## 6. Políticas de reserva

### Mesa

| Regla | Valor |
|---|---|
| Tamaño de grupo | 1–7 personas (8+ pasa a evento) ✅ |
| Anticipación mínima | **3 horas** ✅ |
| Anticipación máxima | 90 días ✅ |
| Duración | 90 min (1–4 pax) · 120 min (5–7 pax) ✅ |
| Tolerancia de llegada tarde | 15 minutos ✅ |
| Cancelación sin penalidad | hasta 2 horas antes ✅ |
| Depósito | No se cobra, salvo menú especial coordinado previamente ✅ |
| Teléfono duplicado | Bloqueado en misma franja y sucursal ✅ |

> Nota: la anticipación mínima quedó en **3 horas**, no 1 hora. El motor usa 3.

### Evento

| Regla | Valor |
|---|---|
| Mínimo de personas | 8 ✅ |
| Máximo de personas | Por sucursal — 100 / 100 / 70 / 35 (§3), no un tope único de 100 |
| Anticipación mínima | 72 horas ✅ |
| Depósito para confirmar | **50%** del total ✅ |
| Reembolso | **No se trabaja con reembolso** ✅ |
| Confirmación de menú final | 3 días antes del evento ✅ |
| Quién confirma | El administrador desde el CRM ✅ |
| Respuesta prometida al cliente | 24 horas ✅ |

### Ocasiones del formulario

✅ Cumpleaños · Baby shower · Bridal shower · Almuerzo corporativo · Despedida de soltero ·
Aniversario · Té de cocina · Reunión especial · Graduación · Revelación de sexo ·
Taller o actividad comunitaria · Otro

### Cargos

✅ IVA **13%** · Servicio **10%**. Ambos se guardan por fila en `events`, no hardcodeados.
⚠️ Confirmar si el servicio aplica automáticamente a eventos y si hay mínimo de consumo.

### Paquetes de evento (propuestos en `MENU.md`, pendientes de confirmar)

| Paquete | Precio p/p | Valor de carta | Descuento implícito |
|---|---|---|---|
| Esencial | ₡11.500 | ₡10.450 | — (va **por encima** de carta) |
| Intermedio | ₡18.500 | ₡19.650 | −5,9% |
| Premium | ₡28.000 | ₡29.800 | −6,0% |
| A la medida | recalculado en vivo | — | — |

⚠️ El Esencial está ₡1.050 **por encima** del valor de carta, mientras que los otros dos van por
debajo. `MENU.md` §18 lo describe como un descuento uniforme de 3–6%, lo cual no coincide. Ver §10-F.

### Extras de evento

| Extra | Precio |
|---|---|
| Pastel | ₡25.000 (10–15 porciones) ✅ |
| Música en vivo | ₡50.000 por hora ✅ |
| Área privada | Pinares 25 pax · Escazú 8 pax · Cartago 8 pax · San Pedro no tiene ✅ |
| Decoración | ⚠️ por definir |

### Protección de datos — Ley 8968

✅ Consentimiento explícito al enviar el formulario. ✅ Opción de baja de comunicaciones.
⚠️ Falta el **plazo de conservación** de los datos y ⚠️ el **texto legal** que ve el cliente.

---

## 7. Alcance del sistema

1. **App pública** (`/reservar`) — reserva de mesa (1–7 pax) o cotización de evento (8+ pax).
2. **CRM interno** (`/admin`) — calendario, vista de servicio, pipeline de eventos, clientes, KPIs.

Roles: `admin` (todo) · `gerente_sucursal` (su sucursal) · `anfitrion` (ver y cambiar estado del día).

---

## 8. Convenciones técnicas

- Idioma **es-CR**. Zona horaria **America/Costa_Rica**.
- Moneda **CRC**, formato `₡12.500`. USD solo como referencia, con tipo de cambio congelado al
  momento de cotizar.
- Dinero en **enteros de céntimos** (`bigint`), nunca `float`.
- Tiempo en **UTC** (`timestamptz`) + `fecha_local` derivada para agrupar reportes.
- Canales de `source`: `web` · `whatsapp_pani` · `instagram` · `telefono` · `walk_in`.

---

## 9. Assets pendientes de extraer

De `docs/assets/manual-marca-2022.pdf`, en vectorial, hacia `docs/assets/`:

- [ ] `logo-principal.svg` (negro) y `logo-principal-blanco.svg`
- [ ] `monograma-bh.svg` — favicon, header móvil, avatar, sello del PDF de cotización
- [ ] `monograma-bh-invertido.svg`
- [ ] `sello-circular.svg`
- [ ] Fotografía horizontal por sucursal (mínimo 1 de cada una)
- [ ] Fotografía de platos Estrella para el cotizador

---

## 10. Registro de vacíos — bloquean código

Ordenados por impacto. **A–D bloquean la Fase 1.**

| # | Vacío | Qué bloquea |
|---|---|---|
| **A** | Horario de Escazú/Pinares/Cartago: `juv` aparece en ambos rangos, el jueves queda solapado | `branch_hours`, y con eso todo el motor de disponibilidad |
| **B** | Regla "sáb–dom 30%": ¿30% de qué base? ¿el resto es walk-in? | `branch_slot_capacity`, tope de sobreventa por franja |
| **C** | Desglose de mesas de las 4 sucursales (nombre, cap. mín/máx, zona) | Tabla `tables` y la asignación automática de mesa |
| **D** | Ventana 20:00–21:00 sin franja, en las 3 sucursales que cierran a las 21:00 | Grid de horas del wizard |
| E | Pinares: capacidad total 180, pero terraza 100 + interior 50 = 150. Faltan 30 (¿el VIP de 25?) | Capacidad real de la sucursal |
| F | Paquete Esencial ₡11.500 va **por encima** del valor de carta ₡10.450; los otros dos van por debajo | Precio de los 3 paquetes |
| G | Direcciones de las 4 sucursales | Selector visual de sucursal |
| H | BH Fit x Perform: precios de los 4 ítems | `menu_items`, cotizador |
| I | Menú para mascotas: ítems y precios | `menu_items`, extras de evento |
| J | Carta de postres fija | Cuarto tiempo de los paquetes |
| K | Precio de decoración | Extras de evento |
| L | ¿San Pedro tiene el mismo menú y precios? ¿Tiene BH Fit? | `menu_items` por sucursal |
| M | ¿El servicio 10% aplica automático a eventos? ¿Hay mínimo de consumo? | Cálculo de la cotización |
| N | Plazo de conservación de datos (Ley 8968) + texto legal para el cliente | Consentimiento y footer legal |
| O | Tono de voz: ¿voseo, tuteo o neutro? (los documentos internos usan voseo) | Todo el copy de la app y los correos |
| P | Colores de estado: falta rojo de error y ámbar de advertencia que no choquen con `#FFF042` | Sistema de UI |
| Q | Usos incorrectos del logo — el manual 2022 no los cubre | Guía de uso |
| R | Assets vectoriales y fotografía (§9) | Maquetación |
