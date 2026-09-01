# CONTEXT.md — Bread House

> Fuente de verdad del proyecto. Todo lo marcado ✅ está confirmado. Todo lo marcado ⚠️ **debe completarse antes de escribir código**; el agente no puede inventarlo.

---

## 1. El negocio

✅ **Bread House** — restaurante bistró & café con **4 sucursales** en Costa Rica.

✅ **Posicionamiento (taller estratégico Mayo 2026):** *restaurante chic — experiencia real, operación sencilla, producto de alto nivel.*

✅ **Público objetivo principal:** mujeres 18–35 años, nivel socioeconómico medio-alto/alto.

✅ **Canal de reservas existente:** **Pani**, agente de WhatsApp con IA que atiende reservas y consultas. Corre en infraestructura separada. **No se reemplaza** — el sistema debe exponer un endpoint para que Pani inserte reservas y se pueda medir su aporte por separado (`source = whatsapp_pani`).

---

## 2. Franjas horarias (modelo operativo)

✅ El negocio opera con 4 franjas definidas. Deben existir como entidad en la base de datos y ser dimensión de análisis en el CRM.

| Franja | Horario | Estado / público |
|---|---|---|
| Café & Brunch | 7:00 – 12:00 | Franja fuerte |
| Fast Lunch Premium | 12:00 – 15:00 | Franja fuerte |
| Tardeada Social | 15:00 – 18:00 | **Franja perdida — objetivo de recuperación** |
| Social Pesada | 18:00 – 20:00 | Mujeres 23–38 |



## 3. Problemas conocidos del negocio

✅ Estos dolores deben reflejarse en lo que el sistema mide:

- **Baja afluencia de lunes a jueves** → el dashboard debe resaltar el desempeño por día de la semana.
- **Franja 3–6 pm perdida** → KPI dedicado a Tardeada Social.
- Menú desmedido sin plato estrella claro.
- Comunicación históricamente centrada en el producto y no en el momento de consumo.
- ✅ Ventas Ene–May 2026 vs. 2025: caída de ~130.286 a ~108.240 unidades (**-17%**). El canal Uber también en caída.

---

## 4. Sucursales

✅ Las 4 sucursales y su estrategia de zona:

| Sucursal | Concepto de zona |
|---|---|
| Escazú | Ultra-diferenciación |
| Pinares / Curridabat | Eco-chic ejecutivo |
| Cartago | Primer concepto chic local |
| Mall San Pedro | Oasis de escape |


---

## 5. Menú



✅ Líneas confirmadas:
- **BH Fit x Perform** — colaboración con la proteína Perform. Disponible en **Escazú y Cartago**. Margen objetivo 65–70%.
- **Menú para mascotas** — relevante para el campo de notas de la reserva y para los extras de eventos.

---

## 6. Marca

✅ Reglas duras: **el logo y el nombre no se pueden cambiar.** Los colores sí.


---

## 7. Alcance del sistema

1. **App pública de reservas** (`/reservar`) — reserva de mesa (1–7 personas) o cotización de evento (8+ personas).
2. **CRM interno** (`/admin`) — calendario, pipeline de eventos, base de clientes y dashboard de KPIs.

Zona horaria `America/Costa_Rica`. Idioma `es-CR`. Moneda **CRC**, formato `₡12.500`.
