/**
 * Plantillas de correo.
 *
 * HTML con estilos en linea: los clientes de correo ignoran hojas de estilo.
 * Se respeta la regla de contraste de la marca — el amarillo va de fondo con
 * texto negro, nunca como color de texto (docs/MARCA.md §5).
 *
 * Tono: voseo costarricense, como el resto de la app (supuesto S-3).
 */
import { formatCR } from "@/lib/datetime";
import { nombreFranja, type Franja } from "@/lib/franjas";
import { formatearTelefono } from "@/lib/telefono";
import { POLITICA_MESA } from "@/data/politicas";

const NEGRO = "#000000";
const AMARILLO = "#fff042";
const CREMA = "#faf9f6";
const GRIS = "#6b6b6b";

export type DatosCorreoMesa = {
  nombre: string;
  codigoPublico: string;
  sucursal: string;
  telefonoSucursal: string;
  startsAt: Date;
  franja: Franja;
  numPersonas: number;
  urlGestion: string;
};

function envoltura(contenido: string): string {
  return `<!doctype html><html lang="es-CR"><body style="margin:0;padding:0;background:${CREMA};font-family:Montserrat,Helvetica,Arial,sans-serif;color:${NEGRO};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREMA};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;">
<tr><td style="background:${NEGRO};padding:24px;text-align:center;">
<span style="color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.02em;">Bread House</span><br>
<span style="color:#ffffff;font-size:10px;letter-spacing:0.14em;opacity:.7;">BISTRÓ &amp; CAFÉ</span>
</td></tr>
<tr><td style="padding:28px 24px;">${contenido}</td></tr>
<tr><td style="padding:16px 24px 24px;border-top:1px solid #e2e2e2;">
<p style="margin:0;font-size:11px;color:${GRIS};line-height:1.5;">
Recibís este correo porque hiciste una reserva en Bread House.
Tus datos se tratan según la Ley 8968 de protección de datos de Costa Rica.
</p></td></tr>
</table></td></tr></table></body></html>`;
}

function fila(etiqueta: string, valor: string): string {
  return `<tr>
<td style="padding:6px 0;font-size:12px;color:${GRIS};width:38%;">${etiqueta}</td>
<td style="padding:6px 0;font-size:14px;font-weight:700;">${valor}</td>
</tr>`;
}

export function confirmacionMesa(d: DatosCorreoMesa) {
  const fecha = formatCR(d.startsAt, "EEEE d 'de' MMMM");
  const hora = formatCR(d.startsAt, "HH:mm");

  const html = envoltura(`
<h1 style="margin:0 0 8px;font-size:24px;font-weight:900;letter-spacing:-0.02em;">Listo, ${d.nombre}</h1>
<p style="margin:0 0 20px;font-size:15px;font-weight:300;line-height:1.6;">
Tu mesa está reservada. Te esperamos.</p>

<div style="background:${AMARILLO};color:${NEGRO};border-radius:14px;padding:14px 16px;margin:0 0 20px;text-align:center;">
<span style="font-size:11px;letter-spacing:0.14em;">TU CÓDIGO</span><br>
<span style="font-size:26px;font-weight:900;letter-spacing:0.04em;">${d.codigoPublico}</span>
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
${fila("Sucursal", d.sucursal)}
${fila("Fecha", fecha)}
${fila("Hora", `${hora} · ${nombreFranja(d.franja)}`)}
${fila("Personas", String(d.numPersonas))}
</table>

<p style="margin:0 0 20px;font-size:13px;font-weight:300;line-height:1.6;color:${GRIS};">
Guardamos tu mesa ${POLITICA_MESA.toleranciaLlegadaMin} minutos. Si vas a llegar
más tarde, escribinos al ${formatearTelefono(d.telefonoSucursal)} y la mantenemos.
Podés cancelar sin costo hasta ${POLITICA_MESA.cancelacionSinPenalidadHoras} horas antes.</p>

<a href="${d.urlGestion}" style="display:block;background:${NEGRO};color:#ffffff;text-decoration:none;text-align:center;padding:14px;border-radius:14px;font-weight:700;font-size:14px;">
Cambiar o cancelar la reserva</a>`);

  const texto = `Listo, ${d.nombre}.

Tu código: ${d.codigoPublico}
Sucursal: ${d.sucursal}
Fecha: ${fecha}
Hora: ${hora} (${nombreFranja(d.franja)})
Personas: ${d.numPersonas}

Guardamos tu mesa ${POLITICA_MESA.toleranciaLlegadaMin} minutos.
Cancelación sin costo hasta ${POLITICA_MESA.cancelacionSinPenalidadHoras} horas antes.

Cambiar o cancelar: ${d.urlGestion}`;

  return { asunto: `Tu mesa en Bread House ${d.sucursal} · ${d.codigoPublico}`, html, texto };
}

export function recordatorio(d: DatosCorreoMesa, horas: 24 | 2) {
  const cuando = horas === 24 ? "mañana" : "en un rato";
  const hora = formatCR(d.startsAt, "HH:mm");

  const html = envoltura(`
<h1 style="margin:0 0 8px;font-size:22px;font-weight:900;">Te esperamos ${cuando}</h1>
<p style="margin:0 0 20px;font-size:15px;font-weight:300;line-height:1.6;">
${d.nombre}, tu mesa en ${d.sucursal} es a las <strong>${hora}</strong> para ${d.numPersonas}
${d.numPersonas === 1 ? "persona" : "personas"}.</p>
<div style="background:${AMARILLO};color:${NEGRO};border-radius:14px;padding:12px;margin:0 0 20px;text-align:center;font-weight:900;font-size:20px;">
${d.codigoPublico}</div>
<a href="${d.urlGestion}" style="display:block;border:1px solid ${NEGRO};color:${NEGRO};text-decoration:none;text-align:center;padding:13px;border-radius:14px;font-weight:700;font-size:14px;">
¿No podés venir? Cancelá acá</a>`);

  const texto = `${d.nombre}, te esperamos ${cuando} a las ${hora} en Bread House ${d.sucursal}.
Código: ${d.codigoPublico}
Cancelar: ${d.urlGestion}`;

  return { asunto: `Recordatorio: tu mesa ${cuando} en Bread House`, html, texto };
}

export function cancelacionMesa(d: Pick<DatosCorreoMesa, "nombre" | "codigoPublico" | "sucursal">) {
  const html = envoltura(`
<h1 style="margin:0 0 8px;font-size:22px;font-weight:900;">Reserva cancelada</h1>
<p style="margin:0;font-size:15px;font-weight:300;line-height:1.6;">
${d.nombre}, cancelamos tu reserva ${d.codigoPublico} en ${d.sucursal}.
Cuando quieras volver, acá estamos.</p>`);

  return {
    asunto: `Cancelamos tu reserva ${d.codigoPublico}`,
    html,
    texto: `${d.nombre}, cancelamos tu reserva ${d.codigoPublico} en ${d.sucursal}.`,
  };
}
