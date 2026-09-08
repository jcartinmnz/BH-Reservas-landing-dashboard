import { notFound } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, FileText } from "lucide-react";
import { getDb } from "@/lib/db";
import { eventActivity, staff } from "@/lib/db/schema";
import { obtenerSesion, PUEDE } from "@/lib/auth/sesion";
import { eventoPorId } from "@/lib/crm/consultas";
import { DetalleEvento } from "./DetalleEvento";

export const dynamic = "force-dynamic";

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const sesion = (await obtenerSesion())!;
  const { id } = await params;

  const evento = await eventoPorId(sesion, id);
  if (!evento) notFound();

  const db = getDb();
  const actividad = await db
    .select({
      id: eventActivity.id,
      tipo: eventActivity.tipo,
      contenido: eventActivity.contenido,
      createdAt: eventActivity.createdAt,
      autor: staff.nombre,
    })
    .from(eventActivity)
    .leftJoin(staff, eq(staff.id, eventActivity.autorId))
    .where(eq(eventActivity.eventId, id))
    .orderBy(desc(eventActivity.createdAt));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/admin/eventos"
          className="flex items-center gap-2 text-caption font-bold text-bh-ink-700"
        >
          <ArrowLeft className="size-4" /> Pipeline
        </Link>
        <a
          href={`/admin/eventos/${id}/pdf`}
          target="_blank"
          rel="noopener"
          className="flex min-h-touch items-center gap-2 rounded-control border border-bh-ink-900 px-4 text-caption font-bold"
        >
          <FileText className="size-4" /> Cotización en PDF
        </a>
      </div>

      <DetalleEvento
        evento={evento}
        actividad={actividad}
        puedeEditar={PUEDE.editarCotizacion(sesion)}
        puedeDeposito={PUEDE.registrarDeposito(sesion)}
      />
    </div>
  );
}
