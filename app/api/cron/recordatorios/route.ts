import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { branches, customers, reservations } from "@/lib/db/schema";
import { enviar } from "@/lib/notifications";
import { recordatorio } from "@/lib/notifications/plantillas";
import { firmarToken } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recordatorios automaticos: 24 horas y 2 horas antes.
 *
 * Pensado para correr desde Vercel Cron cada 15 minutos. La idempotencia no
 * depende de la puntualidad del cron: `notifications_log` tiene un indice
 * unico por (reserva, tipo), asi que aunque el cron dispare de mas, cada
 * recordatorio sale una sola vez.
 */
function autorizado(req: Request): boolean {
  const esperado = process.env.CRON_SECRET;
  // Vercel Cron manda este header automáticamente.
  const recibido = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!esperado) return false;
  if (!recibido) return false;
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function enviarTanda(horas: 24 | 2) {
  const db = getDb();
  const ahora = Date.now();
  // Ventana de 30 minutos alrededor del objetivo: el cron corre cada 15.
  const objetivo = ahora + horas * 3600_000;
  const desde = new Date(objetivo - 15 * 60_000);
  const hasta = new Date(objetivo + 15 * 60_000);

  const pendientes = await db
    .select({
      id: reservations.id,
      codigoPublico: reservations.codigoPublico,
      startsAt: reservations.startsAt,
      franja: reservations.franja,
      numPersonas: reservations.numPersonas,
      cliente: customers.nombre,
      email: customers.email,
      sucursal: branches.nombre,
      telefonoSucursal: branches.telefono,
    })
    .from(reservations)
    .innerJoin(customers, eq(customers.id, reservations.customerId))
    .innerJoin(branches, eq(branches.id, reservations.branchId))
    .where(
      and(
        gte(reservations.startsAt, desde),
        lte(reservations.startsAt, hasta),
        eq(reservations.estado, "confirmada"),
        isNotNull(customers.email),
      ),
    );

  let enviados = 0;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  for (const r of pendientes) {
    const token = firmarToken(r.id);
    const correo = recordatorio(
      {
        nombre: r.cliente,
        codigoPublico: r.codigoPublico,
        sucursal: r.sucursal,
        telefonoSucursal: r.telefonoSucursal ?? "",
        startsAt: r.startsAt,
        franja: r.franja,
        numPersonas: r.numPersonas,
        urlGestion: `${base}/reservar/gestionar/${token}?r=${r.id}`,
      },
      horas,
    );

    const res = await enviar({
      tipo: horas === 24 ? "recordatorio_24h" : "recordatorio_2h",
      canal: "email",
      para: r.email!,
      asunto: correo.asunto,
      html: correo.html,
      texto: correo.texto,
      reservationId: r.id,
    });

    if (res.ok && !res.omitido) enviados += 1;
  }

  return { candidatos: pendientes.length, enviados };
}

export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const [de24, de2] = await Promise.all([enviarTanda(24), enviarTanda(2)]);
    return NextResponse.json({ ok: true, recordatorio24h: de24, recordatorio2h: de2 });
  } catch (e) {
    console.error("Falló la tanda de recordatorios:", e);
    return NextResponse.json(
      { ok: false, error: "Falló el envío de recordatorios." },
      { status: 500 },
    );
  }
}
