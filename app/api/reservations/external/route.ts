import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { crearReserva } from "@/lib/reservas/crear";
import { SUCURSALES } from "@/data/sucursales";
import { OCASIONES, SOURCES } from "@/data/politicas";
import { verificarLimite } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint para canales externos — principalmente Pani, el agente de WhatsApp.
 *
 * Pani corre en su propia infraestructura y NO se reemplaza: este endpoint
 * existe para que sus reservas entren al mismo sistema y se puedan medir por
 * separado con el campo `source` (docs/CONTEXT.md §1).
 *
 * Pasa por la misma validacion de disponibilidad y las mismas constraints que
 * el flujo web: un canal externo no puede saltarse la capacidad de una franja
 * ni sobrescribir una mesa ocupada.
 */
const SLUGS = SUCURSALES.map((s) => s.slug) as [string, ...string[]];

const entradaSchema = z.object({
  sucursalSlug: z.enum(SLUGS),
  fechaLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm"),
  numPersonas: z.coerce.number().int().min(1).max(7),
  nombre: z.string().trim().min(2).max(120),
  telefono: z.string().trim().min(8).max(20),
  email: z.string().trim().email().max(160).optional(),
  ocasion: z.enum(OCASIONES).optional(),
  notasCliente: z.string().trim().max(500).optional(),
  consentMarketing: z.boolean().default(false),
  source: z.enum(SOURCES).default("whatsapp_pani"),
});

/** Compara la API key en tiempo constante, para no filtrarla por timing. */
function claveValida(recibida: string | null): boolean {
  const esperada = process.env.PANI_API_KEY;
  if (!esperada || !recibida) return false;
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!process.env.PANI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "El endpoint externo no está configurado." },
      { status: 503 },
    );
  }

  const clave = req.headers.get("x-api-key");
  if (!claveValida(clave)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  // El límite va por clave, no por IP: Pani llama desde una sola IP y sería
  // un contador compartido con cualquier otro canal.
  if (!verificarLimite("externo:pani", 60, 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas solicitudes." },
      { status: 429 },
    );
  }

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const parsed = entradaSchema.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Datos inválidos.",
        detalles: parsed.error.issues.map((i) => ({
          campo: i.path.join("."),
          mensaje: i.message,
        })),
      },
      { status: 422 },
    );
  }

  const res = await crearReserva(parsed.data);

  if (!res.ok) {
    // 409 y no 400: los datos venían bien, es el estado del mundo el que
    // cambió (se llenó la franja, se ocupó la mesa).
    return NextResponse.json(
      { ok: false, error: res.error, campo: res.campo },
      { status: 409 },
    );
  }

  return NextResponse.json(
    { ok: true, codigoPublico: res.codigoPublico, reservationId: res.reservationId },
    { status: 201 },
  );
}

/** Sondeo de salud para que Pani sepa si el endpoint está vivo. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    configurado: Boolean(process.env.PANI_API_KEY),
    sucursales: SUCURSALES.map((s) => s.slug),
  });
}
