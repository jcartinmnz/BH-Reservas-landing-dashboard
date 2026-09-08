"use server";

/**
 * Server actions del flujo publico de reserva.
 *
 * Todo lo que llega del cliente se valida con Zod aca aunque el formulario ya
 * lo haya validado: el formulario es comodidad, esto es la frontera real.
 */
import { headers } from "next/headers";
import { formatCR } from "@/lib/datetime";
import { sucursalPorSlug } from "@/data/sucursales";
import { horariosDisponibles } from "@/lib/availability/queries";
import { agruparPorFranja, EXPLICACION_MOTIVO, type Slot } from "@/lib/availability/engine";
import { crearReserva } from "@/lib/reservas/crear";
import { consultaHorariosSchema, reservaMesaSchema } from "@/lib/reservas/schema";
import { enviar } from "@/lib/notifications";
import { confirmacionMesa } from "@/lib/notifications/plantillas";
import { nombreFranja, type Franja } from "@/lib/franjas";
import { verificarLimite } from "@/lib/rate-limit";

export type RespuestaHorarios =
  | { ok: true; grupos: { franja: Franja; nombre: string; slots: Slot[] }[]; hayCupo: boolean }
  | { ok: false; error: string };

export async function obtenerHorarios(entrada: unknown): Promise<RespuestaHorarios> {
  const parsed = consultaHorariosSchema.safeParse(entrada);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { sucursalSlug, fechaLocal, numPersonas } = parsed.data;

  try {
    const res = await horariosDisponibles(sucursalSlug, fechaLocal, numPersonas);
    if (!res) return { ok: false, error: "Esa sucursal no existe." };

    const grupos = agruparPorFranja(res.slots).map((g) => ({
      ...g,
      nombre: nombreFranja(g.franja),
    }));

    return { ok: true, grupos, hayCupo: res.slots.some((s) => s.disponible) };
  } catch (e) {
    console.error("Falló consultar horarios:", e);
    return { ok: false, error: "No pudimos consultar la disponibilidad." };
  }
}

export type RespuestaReserva =
  | { ok: true; codigoPublico: string }
  | { ok: false; error: string; campo?: string };

export async function enviarReserva(entrada: unknown): Promise<RespuestaReserva> {
  // Anti-spam en el endpoint público.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
  if (!verificarLimite(`reserva:${ip}`, 5, 60_000)) {
    return { ok: false, error: "Demasiados intentos. Esperá un minuto." };
  }

  const parsed = reservaMesaSchema.safeParse(entrada);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Datos inválidos", campo: String(issue?.path[0]) };
  }

  const d = parsed.data;
  const resultado = await crearReserva({
    sucursalSlug: d.sucursalSlug,
    fechaLocal: d.fechaLocal,
    hora: d.hora,
    numPersonas: d.numPersonas,
    nombre: d.nombre,
    telefono: d.telefono,
    email: d.email || undefined,
    ocasion: d.ocasion,
    notasCliente: d.notasCliente,
    consentMarketing: d.consentMarketing,
    source: "web",
  });

  if (!resultado.ok) {
    return { ok: false, error: resultado.error, campo: resultado.campo };
  }

  // El correo es un extra: si falla, la reserva ya está guardada y el cliente
  // ya tiene su código en pantalla.
  if (d.email) {
    const sucursal = sucursalPorSlug(d.sucursalSlug)!;
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const startsAt = new Date(`${d.fechaLocal}T${d.hora}:00-06:00`);
    const correo = confirmacionMesa({
      nombre: d.nombre,
      codigoPublico: resultado.codigoPublico,
      sucursal: sucursal.nombre,
      telefonoSucursal: sucursal.telefono,
      startsAt,
      franja: (await horariosDisponibles(d.sucursalSlug, d.fechaLocal, d.numPersonas))
        ?.slots.find((s) => s.hora === d.hora)?.franja ?? "fast_lunch",
      numPersonas: d.numPersonas,
      urlGestion: `${base}/reservar/gestionar/${resultado.token}?r=${resultado.reservationId}`,
    });

    await enviar({
      tipo: "confirmacion_mesa",
      canal: "email",
      para: d.email,
      asunto: correo.asunto,
      html: correo.html,
      texto: correo.texto,
      reservationId: resultado.reservationId,
    });
  }

  return { ok: true, codigoPublico: resultado.codigoPublico };
}

export { EXPLICACION_MOTIVO, formatCR };
