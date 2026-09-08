/**
 * Capa de notificaciones.
 *
 * Abstrae el canal a proposito: hoy solo hay correo por Resend, pero ya existe
 * Pani (agente de WhatsApp) y el brief pide poder enchufarlo despues sin tocar
 * el resto del sistema. Por eso nadie llama a Resend directo — todo pasa por
 * `enviar()`.
 *
 * Cada envio queda registrado en `notifications_log` con un indice unico por
 * (reserva, tipo), asi que reintentar no manda el recordatorio dos veces.
 */
import { getDb } from "@/lib/db";
import { notificationsLog } from "@/lib/db/schema";

export type TipoNotificacion =
  | "confirmacion_mesa"
  | "recordatorio_24h"
  | "recordatorio_2h"
  | "cancelacion"
  | "solicitud_evento"
  | "cotizacion_evento"
  | "aviso_interno_evento"
  | "aviso_interno_cancelacion";

export type Canal = "email" | "whatsapp";

export type Mensaje = {
  tipo: TipoNotificacion;
  canal: Canal;
  para: string;
  asunto: string;
  html: string;
  texto: string;
  /** Para idempotencia y trazabilidad. */
  reservationId?: string;
};

export type ResultadoEnvio =
  | { ok: true; providerMessageId?: string; omitido?: "ya_enviado" }
  | { ok: false; error: string };

/** Proveedor de un canal. */
export interface Proveedor {
  canal: Canal;
  enviar(m: Mensaje): Promise<{ providerMessageId?: string }>;
}

/**
 * Resend. Si falta la API key no revienta: registra el intento como omitido.
 * Un entorno sin correo configurado debe poder tomar reservas igual.
 */
const proveedorEmail: Proveedor = {
  canal: "email",
  async enviar(m) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.CORREO_REMITENTE;
    if (!apiKey || !from) throw new Error("Resend no está configurado");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from, to: m.para, subject: m.asunto, html: m.html, text: m.texto,
      }),
    });

    if (!res.ok) {
      throw new Error(`Resend respondió ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { id?: string };
    return { providerMessageId: data.id };
  },
};

const PROVEEDORES: Record<Canal, Proveedor> = {
  email: proveedorEmail,
  // Pendiente: Pani expone su propio endpoint. Ver docs/PLAN.md fase 7.
  whatsapp: {
    canal: "whatsapp",
    async enviar() {
      throw new Error("El canal de WhatsApp todavía no está conectado a Pani.");
    },
  },
};

export function hayCorreoConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.CORREO_REMITENTE);
}

/**
 * Envia un mensaje y deja rastro.
 *
 * Nunca lanza: una falla de correo no puede tumbar una reserva ya guardada.
 * El cliente ya tiene su codigo en pantalla; el correo es un extra.
 */
export async function enviar(m: Mensaje): Promise<ResultadoEnvio> {
  const db = getDb();

  // Reserva el renglón primero: el índice único (reservation_id, tipo) hace
  // que un segundo intento del mismo tipo choque acá y no llegue a enviarse.
  if (m.reservationId) {
    try {
      await db.insert(notificationsLog).values({
        reservationId: m.reservationId, tipo: m.tipo, canal: m.canal, estado: "pendiente",
      });
    } catch {
      return { ok: true, omitido: "ya_enviado" };
    }
  }

  if (!hayCorreoConfigurado() && m.canal === "email") {
    await marcar(m, "omitido", null, "Resend no está configurado");
    return { ok: false, error: "Correo no configurado" };
  }

  try {
    const { providerMessageId } = await PROVEEDORES[m.canal].enviar(m);
    await marcar(m, "enviado", providerMessageId ?? null, null);
    return { ok: true, providerMessageId };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error desconocido";
    console.error(`Falló el envío de ${m.tipo}:`, error);
    await marcar(m, "fallido", null, error);
    return { ok: false, error };
  }
}

async function marcar(
  m: Mensaje, estado: string, providerMessageId: string | null, error: string | null,
) {
  if (!m.reservationId) return;
  const db = getDb();
  const { and, eq } = await import("drizzle-orm");
  await db
    .update(notificationsLog)
    .set({ estado, providerMessageId, error, enviadoAt: estado === "enviado" ? new Date() : null })
    .where(
      and(
        eq(notificationsLog.reservationId, m.reservationId),
        eq(notificationsLog.tipo, m.tipo),
      ),
    );
}
