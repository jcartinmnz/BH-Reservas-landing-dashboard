import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { branches, customers, events, reservations } from "@/lib/db/schema";
import { formatCRC } from "@/lib/money";
import { NOMBRE_OCASION, POLITICA_EVENTO } from "@/data/politicas";
import { formatCR } from "@/lib/datetime";

export const metadata = { title: "Solicitud enviada" };
export const dynamic = "force-dynamic";

export default async function EnviadoPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const db = getDb();

  const [e] = await db
    .select({
      codigoPublico: reservations.codigoPublico,
      startsAt: reservations.startsAt,
      numPersonas: reservations.numPersonas,
      ocasion: events.ocasion,
      totalEstimado: events.totalEstimadoCentimos,
      deposito: events.depositoCentimos,
      fechaFlexible: events.fechaFlexible,
      sucursal: branches.nombre,
      cliente: customers.nombre,
    })
    .from(events)
    .innerJoin(reservations, eq(reservations.id, events.reservationId))
    .innerJoin(branches, eq(branches.id, reservations.branchId))
    .innerJoin(customers, eq(customers.id, reservations.customerId))
    .where(eq(reservations.codigoPublico, decodeURIComponent(codigo)))
    .limit(1);

  if (!e) notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-5 py-12">
      <div className="flex size-14 items-center justify-center rounded-full bg-support-bg text-support-on">
        <Clock className="size-7" />
      </div>

      <header>
        <h1 className="text-display">Recibido</h1>
        <p className="mt-2 text-body text-bh-ink-700">
          {e.cliente}, un asesor te contacta en menos de{" "}
          {POLITICA_EVENTO.respuestaPrometidaHoras} horas para cerrar los detalles.
        </p>
      </header>

      <div className="rounded-card bg-accent-bg p-5 text-center text-accent-on">
        <p className="text-overline">Tu referencia</p>
        <p className="mt-1 text-title tracking-wider">{e.codigoPublico}</p>
      </div>

      <dl className="rounded-card border border-bh-ink-200 bg-bh-white p-5">
        <Dato etiqueta="Ocasión" valor={NOMBRE_OCASION[e.ocasion]} />
        <Dato etiqueta="Sucursal" valor={e.sucursal} />
        <Dato
          etiqueta="Fecha"
          valor={`${formatCR(e.startsAt, "d 'de' MMMM")}${e.fechaFlexible ? " (flexible)" : ""}`}
        />
        <Dato etiqueta="Personas" valor={String(e.numPersonas)} />
        <Dato etiqueta="Total estimado" valor={formatCRC(Number(e.totalEstimado))} />
        {e.deposito && (
          <Dato
            etiqueta={`Depósito (${POLITICA_EVENTO.depositoPct}%)`}
            valor={formatCRC(Number(e.deposito))}
          />
        )}
      </dl>

      <p className="rounded-card border border-bh-ink-200 p-4 text-caption text-bh-ink-700">
        <strong>Esto todavía no es una reserva confirmada.</strong> El precio final lo confirma
        el equipo, y el evento queda apartado cuando se registra el depósito. El menú final se
        define {POLITICA_EVENTO.confirmacionMenuDiasAntes} días antes.
      </p>

      <Link href="/" className="text-caption font-bold underline">
        Volver al inicio
      </Link>
    </main>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-bh-ink-200 py-2.5 last:border-0">
      <dt className="text-caption text-bh-ink-500">{etiqueta}</dt>
      <dd className="text-right font-bold">{valor}</dd>
    </div>
  );
}
