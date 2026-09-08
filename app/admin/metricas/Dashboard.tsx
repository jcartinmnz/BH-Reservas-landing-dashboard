"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { Barras, type Punto } from "@/components/charts/Barras";
import { Tarjeta } from "@/components/charts/Tarjeta";
import { colorDe, RESALTE, APAGADO } from "@/lib/charts/paleta";
import { formatCRC } from "@/lib/money";
import { DEFINICION_FRANJAS, type Franja } from "@/lib/franjas";
import { NOMBRE_DIA, DIAS_DEBILES, type DiaSemana } from "@/lib/datetime";
import { NOMBRE_OCASION, type Ocasion } from "@/data/politicas";
import { NOMBRE_ETAPA, type Etapa } from "@/lib/crm/estados";
import type { PorDimension, Ocupacion, MetricasEventos, MetricasClientes, ResumenReservas, Rango } from "@/lib/crm/metricas";

const NOMBRE_CANAL: Record<string, string> = {
  web: "Link web",
  whatsapp_pani: "WhatsApp (Pani)",
  instagram: "Instagram",
  telefono: "Teléfono",
  walk_in: "Walk-in",
};

type Props = {
  rango: Rango;
  previo: Rango;
  resumen: ResumenReservas;
  deltas: Record<string, number | null>;
  franjas: PorDimension[];
  dias: PorDimension[];
  canales: PorDimension[];
  sucursales: PorDimension[];
  ocupacion: Ocupacion[];
  eventos: MetricasEventos;
  clientes: MetricasClientes;
  listaSucursales: { id: string; nombre: string }[];
  puedeExportar: boolean;
  puedeElegirSucursal: boolean;
};

export function Dashboard(p: Props) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(clave: string, valor: string) {
    const q = new URLSearchParams(params.toString());
    if (valor) q.set(clave, valor);
    else q.delete(clave);
    router.push(`/admin/metricas?${q.toString()}`);
  }

  /** Franjas en orden fijo, con la de recuperación destacada. */
  const datosFranja: Punto[] = Object.values(DEFINICION_FRANJAS)
    .sort((a, b) => a.orden - b.orden)
    .map((f) => ({
      etiqueta: f.nombre,
      valor: p.franjas.find((x) => x.clave === f.codigo)?.reservas ?? 0,
      destacado: f.enRecuperacion,
    }));

  /** Días de semana con lunes a jueves destacados: es el dolor conocido. */
  const datosDia: Punto[] = ([1, 2, 3, 4, 5, 6, 0] as DiaSemana[]).map((d) => ({
    etiqueta: NOMBRE_DIA[d],
    valor: p.dias.find((x) => Number(x.clave) === d)?.reservas ?? 0,
    destacado: DIAS_DEBILES.includes(d),
  }));

  const datosCanal: Punto[] = p.canales.map((c, i) => ({
    etiqueta: NOMBRE_CANAL[c.clave] ?? c.clave,
    valor: c.reservas,
    color: colorDe(i),
  }));

  const datosSucursal: Punto[] = p.sucursales.map((s, i) => ({
    etiqueta: s.clave, valor: s.reservas, color: colorDe(i),
  }));

  const datosEtapa: Punto[] = p.eventos.porEtapa.map((e, i) => ({
    etiqueta: NOMBRE_ETAPA[e.etapa as Etapa] ?? e.etapa,
    valor: e.cantidad,
    color: colorDe(i),
  }));

  const datosOcasion: Punto[] = p.eventos.porOcasion
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 6)
    .map((o, i) => ({
      etiqueta: NOMBRE_OCASION[o.ocasion as Ocasion] ?? o.ocasion,
      valor: o.cantidad,
      color: colorDe(i),
    }));

  const tardeada = p.franjas.find((f) => f.clave === "tardeada_social")?.reservas ?? 0;
  const totalFranjas = p.franjas.reduce((s, f) => s + f.reservas, 0);
  const pctTardeada = totalFranjas > 0 ? ((tardeada / totalFranjas) * 100).toFixed(1) : "0";

  const reservasDebiles = datosDia
    .filter((d) => d.destacado)
    .reduce((s, d) => s + d.valor, 0);
  const totalDias = datosDia.reduce((s, d) => s + d.valor, 0);
  const pctDebiles = totalDias > 0 ? ((reservasDebiles / totalDias) * 100).toFixed(1) : "0";

  function exportarCsv() {
    const filas: string[][] = [
      ["Métrica", "Valor"],
      ["Período", `${p.rango.desde} a ${p.rango.hasta}`],
      ["Reservas totales", String(p.resumen.total)],
      ["Confirmadas", String(p.resumen.confirmadas)],
      ["Canceladas", String(p.resumen.canceladas)],
      ["No-shows", String(p.resumen.noShows)],
      ["Tasa de cancelación %", String(p.resumen.tasaCancelacion)],
      ["Tasa de no-show %", String(p.resumen.tasaNoShow)],
      ["Comensales", String(p.resumen.comensales)],
      ["Promedio por reserva", String(p.resumen.promedioPorReserva)],
      ["Lead time (días)", String(p.resumen.leadTimeDias)],
      ["Conversión de eventos %", String(p.eventos.tasaConversion)],
      ["Valor en pipeline", String(p.eventos.valorPipeline / 100)],
      ["Valor confirmado", String(p.eventos.valorConfirmado / 100)],
      ["Ticket promedio evento", String(p.eventos.ticketPromedio / 100)],
      ["Clientes nuevos", String(p.clientes.nuevos)],
      ["Clientes recurrentes", String(p.clientes.recurrentes)],
      [],
      ["Franja", "Reservas", "Comensales"],
      ...Object.values(DEFINICION_FRANJAS)
        .sort((a, b) => a.orden - b.orden)
        .map((f) => {
          const d = p.franjas.find((x) => x.clave === f.codigo);
          return [f.nombre, String(d?.reservas ?? 0), String(d?.comensales ?? 0)];
        }),
      [],
      ["Canal", "Reservas"],
      ...p.canales.map((c) => [NOMBRE_CANAL[c.clave] ?? c.clave, String(c.reservas)]),
    ];

    // BOM para que Excel en español abra los acentos bien.
    const csv = "﻿" + filas.map((f) => f.map((c) => `"${c ?? ""}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `metricas-${p.rango.desde}-a-${p.rango.hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title">Métricas</h1>
          <p className="text-caption text-bh-ink-500">
            {p.rango.desde} a {p.rango.hasta} · comparado con {p.previo.desde} a {p.previo.hasta}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-overline text-bh-ink-500">Desde</span>
            <input
              type="date" defaultValue={p.rango.desde}
              onChange={(e) => setParam("desde", e.target.value)}
              className="min-h-touch rounded-control border border-bh-ink-200 bg-bh-white px-3 text-caption"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-overline text-bh-ink-500">Hasta</span>
            <input
              type="date" defaultValue={p.rango.hasta}
              onChange={(e) => setParam("hasta", e.target.value)}
              className="min-h-touch rounded-control border border-bh-ink-200 bg-bh-white px-3 text-caption"
            />
          </label>
          {p.puedeElegirSucursal && (
            <label className="flex flex-col gap-1">
              <span className="text-overline text-bh-ink-500">Sucursal</span>
              <select
                defaultValue={params.get("branchId") ?? ""}
                onChange={(e) => setParam("branchId", e.target.value)}
                className="min-h-touch rounded-control border border-bh-ink-200 bg-bh-white px-3 text-caption"
              >
                <option value="">Todas</option>
                {p.listaSucursales.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </label>
          )}
          {p.puedeExportar && (
            <button
              type="button" onClick={exportarCsv}
              className="flex min-h-touch items-center gap-2 rounded-control border border-bh-ink-900 px-4 text-caption font-bold"
            >
              <Download className="size-4" /> CSV
            </button>
          )}
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-overline text-bh-ink-500">Reservas y ocupación</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tarjeta etiqueta="Reservas" valor={String(p.resumen.total)} delta={p.deltas.total} />
          <Tarjeta etiqueta="Comensales" valor={String(p.resumen.comensales)} delta={p.deltas.comensales}
            nota={`${p.resumen.promedioPorReserva} por reserva`} />
          <Tarjeta etiqueta="No-shows" valor={String(p.resumen.tasaNoShow)} sufijo="%"
            delta={p.deltas.tasaNoShow} invertido nota={`${p.resumen.noShows} reservas`} />
          <Tarjeta etiqueta="Cancelaciones" valor={String(p.resumen.tasaCancelacion)} sufijo="%"
            delta={p.deltas.tasaCancelacion} invertido nota={`${p.resumen.canceladas} reservas`} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          titulo="Reservas por franja"
          nota={`Tardeada Social concentra el ${pctTardeada}% — es la franja a recuperar`}
        >
          <Barras datos={datosFranja} />
        </Panel>

        <Panel
          titulo="Reservas por día"
          nota={`Lunes a jueves concentran el ${pctDebiles}% — es el dolor conocido del negocio`}
        >
          <Barras datos={datosDia} alto={260} />
        </Panel>

        <Panel titulo="Reservas por canal" nota="Cuánto aporta Pani frente al link web">
          <Barras datos={datosCanal} />
        </Panel>

        <Panel titulo="Reservas por sucursal">
          <Barras datos={datosSucursal} />
        </Panel>
      </div>

      <section>
        <h2 className="mb-3 text-overline text-bh-ink-500">Ocupación por franja</h2>
        <div className="overflow-x-auto rounded-card border border-bh-ink-200 bg-bh-white">
          <table className="w-full text-caption">
            <thead>
              <tr className="border-b border-bh-ink-200 text-left">
                <th className="p-3 font-bold">Sucursal</th>
                <th className="p-3 font-bold">Franja</th>
                <th className="p-3 text-right font-bold">Comensales</th>
                <th className="p-3 text-right font-bold">Ocupación</th>
              </tr>
            </thead>
            <tbody>
              {p.ocupacion.length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center text-bh-ink-500">Sin datos en el período.</td></tr>
              )}
              {p.ocupacion.map((o, i) => (
                <tr key={i} className="border-b border-bh-ink-200 last:border-0">
                  <td className="p-3">{o.sucursal}</td>
                  <td className="p-3">
                    {DEFINICION_FRANJAS[o.franja as Franja]?.nombre ?? o.franja}
                  </td>
                  <td className="p-3 text-right">{o.comensales}</td>
                  <td className="p-3 text-right font-bold">{o.ocupacionPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-overline text-bh-ink-500">Eventos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tarjeta etiqueta="Conversión" valor={String(p.eventos.tasaConversion)} sufijo="%"
            delta={p.deltas.tasaConversion} nota="Solicitud a confirmado" />
          <Tarjeta etiqueta="Pipeline ponderado" valor={formatCRC(p.eventos.valorPipeline)} />
          <Tarjeta etiqueta="Confirmado" valor={formatCRC(p.eventos.valorConfirmado)}
            delta={p.deltas.valorConfirmado} />
          <Tarjeta etiqueta="Ticket promedio" valor={formatCRC(p.eventos.ticketPromedio)}
            nota={`${formatCRC(p.eventos.ticketPorPersona)} por persona`} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel titulo="Eventos por etapa">
            <Barras datos={datosEtapa} />
          </Panel>
          <Panel
            titulo="Eventos por ocasión"
            nota={`Cierre promedio: ${p.eventos.diasCierrePromedio} días`}
          >
            <Barras datos={datosOcasion} />
          </Panel>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-overline text-bh-ink-500">Clientes</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Tarjeta etiqueta="Nuevos" valor={String(p.clientes.nuevos)} nota="Primera visita en el período" />
          <Tarjeta etiqueta="Recurrentes" valor={String(p.clientes.recurrentes)} />
          <Tarjeta etiqueta="Frecuencia" valor={String(p.clientes.frecuenciaRecurrentes)}
            nota="Reservas por cliente recurrente" />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel titulo="Top clientes por reservas">
            <Barras
              datos={p.clientes.topPorReservas.slice(0, 10).map((c) => ({
                etiqueta: c.nombre, valor: c.reservas,
              }))}
              alto={280}
            />
          </Panel>
          <Panel titulo="Top clientes por valor">
            <Barras
              datos={p.clientes.topPorValor.slice(0, 10).map((c) => ({
                etiqueta: c.nombre, valor: c.valor,
              }))}
              formato={formatCRC}
              alto={280}
            />
          </Panel>
        </div>
      </section>
    </div>
  );
}

function Panel({
  titulo, nota, children,
}: {
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-bh-ink-200 bg-bh-white p-4">
      <h3 className="text-heading">{titulo}</h3>
      {nota && <p className="mb-2 mt-0.5 text-caption text-bh-ink-500">{nota}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export { RESALTE, APAGADO };
