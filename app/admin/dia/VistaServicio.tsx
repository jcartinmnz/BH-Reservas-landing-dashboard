"use client";

import { useState } from "react";
import { Clock, StickyNote, Users } from "lucide-react";
import { Badge, NOMBRE_ESTADO } from "@/components/ui/badge";
import { PanelReserva } from "@/components/admin/PanelReserva";
import { cn } from "@/lib/utils";
import { formatearTelefono } from "@/lib/telefono";
import type { ReservaCalendario } from "@/lib/crm/consultas";

type Grupo = {
  franja: string;
  nombre: string;
  enRecuperacion: boolean;
  reservas: ReservaCalendario[];
};

export function VistaServicio({
  grupos, puedeEditarNotas,
}: {
  grupos: Grupo[];
  puedeEditarNotas: boolean;
}) {
  const [abierta, setAbierta] = useState<ReservaCalendario | null>(null);

  return (
    <>
      <div className="flex flex-col gap-6">
        {grupos.map((g) => (
          <section key={g.franja}>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-heading">{g.nombre}</h2>
              {/* La franja a recuperar se marca también acá, no solo en el
                  dashboard: el anfitrión ve en el turno si está vacía. */}
              {g.enRecuperacion && <Badge estado="confirmada">Franja a recuperar</Badge>}
              <span className="ml-auto text-caption text-bh-ink-500">
                {g.reservas.reduce((s, r) => s + r.numPersonas, 0)} pax
              </span>
            </div>

            {g.reservas.length === 0 ? (
              <p className="rounded-card border border-dashed border-bh-ink-200 p-5 text-center text-caption text-bh-ink-500">
                Sin reservas en esta franja
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {g.reservas.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setAbierta(r)}
                      className={cn(
                        "flex w-full items-center gap-4 rounded-card border border-bh-ink-200 bg-bh-white p-4 text-left transition hover:border-bh-ink-900",
                        (r.estado === "cancelada" || r.estado === "no_show") && "opacity-50",
                      )}
                    >
                      <span className="flex min-w-14 items-center gap-1.5 font-bold">
                        <Clock className="size-3.5 text-bh-ink-500" />
                        {new Date(r.startsAt).toLocaleTimeString("es-CR", {
                          hour: "2-digit", minute: "2-digit",
                          timeZone: "America/Costa_Rica", hour12: false,
                        })}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{r.cliente}</span>
                        <span className="block text-caption text-bh-ink-500">
                          {formatearTelefono(r.telefono)}
                          {r.mesa && ` · Mesa ${r.mesa}`}
                        </span>
                      </span>

                      <span className="flex items-center gap-1.5 text-caption">
                        <Users className="size-3.5 text-bh-ink-500" />
                        {r.numPersonas}
                      </span>

                      {(r.notasCliente || r.notasInternas) && (
                        <StickyNote className="size-4 shrink-0 text-bh-ink-500" />
                      )}

                      <Badge estado={r.estado as keyof typeof NOMBRE_ESTADO}>
                        {NOMBRE_ESTADO[r.estado as keyof typeof NOMBRE_ESTADO]}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {abierta && (
        <PanelReserva
          reserva={abierta}
          onCerrar={() => setAbierta(null)}
          puedeEditarNotas={puedeEditarNotas}
        />
      )}
    </>
  );
}
