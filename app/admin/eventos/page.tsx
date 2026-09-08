import { obtenerSesion, PUEDE } from "@/lib/auth/sesion";
import { pipelineEventos } from "@/lib/crm/consultas";
import { formatCRC } from "@/lib/money";
import { Pipeline } from "./Pipeline";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pipeline de eventos" };

export default async function EventosPage() {
  const sesion = (await obtenerSesion())!;
  if (!PUEDE.verPipeline(sesion)) redirect("/admin");

  const eventos = await pipelineEventos(sesion);

  const vivos = eventos.filter(
    (e) => e.estadoPipeline !== "perdido" && e.estadoPipeline !== "realizado",
  );
  // Valor ponderado: sumar todo sin ponderar da una cifra que no significa nada.
  const valorPonderado = vivos.reduce(
    (s, e) => s + Math.round(((e.totalConfirmado ?? e.totalEstimado) * e.probabilidadPct) / 100),
    0,
  );
  const confirmados = eventos.filter((e) => e.estadoPipeline === "confirmado");
  const valorConfirmado = confirmados.reduce(
    (s, e) => s + (e.totalConfirmado ?? e.totalEstimado),
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title">Eventos</h1>
          <p className="text-caption text-bh-ink-500">
            {vivos.length} en pipeline · {confirmados.length} confirmados
          </p>
        </div>
        <dl className="flex gap-5">
          <div>
            <dt className="text-overline text-bh-ink-500">Pipeline ponderado</dt>
            <dd className="text-heading">{formatCRC(valorPonderado)}</dd>
          </div>
          <div>
            <dt className="text-overline text-bh-ink-500">Confirmado</dt>
            <dd className="text-heading">{formatCRC(valorConfirmado)}</dd>
          </div>
        </dl>
      </header>

      <Pipeline eventos={eventos} />
    </div>
  );
}
