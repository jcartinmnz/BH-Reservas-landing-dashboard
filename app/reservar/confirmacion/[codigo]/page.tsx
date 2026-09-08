import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { branches, customers, reservations } from "@/lib/db/schema";
import { formatCR } from "@/lib/datetime";
import { nombreFranja } from "@/lib/franjas";
import { formatearTelefono } from "@/lib/telefono";
import { POLITICA_MESA } from "@/data/politicas";

export const metadata = { title: "Reserva confirmada" };
export const dynamic = "force-dynamic";

export default async function ConfirmacionPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const db = getDb();

  const [r] = await db
    .select({
      codigoPublico: reservations.codigoPublico,
      startsAt: reservations.startsAt,
      franja: reservations.franja,
      numPersonas: reservations.numPersonas,
      notasCliente: reservations.notasCliente,
      sucursal: branches.nombre,
      telefonoSucursal: branches.telefono,
      cliente: customers.nombre,
    })
    .from(reservations)
    .innerJoin(branches, eq(branches.id, reservations.branchId))
    .innerJoin(customers, eq(customers.id, reservations.customerId))
    .where(eq(reservations.codigoPublico, decodeURIComponent(codigo)))
    .limit(1);

  if (!r) notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-5 py-12">
      <div className="flex size-14 items-center justify-center rounded-full bg-support-bg text-support-on">
        <Check className="size-7" strokeWidth={3} />
      </div>

      <header>
        <h1 className="text-display">Listo</h1>
        <p className="mt-2 text-body text-bh-ink-700">
          {r.cliente}, te esperamos en {r.sucursal}.
        </p>
      </header>

      <div className="rounded-card bg-accent-bg p-5 text-center text-accent-on">
        <p className="text-overline">Tu código</p>
        <p className="mt-1 text-display tracking-wider">{r.codigoPublico}</p>
      </div>

      <dl className="rounded-card border border-bh-ink-200 bg-bh-white p-5">
        <Dato etiqueta="Sucursal" valor={r.sucursal} />
        <Dato etiqueta="Fecha" valor={formatCR(r.startsAt, "EEEE d 'de' MMMM")} />
        <Dato
          etiqueta="Hora"
          valor={`${formatCR(r.startsAt, "HH:mm")} · ${nombreFranja(r.franja)}`}
        />
        <Dato
          etiqueta="Personas"
          valor={`${r.numPersonas} ${r.numPersonas === 1 ? "persona" : "personas"}`}
        />
        {r.notasCliente && <Dato etiqueta="Notas" valor={r.notasCliente} />}
      </dl>

      <p className="text-caption text-bh-ink-500">
        Guardamos tu mesa {POLITICA_MESA.toleranciaLlegadaMin} minutos. Si vas a llegar más
        tarde, escribinos al{" "}
        <a href={`tel:${r.telefonoSucursal}`} className="font-bold underline">
          {r.telefonoSucursal ? formatearTelefono(r.telefonoSucursal) : ""}
        </a>{" "}
        y la mantenemos. Podés cancelar sin costo hasta{" "}
        {POLITICA_MESA.cancelacionSinPenalidadHoras} horas antes.
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
