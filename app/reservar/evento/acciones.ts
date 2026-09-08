"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { FRANJAS } from "@/lib/franjas";
import { OCASIONES, POLITICA_EVENTO } from "@/data/politicas";
import { SUCURSALES } from "@/data/sucursales";
import { cotizarSolicitud, crearSolicitudEvento } from "@/lib/eventos/crear";
import type { Cotizacion } from "@/lib/eventos/cotizador";
import { verificarLimite } from "@/lib/rate-limit";
import { enviar } from "@/lib/notifications";
import { cotizacionEvento, avisoInternoEvento } from "@/lib/notifications/plantillas-evento";

const SLUGS = SUCURSALES.map((s) => s.slug) as [string, ...string[]];

const seleccionSchema = z.array(
  z.object({ slug: z.string().max(80), cantidad: z.coerce.number().int().min(0).max(500) }),
).max(80);

const solicitudSchema = z.object({
  sucursalSlug: z.enum(SLUGS),
  fechaLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaFlexible: z.boolean().default(false),
  franja: z.enum(FRANJAS),
  ocasion: z.enum(OCASIONES),
  numPersonas: z.coerce.number().int().min(POLITICA_EVENTO.minPersonas).max(500),
  paqueteSlug: z.string().max(40),
  seleccion: seleccionSchema.optional(),
  nombre: z.string().trim().min(2).max(120),
  telefono: z.string().trim(),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  preferenciaContacto: z.enum(["whatsapp", "llamada", "correo"]),
  notas: z.string().trim().max(500).optional(),
  consentMarketing: z.boolean().default(false),
  aceptaPolitica: z.boolean().refine((v) => v === true, "Tenés que aceptar la política"),
});

/** Estimado en vivo. No guarda nada. */
export async function estimar(entrada: {
  paqueteSlug: string;
  numPersonas: number;
  seleccion?: { slug: string; cantidad: number }[];
}): Promise<{ ok: true; cotizacion: Cotizacion } | { ok: false; error: string }> {
  const numPersonas = Number(entrada.numPersonas);
  if (!Number.isInteger(numPersonas) || numPersonas < POLITICA_EVENTO.minPersonas) {
    return { ok: false, error: `Los eventos son desde ${POLITICA_EVENTO.minPersonas} personas.` };
  }
  const seleccion = seleccionSchema.optional().safeParse(entrada.seleccion);
  if (!seleccion.success) return { ok: false, error: "Selección inválida." };

  const cotizacion = cotizarSolicitud(entrada.paqueteSlug, numPersonas, seleccion.data);
  return cotizacion
    ? { ok: true, cotizacion }
    : { ok: false, error: "Ese paquete no existe." };
}

export type RespuestaSolicitud =
  | { ok: true; codigoPublico: string }
  | { ok: false; error: string; campo?: string };

export async function enviarSolicitud(entrada: unknown): Promise<RespuestaSolicitud> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
  if (!verificarLimite(`evento:${ip}`, 5, 60_000)) {
    return { ok: false, error: "Demasiados intentos. Esperá un minuto." };
  }

  const parsed = solicitudSchema.safeParse(entrada);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Datos inválidos", campo: String(issue?.path[0]) };
  }

  const d = parsed.data;
  const res = await crearSolicitudEvento({
    ...d,
    email: d.email || undefined,
    notas: d.notas,
    source: "web",
  });

  if (!res.ok) return { ok: false, error: res.error, campo: res.campo };

  // El cliente recibe su cotización; el equipo, el aviso de solicitud nueva.
  if (d.email) {
    const correo = cotizacionEvento({
      nombre: d.nombre,
      codigoPublico: res.codigoPublico,
      cotizacion: res.cotizacion,
      ocasion: d.ocasion,
      fechaLocal: d.fechaLocal,
      sucursalSlug: d.sucursalSlug,
    });
    await enviar({
      tipo: "cotizacion_evento", canal: "email", para: d.email,
      asunto: correo.asunto, html: correo.html, texto: correo.texto,
    });
  }

  const correoEquipo = process.env.CORREO_EQUIPO;
  if (correoEquipo) {
    const aviso = avisoInternoEvento({
      codigoPublico: res.codigoPublico,
      nombre: d.nombre,
      telefono: d.telefono,
      numPersonas: d.numPersonas,
      ocasion: d.ocasion,
      fechaLocal: d.fechaLocal,
      sucursalSlug: d.sucursalSlug,
      totalCentimos: res.cotizacion.totalCentimos,
      preferenciaContacto: d.preferenciaContacto,
    });
    await enviar({
      tipo: "aviso_interno_evento", canal: "email", para: correoEquipo,
      asunto: aviso.asunto, html: aviso.html, texto: aviso.texto,
    });
  }

  return { ok: true, codigoPublico: res.codigoPublico };
}
