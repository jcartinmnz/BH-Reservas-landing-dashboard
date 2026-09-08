import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { branches, reservations } from "@/lib/db/schema";
import { tokenValido } from "@/lib/tokens";
import { formatCR } from "@/lib/datetime";
import { nombreFranja } from "@/lib/franjas";
import { GestionReserva } from "./GestionReserva";

export const metadata = { title: "Tu reserva" };
export const dynamic = "force-dynamic";

/**
 * Gestion de la reserva sin login.
 *
 * El link del correo trae un token firmado; la base guarda solo su hash, y la
 * comparacion es en tiempo constante. Sin el token no se puede ver ni cancelar
 * la reserva de otro, aunque se conozca el id.
 */
export default async function GestionarPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ r?: string }>;
}) {
  const { token } = await params;
  const { r: reservationId } = await searchParams;
  if (!reservationId) notFound();

  const db = getDb();
  const [reserva] = await db
    .select({
      id: reservations.id,
      codigoPublico: reservations.codigoPublico,
      startsAt: reservations.startsAt,
      franja: reservations.franja,
      numPersonas: reservations.numPersonas,
      estado: reservations.estado,
      cancelTokenHash: reservations.cancelTokenHash,
      sucursal: branches.nombre,
    })
    .from(reservations)
    .innerJoin(branches, eq(branches.id, reservations.branchId))
    .where(eq(reservations.id, reservationId))
    .limit(1);

  // Mismo 404 para "no existe" y "token inválido": distinguirlos permitiría
  // averiguar qué ids existen.
  if (!reserva?.cancelTokenHash || !tokenValido(token, reserva.cancelTokenHash)) {
    notFound();
  }

  return (
    <GestionReserva
      reservationId={reserva.id}
      codigoPublico={reserva.codigoPublico}
      sucursal={reserva.sucursal}
      cuando={formatCR(reserva.startsAt, "EEEE d 'de' MMMM, HH:mm")}
      franja={nombreFranja(reserva.franja)}
      numPersonas={reserva.numPersonas}
      estado={reserva.estado}
      token={token}
    />
  );
}
