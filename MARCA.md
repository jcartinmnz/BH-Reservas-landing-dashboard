# marca.md — Bread House

> **Fuente:** Manual de Marca Bread House 2022 (Bistró & Café).
> Define los design tokens de todo el sistema de reservas y CRM.
> ⚠️ Hay un rebranding 2026 en curso. Ver sección 3 antes de maquetar.

---

## 1. Reglas duras

✅ **El logo principal no se puede cambiar.**
✅ **El nombre no se puede cambiar.**
✅ Los colores **sí** se pueden modificar (rebranding 2026).

---

## 2. Identidad 2022 — datos confirmados del manual

### 2.1 Logo principal

Logotipo script manuscrito **"Bread House"** con una **espiga de trigo** integrada entre las dos palabras, y bajada **"BISTRÓ & CAFÉ"** en sans serif espaciada.

| Regla | Valor |
|---|---|
| **Tamaño mínimo** | **7 cm de ancho** — aplica tanto a digital como a impreso |
| **Zona de protección** | Márgenes mínimos definidos por la altura de la "B" de *Bread* arriba y abajo, y por el ornamento de espiga a los lados |
| **Versión en blanco** | Alternativa **secundaria**, solo para fondos oscuros |
| **Criterio rector** | Máxima visibilidad, legibilidad y contraste en toda aplicación |

> ⚠️ **Nota de implementación:** el mínimo de 7 cm viene de un manual pensado para impresión. En web, 7 cm ≈ 265 px, que es demasiado grande para el header de una app móvil. Para el header y el favicon hay que usar las **versiones alternativas** (sección 2.2), no el logo principal reducido. Confirmar este criterio antes de maquetar.

### 2.2 Versiones alternativas del logo

Dos marcas secundarias, ambas circulares:

1. **Monograma BH** — círculo negro sólido con el monograma *BH* en script blanco, y el texto **"BREAD HOUSE · BISTRÓ & CAFÉ"** rodeando el círculo. También existe en versión invertida (círculo blanco, monograma negro).
2. **Sello circular "BREAD HOUSE"** — letras dispuestas en círculo alrededor de la espiga, con la bajada *BISTRÓ & CAFÉ*.

**Uso en el sistema:** el monograma BH es la versión correcta para favicon, avatar, header móvil y el sello de la cotización de evento en PDF.

### 2.3 Colores

**Primarios**

| Color | HEX | RGB | CMYK | Pantone |
|---|---|---|---|---|
| Negro | `#000000` | 0, 0, 0 | 100 / 100 / 100 / 100 | Black 6 C |
| Amarillo | `#FFF042` | 255, 240, 66 | 0 / 0 / 80 / 0 | 101 C |

**Color asociado (secundario de apoyo)**

| Color | HEX | RGB | CMYK | Pantone |
|---|---|---|---|---|
| Teal | `#38B6AB` | 56, 182, 171 | 70 / 0 / 40 / 0 | 7465 C |

El manual define el teal como color **de apoyo**, para usarse en conjunto con los primarios y aportar interés visual y distinción gráfica. No es un tercer color primario.

Criterio del manual: la aplicación de estos colores debe mantenerse **constante** en la medida de lo posible, tanto en impreso como en digital.

### 2.4 Tipografía

**Familia única: Montserrat**, en tres pesos.

| Uso | Peso |
|---|---|
| Titulares | **Montserrat Bold**, **Montserrat Black** |
| Cuerpo de texto | **Montserrat Light** |

Rasgo definido en el manual: tipografía moderna, de diseño sencillo y elegante, con gran legibilidad.

✅ Montserrat está en Google Fonts — se carga con `next/font/google`, sin licencias adicionales.

---
---

## 4. Design tokens — implementación (base 2022)

```ts
// tailwind.config.ts
colors: {
  bh: {
    black:  '#000000',  // primario · texto, fondos oscuros, monograma
    yellow: '#FFF042',  // primario · CTAs, highlights, estados activos
    teal:   '#38B6AB',  // apoyo · acentos, badges de estado, líneas divisorias
    white:  '#FFFFFF',
  }
}
fontFamily: {
  sans: ['Montserrat', 'sans-serif'],
}
```

Pesos a cargar: `300` (Light, cuerpo), `700` (Bold, titulares), `900` (Black, display).

Nada de valores hardcodeados fuera del config.

---

## 5. ⚠️ Contraste — restricción crítica de la paleta

Los dos colores de acento **no sirven como color de texto sobre blanco**:

| Combinación | Ratio aprox. | Veredicto |
|---|---|---|
| `#FFF042` sobre blanco | ~1,2:1 | ❌ Ilegible |
| `#38B6AB` sobre blanco | ~2,3:1 | ❌ Falla AA |
| Negro sobre `#FFF042` | ~15,9:1 | ✅ Excelente |
| Negro sobre `#38B6AB` | ~9:1 | ✅ Excelente |
| Blanco sobre `#000000` | 21:1 | ✅ Excelente |

**Regla para toda la UI:** el amarillo y el teal se usan como **fondo con texto negro encima**, nunca como color de texto sobre fondo claro. Esto aplica sobre todo a los botones de CTA del flujo de reservas y a los badges de estado del CRM.

Objetivo del sistema: **WCAG AA** (4,5:1 en texto normal, 3:1 en texto grande y componentes de interfaz).

---

## 6. Dirección visual del sistema

Chic, cálida, limpia, aesthetic. Pensada para un público de mujeres 18–35 de nivel socioeconómico medio-alto.

- Mucho aire y respiración entre elementos.
- Jerarquía tipográfica marcada: Montserrat Black o Bold para titulares, Light para cuerpo.
- Fotografía grande y protagonista en la selección de sucursal y en el cotizador de eventos. El manual 2022 apoya toda la identidad en fotografía de producto en primer plano sobre fondo oscuro — mantener ese lenguaje.
- Bordes suaves, sombras sutiles, microinteracciones discretas.
- **Nada de plantilla genérica de SaaS.**

**Mobile-first sin excepción** — la mayoría de los clientes entra desde el link en la bio de Instagram. Targets táctiles de 44px, teclado numérico en el campo de teléfono, un solo paso visible a la vez.

---

## 7. Assets — ⚠️ por extraer del PDF

Colocar en `docs/assets/`. Todos existen dentro del manual 2022; hay que exportarlos en vectorial.

- [ ] `logo-principal.svg` — script + espiga + bajada, en negro
- [ ] `logo-principal-blanco.svg` — versión para fondos oscuros
- [ ] `monograma-bh.svg` — círculo negro, monograma blanco (favicon, header, avatar)
- [ ] `monograma-bh-invertido.svg` — círculo blanco, monograma negro
- [ ] `sello-circular.svg`
- [ ] Fotografía de cada sucursal (1 mínimo por sucursal, horizontal)
- [ ] Fotografía de platos para el cotizador — priorizar los ítems Estrella de `menu.md`

---

## 8. ⚠️ Vacíos del manual 2022

El manual cubre logo, colores y tipografía. **No cubre** lo siguiente, y el sistema lo necesita:

- **Usos incorrectos del logo** — no hay página de restricciones (deformar, recolorear, rotar).
- **Tono de voz y copy** — no hay guía de redacción. Todo el texto de la app (botones, confirmaciones, correos, mensajes de error) necesita un criterio. ⚠️ Definir mínimo: trato de "vos" o neutro, y si se permite el tuteo.
- **Sistema de iconografía** — no definido.
- **Jerarquía tipográfica en pantalla** — tamaños y line-heights. Se propondrán en el sistema de UI y hay que aprobarlos.
- **Colores de estado** (éxito, error, advertencia) — no existen en la paleta. Hay que definirlos: el teal puede servir de éxito, pero falta rojo de error y ámbar de advertencia que no choquen con el amarillo de marca.
