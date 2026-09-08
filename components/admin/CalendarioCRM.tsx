"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, NOMBRE_ESTADO } from "@/components/ui/badge";
import { PanelReserva } from "./PanelReserva";
import type { ReservaCalendario } from "@/lib/crm/consultas";

/**
 * Calendario del CRM.
 *
 * Escrito a mano en vez de react-big-calendar por dos razones: esa libreria
 * trae su propia hoja de estilos que pelea con los design tokens de la marca
 * ("nada de plantilla generica de SaaS"), y sus peers todavia no declaran
 * React 19. El costo es este archivo; la ganancia es control total del render
 * y cero conflicto de dependencias.
 */

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Un color por estado, respetando la regla de contraste de la marca. */
const COLOR_ESTADO: Record<string, string> = {
  pendiente: "bg-accent-bg text-accent-on",
  confirmada: "bg-support-bg text-support-on",
  sentada: "bg-bh-ink-900 text-bh-white",
  completada: "bg-bh-ink-200 text-bh-ink-700",
  cancelada: "bg-danger-bg text-danger-on",
  no_show: "bg-danger-fg text-bh-white",
};

type Props = {
  reservas: ReservaCalendario[];
  anio: number;
  mes: number;
  onNavegar: (anio: number, mes: number) => void;
  puedeEditarNotas: boolean;
};

export function CalendarioCRM({ reservas, anio, mes, onNavegar, puedeEditarNotas }: Props) {
  const [abierta, setAbierta] = useState<ReservaCalendario | null>(null);

  const porDia = useMemo(() => {
    const mapa = new Map<string, ReservaCalendario[]>();
    for (const r of reservas) {
      const lista = mapa.get(r.fechaLocal) ?? [];
      lista.push(r);
      mapa.set(r.fechaLocal, lista);
    }
    return mapa;
  }, [reservas]);

  const celdas = useMemo(() => {
    const offset = new Date(Date.UTC(anio, mes, 1)).getUTCDay();
    const dias = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
    const lista: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= dias; d++) {
      lista.push(`${anio}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    return lista;
  }, [anio, mes]);

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => (mes === 0 ? onNavegar(anio - 1, 11) : onNavegar(anio, mes - 1))}
          className="flex size-touch items-center justify-center rounded-control hover:bg-bh-ink-100"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h2 className="text-heading capitalize">
          {MESES[mes]} {anio}
        </h2>
        <button
          type="button"
          aria-label="Mes siguiente"
          onClick={() => (mes === 11 ? onNavegar(anio + 1, 0) : onNavegar(anio, mes + 1))}
          className="flex size-touch items-center justify-center rounded-control hover:bg-bh-ink-100"
        >
          <ChevronRight className="size-5" />
        </button>
        <p className="ml-auto text-caption text-bh-ink-500">
          {reservas.length} {reservas.length === 1 ? "reserva" : "reservas"}
        </p>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-card border border-bh-ink-200 bg-bh-ink-200">
        {DIAS.map((d) => (
          <div key={d} className="bg-bh-white py-2 text-center text-overline text-bh-ink-500">
            {d}
          </div>
        ))}

        {celdas.map((fecha, i) => {
          if (!fecha) return <div key={`v${i}`} className="min-h-28 bg-bh-cream" />;
          const delDia = porDia.get(fecha) ?? [];
          const comensales = delDia.reduce((s, r) => s + r.numPersonas, 0);

          return (
            <div key={fecha} className="min-h-28 bg-bh-white p-1.5">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-caption font-bold">{Number(fecha.slice(-2))}</span>
                {comensales > 0 && (
                  <span className="text-caption text-bh-ink-500">{comensales} pax</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                {delDia.slice(0, 3).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setAbierta(r)}
                    className={cn(
                      "truncate rounded px-1.5 py-0.5 text-left text-[11px] font-bold transition hover:opacity-80",
                      COLOR_ESTADO[r.estado],
                    )}
                    title={`${r.cliente} · ${r.numPersonas} pax · ${NOMBRE_ESTADO[r.estado as keyof typeof NOMBRE_ESTADO]}`}
                  >
                    {r.startsAt
                      ? new Date(r.startsAt).toLocaleTimeString("es-CR", {
                          hour: "2-digit", minute: "2-digit",
                          timeZone: "America/Costa_Rica", hour12: false,
                        })
                      : ""}{" "}
                    {r.cliente}
                  </button>
                ))}
                {delDia.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setAbierta(delDia[3])}
                    className="px-1.5 text-left text-[11px] text-bh-ink-500 underline"
                  >
                    +{delDia.length - 3} más
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {Object.keys(NOMBRE_ESTADO).map((e) => (
          <Badge key={e} estado={e as keyof typeof NOMBRE_ESTADO}>
            {NOMBRE_ESTADO[e as keyof typeof NOMBRE_ESTADO]}
          </Badge>
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
