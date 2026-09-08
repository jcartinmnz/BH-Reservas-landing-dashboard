"use client";

import { useRouter } from "next/navigation";
import { Download, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCRC } from "@/lib/money";
import { formatearTelefono } from "@/lib/telefono";

type Cliente = {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  createdAt: string;
  ultimaVisita: string | null;
  totalReservas: number;
  noShows: number;
  completadas: number;
  ticketPromedio: number;
  esRecurrente: boolean;
  consentMarketing: boolean;
  unsubscribedAt: Date | null;
};

export function TablaClientes({
  clientes, busqueda, puedeExportar,
}: {
  clientes: Cliente[];
  busqueda: string;
  puedeExportar: boolean;
}) {
  const router = useRouter();

  /**
   * Export para la base de WhatsApp.
   *
   * Solo salen los que dieron consentimiento y no se dieron de baja: mandarle
   * promociones a quien no lo pidio incumple la Ley 8968.
   */
  function exportar() {
    const aptos = clientes.filter((c) => c.consentMarketing && !c.unsubscribedAt);
    const filas = [
      ["Nombre", "Teléfono", "Correo", "Reservas", "No-shows", "Última visita", "Ticket promedio"],
      ...aptos.map((c) => [
        c.nombre,
        c.telefono,
        c.email ?? "",
        String(c.totalReservas),
        String(c.noShows),
        c.ultimaVisita ? c.ultimaVisita.slice(0, 10) : "",
        String(Math.round(c.ticketPromedio / 100)),
      ]),
    ];
    const csv = "﻿" + filas.map((f) => f.map((c) => `"${c}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-con-consentimiento-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const conConsentimiento = clientes.filter((c) => c.consentMarketing && !c.unsubscribedAt).length;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title">Clientes</h1>
          <p className="text-caption text-bh-ink-500">
            {clientes.length} en la lista · {conConsentimiento} con consentimiento de marketing
          </p>
        </div>

        <div className="flex items-end gap-2">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const valor = new FormData(e.currentTarget).get("q") as string;
              router.push(valor ? `/admin/clientes?q=${encodeURIComponent(valor)}` : "/admin/clientes");
            }}
          >
            <label className="flex flex-col gap-1">
              <span className="text-overline text-bh-ink-500">Buscar</span>
              <div className="flex items-center gap-2 rounded-control border border-bh-ink-200 bg-bh-white px-3">
                <Search className="size-4 text-bh-ink-500" />
                <input
                  name="q" defaultValue={busqueda} placeholder="Nombre o teléfono"
                  className="min-h-touch border-0 bg-transparent text-caption outline-none"
                />
              </div>
            </label>
          </form>

          {puedeExportar && (
            <button
              type="button" onClick={exportar}
              className="flex min-h-touch items-center gap-2 rounded-control border border-bh-ink-900 px-4 text-caption font-bold"
            >
              <Download className="size-4" /> CSV
            </button>
          )}
        </div>
      </header>

      {puedeExportar && (
        <p className="rounded-control bg-bh-ink-100 p-3 text-caption text-bh-ink-700">
          El CSV incluye solo a quienes dieron consentimiento y no se dieron de baja.
          Mandar promociones a quien no lo pidió incumple la Ley 8968.
        </p>
      )}

      <div className="overflow-x-auto rounded-card border border-bh-ink-200 bg-bh-white">
        <table className="w-full text-caption">
          <thead>
            <tr className="border-b border-bh-ink-200 text-left">
              <th className="p-3 font-bold">Cliente</th>
              <th className="p-3 font-bold">Teléfono</th>
              <th className="p-3 text-right font-bold">Reservas</th>
              <th className="p-3 text-right font-bold">No-shows</th>
              <th className="p-3 font-bold">Última visita</th>
              <th className="p-3 text-right font-bold">Ticket prom.</th>
              <th className="p-3 font-bold">Marketing</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-bh-ink-500">
                  {busqueda ? "Nadie coincide con esa búsqueda." : "Todavía no hay clientes."}
                </td>
              </tr>
            )}
            {clientes.map((c) => (
              <tr key={c.id} className="border-b border-bh-ink-200 last:border-0">
                <td className="p-3">
                  <span className="font-bold">{c.nombre}</span>
                  {c.esRecurrente && (
                    <Badge estado="confirmada" className="ml-2">Recurrente</Badge>
                  )}
                  {c.noShows >= 2 && (
                    <Badge estado="no_show" className="ml-2">Riesgo</Badge>
                  )}
                </td>
                <td className="p-3">
                  <a href={`tel:${c.telefono}`} className="underline">
                    {formatearTelefono(c.telefono)}
                  </a>
                </td>
                <td className="p-3 text-right">{c.totalReservas}</td>
                <td className="p-3 text-right">{c.noShows || "—"}</td>
                <td className="p-3">
                  {c.ultimaVisita ? c.ultimaVisita.slice(0, 10) : "—"}
                </td>
                <td className="p-3 text-right">
                  {c.ticketPromedio > 0 ? formatCRC(c.ticketPromedio) : "—"}
                </td>
                <td className="p-3">
                  {c.unsubscribedAt ? (
                    <span className="text-bh-ink-500">De baja</span>
                  ) : c.consentMarketing ? (
                    <Badge estado="confirmada">Sí</Badge>
                  ) : (
                    <span className="text-bh-ink-500">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
