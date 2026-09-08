"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCRC } from "@/lib/money";
import { NOMBRE_OCASION, type Ocasion } from "@/data/politicas";
import { ETAPAS, NOMBRE_ETAPA, moverEtapa, type Etapa } from "./acciones";
import type { TarjetaEvento } from "@/lib/crm/consultas";

/**
 * Tablero del pipeline.
 *
 * El movimiento entre etapas es por menu, no por arrastrar: en tablet
 * (que es donde se usa el CRM en sala) el drag es fragil, y un cambio de etapa
 * mal hecho mueve dinero de lugar en las metricas.
 */
export function Pipeline({ eventos }: { eventos: TarjetaEvento[] }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pidiendoMotivo, setPidiendoMotivo] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  function mover(eventId: string, etapa: Etapa) {
    setError(null);
    if (etapa === "perdido") {
      setPidiendoMotivo(eventId);
      return;
    }
    iniciar(async () => {
      const res = await moverEtapa({ eventId, etapa });
      if (!res.ok) setError(res.error);
    });
  }

  function confirmarPerdida() {
    if (!pidiendoMotivo) return;
    iniciar(async () => {
      const res = await moverEtapa({
        eventId: pidiendoMotivo,
        etapa: "perdido",
        motivoPerdida: motivo,
      });
      if (res.ok) {
        setPidiendoMotivo(null);
        setMotivo("");
      } else setError(res.error);
    });
  }

  return (
    <>
      {error && (
        <p role="alert" className="rounded-control bg-danger-bg p-3 text-caption text-danger-on">
          {error}
        </p>
      )}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {ETAPAS.map((etapa) => {
          const columna = eventos.filter((e) => e.estadoPipeline === etapa);
          const valor = columna.reduce((s, e) => s + (e.totalConfirmado ?? e.totalEstimado), 0);

          return (
            <section key={etapa} className="flex w-72 shrink-0 flex-col">
              <header className="mb-2 flex items-baseline justify-between gap-2">
                <h2 className="text-caption font-bold">{NOMBRE_ETAPA[etapa]}</h2>
                <span className="text-caption text-bh-ink-500">{columna.length}</span>
              </header>
              {valor > 0 && (
                <p className="mb-2 text-caption text-bh-ink-500">{formatCRC(valor)}</p>
              )}

              <div className="flex flex-col gap-2">
                {columna.length === 0 && (
                  <p className="rounded-card border border-dashed border-bh-ink-200 p-4 text-center text-caption text-bh-ink-300">
                    Vacío
                  </p>
                )}

                {columna.map((e) => (
                  <article
                    key={e.eventId}
                    className="rounded-card border border-bh-ink-200 bg-bh-white p-3"
                  >
                    <Link href={`/admin/eventos/${e.eventId}`} className="block">
                      <p className="truncate font-bold">{e.cliente}</p>
                      <p className="text-caption text-bh-ink-500">
                        {NOMBRE_OCASION[e.ocasion as Ocasion] ?? e.ocasion} · {e.numPersonas} pax
                      </p>
                      <p className="mt-1.5 font-bold">
                        {formatCRC(e.totalConfirmado ?? e.totalEstimado)}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-caption text-bh-ink-500">
                        {e.fechaLocal}
                        {e.fechaFlexible && " (flexible)"}
                        {/* Un evento cerca sin confirmar es lo que hay que ver primero. */}
                        {e.diasRestantes >= 0 && e.diasRestantes <= 7 &&
                          e.estadoPipeline !== "confirmado" && (
                            <span className="flex items-center gap-1 font-bold text-warning-fg">
                              <AlertTriangle className="size-3" />
                              {e.diasRestantes}d
                            </span>
                          )}
                      </p>
                    </Link>

                    <select
                      aria-label={`Mover ${e.cliente} de etapa`}
                      value={e.estadoPipeline}
                      disabled={pendiente}
                      onChange={(ev) => mover(e.eventId, ev.target.value as Etapa)}
                      className="mt-2 min-h-9 w-full rounded-control border border-bh-ink-200 bg-bh-white px-2 text-caption"
                    >
                      {ETAPAS.map((et) => (
                        <option key={et} value={et}>{NOMBRE_ETAPA[et]}</option>
                      ))}
                    </select>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {pidiendoMotivo && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-5">
          <button
            type="button"
            aria-label="Cancelar"
            onClick={() => setPidiendoMotivo(null)}
            className="absolute inset-0 bg-bh-ink-900/30"
          />
          <div className="relative w-full max-w-sm rounded-card bg-bh-white p-5 shadow-lift">
            <h2 className="text-heading">¿Por qué se perdió?</h2>
            <p className="mt-1 text-caption text-bh-ink-500">
              Es el dato que después dice qué hay que cambiar. Sin esto, el evento se
              pierde sin dejar aprendizaje.
            </p>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              maxLength={500}
              autoFocus
              className="input-bh mt-3 resize-none"
              placeholder="Precio, fecha no disponible, se fue con la competencia…"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={confirmarPerdida}
                disabled={!motivo.trim() || pendiente}
                className={cn(
                  "min-h-touch flex-1 rounded-control bg-bh-ink-900 px-4 font-bold text-bh-white",
                  (!motivo.trim() || pendiente) && "opacity-50",
                )}
              >
                {pendiente && <Loader2 className="mr-2 inline size-4 animate-spin" />}
                Marcar perdido
              </button>
              <button
                type="button"
                onClick={() => setPidiendoMotivo(null)}
                className="min-h-touch rounded-control px-4 font-bold text-bh-ink-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
