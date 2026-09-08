/**
 * Correos del flujo de eventos.
 *
 * El correo al cliente es una COTIZACION, no una confirmacion: el aviso de
 * que esta sujeta a revision va visible, no en letra chica.
 */
import { formatCRC } from "@/lib/money";
import { NOMBRE_OCASION, POLITICA_EVENTO, type Ocasion } from "@/data/politicas";
import { sucursalPorSlug } from "@/data/sucursales";
import type { Cotizacion } from "@/lib/eventos/cotizador";

const NEGRO = "#000000";
const AMARILLO = "#fff042";
const GRIS = "#6b6b6b";

export function cotizacionEvento(d: {
  nombre: string;
  codigoPublico: string;
  cotizacion: Cotizacion;
  ocasion: Ocasion;
  fechaLocal: string;
  sucursalSlug: string;
}) {
  const c = d.cotizacion;
  const sucursal = sucursalPorSlug(d.sucursalSlug)?.nombre ?? d.sucursalSlug;

  const lineas = c.lineas
    .map(
      (l) => `<tr>
<td style="padding:6px 0;font-size:13px;">${l.nombre} <span style="color:${GRIS};">× ${l.cantidad}</span></td>
<td style="padding:6px 0;font-size:13px;text-align:right;white-space:nowrap;">${formatCRC(l.subtotalCentimos)}</td>
</tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="es-CR"><body style="margin:0;background:#faf9f6;font-family:Montserrat,Helvetica,Arial,sans-serif;color:${NEGRO};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#fff;border-radius:20px;overflow:hidden;">
<tr><td style="background:${NEGRO};padding:24px;text-align:center;">
<span style="color:#fff;font-size:20px;font-weight:900;">Bread House</span><br>
<span style="color:#fff;font-size:10px;letter-spacing:0.14em;opacity:.7;">BISTRÓ &amp; CAFÉ</span></td></tr>
<tr><td style="padding:28px 24px;">
<h1 style="margin:0 0 8px;font-size:23px;font-weight:900;">Tu estimado, ${d.nombre}</h1>
<p style="margin:0 0 20px;font-size:15px;font-weight:300;line-height:1.6;">
${NOMBRE_OCASION[d.ocasion]} para ${c.numPersonas} personas en ${sucursal}, el ${d.fechaLocal}.</p>

<div style="background:${AMARILLO};border-radius:14px;padding:12px;margin:0 0 20px;text-align:center;">
<span style="font-size:11px;letter-spacing:0.14em;">REFERENCIA</span><br>
<span style="font-size:22px;font-weight:900;">${d.codigoPublico}</span></div>

<table role="presentation" width="100%" style="border-collapse:collapse;">${lineas}
<tr><td colspan="2" style="border-top:1px solid #e2e2e2;padding-top:8px;"></td></tr>
<tr><td style="font-size:13px;color:${GRIS};">Subtotal</td><td style="font-size:13px;text-align:right;">${formatCRC(c.subtotalCentimos)}</td></tr>
<tr><td style="font-size:13px;color:${GRIS};">IVA ${c.ivaPct}%</td><td style="font-size:13px;text-align:right;">${formatCRC(c.ivaCentimos)}</td></tr>
<tr><td style="font-size:13px;color:${GRIS};">Servicio ${c.servicioPct}%</td><td style="font-size:13px;text-align:right;">${formatCRC(c.servicioCentimos)}</td></tr>
<tr><td style="font-size:17px;font-weight:900;padding-top:8px;">Total estimado</td>
<td style="font-size:17px;font-weight:900;text-align:right;padding-top:8px;">${formatCRC(c.totalCentimos)}</td></tr>
<tr><td style="font-size:12px;color:${GRIS};">Por persona</td>
<td style="font-size:12px;color:${GRIS};text-align:right;">${formatCRC(c.porPersonaCentimos)}</td></tr>
</table>

<div style="border:1px solid #e2e2e2;border-radius:14px;padding:14px;margin:20px 0 0;">
<p style="margin:0;font-size:13px;font-weight:700;">Estimado sujeto a confirmación.</p>
<p style="margin:6px 0 0;font-size:13px;font-weight:300;line-height:1.6;color:${GRIS};">
Un asesor te contacta en menos de ${POLITICA_EVENTO.respuestaPrometidaHoras} horas para cerrar
los detalles. Para confirmar el evento pedimos un depósito del ${POLITICA_EVENTO.depositoPct}%
(${formatCRC(c.depositoCentimos)}), y el menú final se define
${POLITICA_EVENTO.confirmacionMenuDiasAntes} días antes.</p></div>

</td></tr></table></td></tr></table></body></html>`;

  const texto = `Tu estimado, ${d.nombre}.
Referencia: ${d.codigoPublico}
${NOMBRE_OCASION[d.ocasion]} para ${c.numPersonas} personas en ${sucursal}, el ${d.fechaLocal}.

Subtotal: ${formatCRC(c.subtotalCentimos)}
IVA ${c.ivaPct}%: ${formatCRC(c.ivaCentimos)}
Servicio ${c.servicioPct}%: ${formatCRC(c.servicioCentimos)}
TOTAL ESTIMADO: ${formatCRC(c.totalCentimos)} (${formatCRC(c.porPersonaCentimos)} por persona)

Estimado sujeto a confirmación. Un asesor te contacta en menos de ${POLITICA_EVENTO.respuestaPrometidaHoras} horas.
Depósito para confirmar: ${POLITICA_EVENTO.depositoPct}% (${formatCRC(c.depositoCentimos)}).`;

  return { asunto: `Tu estimado para el evento · ${d.codigoPublico}`, html, texto };
}

/** Aviso al equipo. Prioriza lo accionable: contacto, monto y plazo. */
export function avisoInternoEvento(d: {
  codigoPublico: string;
  nombre: string;
  telefono: string;
  numPersonas: number;
  ocasion: Ocasion;
  fechaLocal: string;
  sucursalSlug: string;
  totalCentimos: number;
  preferenciaContacto: string;
}) {
  const sucursal = sucursalPorSlug(d.sucursalSlug)?.nombre ?? d.sucursalSlug;
  const cuerpo = `Nueva solicitud de evento — ${d.codigoPublico}

Cliente: ${d.nombre}
Teléfono: ${d.telefono}
Prefiere: ${d.preferenciaContacto}

${NOMBRE_OCASION[d.ocasion]} · ${d.numPersonas} personas
${sucursal} · ${d.fechaLocal}
Total estimado: ${formatCRC(d.totalCentimos)}

Prometimos responder en menos de ${POLITICA_EVENTO.respuestaPrometidaHoras} horas.`;

  return {
    asunto: `[Evento] ${d.nombre} · ${d.numPersonas} pax · ${formatCRC(d.totalCentimos)}`,
    html: `<pre style="font-family:Montserrat,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;">${cuerpo}</pre>`,
    texto: cuerpo,
  };
}
