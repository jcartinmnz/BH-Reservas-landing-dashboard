"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { reservations } from "@/lib/db/schema";
import { tokenValido } from "@/lib/tokens";
import { cancelarReserva } from "@/lib/reservas/crear";
import { verificarLimite } from "@/lib/rate-limit";

/**
 * Cancela desde el link del correo.
 *
 * El token se revalida aca: que la pagina lo haya verificado para renderizar
 * no sirve de nada si la action se puede llamar directo.
 */
export async function cancelarReservaAction(entrada: {
  reservationId: string;
  token: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!verificarLimite(`cancelar:${entrada.reservationId}`, 5, 60_000)) {
    return { ok: false, error: "Demasiados intentos. Esperá un minuto." };
  }

  const db = getDb();
  const [r] = await db
    .select({ id: reservations.id, hash: reservations.cancelTokenHash })
    .from(reservations)
    .where(eq(reservations.id, entrada.reservationId))
    .limit(1);

  if (!r?.hash || !tokenValido(entrada.token, r.hash)) {
    return { ok: false, error: "Ese enlace no es válido." };
  }

  const cancelada = await cancelarReserva(entrada.reservationId, "Cancelada por el cliente");
  return cancelada
    ? { ok: true }
    : { ok: false, error: "Esa reserva ya no se puede cancelar." };
}
