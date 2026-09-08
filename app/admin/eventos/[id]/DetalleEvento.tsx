"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCRC } from "@/lib/money";
import { formatearTelefono } from "@/lib/telefono";
import { NOMBRE_OCASION, POLITICA_EVENTO, type Ocasion } from "@/data/politicas";
import { NOMBRE_ETAPA, guardarCotizacion, registrarActividad, registrarDeposito, type Etapa } from "../acciones";

type Evento = {
  id: string;
  codigoPublico: string;
  ocasion: string;
  fechaLocal: string;
  fechaFlexible: boolean;
  numPersonas: number;
  subtotal: number;
  ivaPct: number;
  servicioPct: number;
  totalEstimado: number;
  totalConfirmado: number | null;
  deposito: number | null;
  depositoPagadoAt: Date | null;
  estadoPipeline: string;
  probabilidadPct: number;
  motivoPerdida: string | null;
  preferenciaContacto: string | null;
  cliente: string;
  telefono: string;
  email: string | null;
  sucursal: string;
  paquete: string | null;
  items: { id: string; nombre: string; cantidad: number; precioUnitario: number }[];
};

type Actividad = {
  id: string;
  tipo: string;
  contenido: string | null;
  createdAt: Date;
  autor: string | null;
};

type LineaEditable = { nombre: string; cantidad: number; precioColones: number };

export function DetalleEvento({
  evento, actividad, puedeEditar, puedeDeposito,
}: {
  evento: Evento;
  actividad: Actividad[];
  puedeEditar: boolean;
  puedeDeposito: boolean;
}) {
  const [lineas, setLineas] = useState<LineaEditable[]>(
    evento.items.map((i) => ({
      nombre: i.nombre,
      cantidad: i.cantidad,
      precioColones: Math.round(i.precioUnitario / 100),
    })),
  );
  const [nota, setNota] = useState("");
  const [tipoNota, setTipoNota] = useState<"nota" | "llamada" | "whatsapp">("nota");
  const [deposito, setDeposito] = useState(
    evento.deposito ? String(Math.round(evento.deposito / 100)) : "",
  );
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  // Se recalcula en el cliente para dar respuesta inmediata; el servidor lo
  // vuelve a calcular al guardar y su número es el que manda.
  const subtotal = lineas.reduce((s, l) => s + l.precioColones * 100 * l.cantidad, 0);
  const iva = Math.round((subtotal * evento.ivaPct) / 100);
  const servicio = Math.round((subtotal * evento.servicioPct) / 100);
  const total = subtotal + iva + servicio;

  function guardar() {
    setError(null); setMensaje(null);
    iniciar(async () => {
      const res = await guardarCotizacion({ eventId: evento.id, lineas });
      if (res.ok) setMensaje("Cotización actualizada");
      else setError(res.error);
    });
  }

  function agregarNota() {
    if (!nota.trim()) return;
    setError(null);
    iniciar(async () => {
      const res = await registrarActividad({
        eventId: evento.id, tipo: tipoNota, contenido: nota,
      });
      if (res.ok) { setNota(""); setMensaje("Actividad registrada"); }
      else setError(res.error);
    });
  }

  function guardarDeposito() {
    setError(null); setMensaje(null);
    iniciar(async () => {
      const res = await registrarDeposito({
        eventId: evento.id, montoColones: Number(deposito) || 0,
      });
      if (res.ok) setMensaje("Depósito registrado");
      else setError(res.error);
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-5">
        <header className="rounded-card border border-bh-ink-200 bg-bh-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-overline text-bh-ink-500">{evento.codigoPublico}</p>
              <h1 className="mt-1 text-title">{evento.cliente}</h1>
              <p className="text-caption text-bh-ink-500">
                {NOMBRE_OCASION[evento.ocasion as Ocasion] ?? evento.ocasion} ·{" "}
                {evento.numPersonas} personas · {evento.sucursal}
              </p>
            </div>
            <div className="text-right">
              <Badge estado="neutral">
                {NOMBRE_ETAPA[evento.estadoPipeline as Etapa] ?? evento.estadoPipeline}
              </Badge>
              <p className="mt-1 text-caption text-bh-ink-500">
                {evento.probabilidadPct}% de probabilidad
              </p>
            </div>
          </div>

          {evento.motivoPerdida && (
            <p className="mt-3 rounded-control bg-danger-bg p-3 text-caption text-danger-on">
              <strong>Se perdió:</strong> {evento.motivoPerdida}
            </p>
          )}
        </header>

        <section className="rounded-card border border-bh-ink-200 bg-bh-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-heading">Cotización</h2>
            {evento.paquete && <Badge estado="neutral">{evento.paquete}</Badge>}
          </div>

          <div className="flex flex-col gap-2">
            {lineas.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={l.nombre}
                  disabled={!puedeEditar}
                  onChange={(e) =>
                    setLineas((ls) => ls.map((x, n) => (n === i ? { ...x, nombre: e.target.value } : x)))
                  }
                  className="input-bh flex-1"
                  aria-label="Concepto"
                />
                <input
                  type="number" min={1} value={l.cantidad} disabled={!puedeEditar}
                  onChange={(e) =>
                    setLineas((ls) => ls.map((x, n) => (n === i ? { ...x, cantidad: Number(e.target.value) } : x)))
                  }
                  className="input-bh w-20" aria-label="Cantidad"
                />
                <input
                  type="number" min={0} value={l.precioColones} disabled={!puedeEditar}
                  onChange={(e) =>
                    setLineas((ls) => ls.map((x, n) => (n === i ? { ...x, precioColones: Number(e.target.value) } : x)))
                  }
                  className="input-bh w-28" aria-label="Precio en colones"
                />
                {puedeEditar && (
                  <button
                    type="button"
                    aria-label={`Quitar ${l.nombre}`}
                    onClick={() => setLineas((ls) => ls.filter((_, n) => n !== i))}
                    className="flex size-touch shrink-0 items-center justify-center rounded-control text-bh-ink-500 hover:bg-bh-ink-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {puedeEditar && (
            <Button
              variant="ghost" size="sm" className="mt-2"
              onClick={() => setLineas((ls) => [...ls, { nombre: "", cantidad: 1, precioColones: 0 }])}
            >
              <Plus className="size-4" /> Agregar línea
            </Button>
          )}

          <dl className="mt-4 space-y-1 border-t border-bh-ink-200 pt-3 text-caption">
            <Fila etiqueta="Subtotal" valor={formatCRC(subtotal)} />
            <Fila etiqueta={`IVA ${evento.ivaPct}%`} valor={formatCRC(iva)} />
            <Fila etiqueta={`Servicio ${evento.servicioPct}%`} valor={formatCRC(servicio)} />
          </dl>
          <div className="mt-2 flex items-baseline justify-between border-t border-bh-ink-900 pt-2">
            <span className="text-heading">Total</span>
            <span className="text-heading">{formatCRC(total)}</span>
          </div>
          <p className="mt-1 text-right text-caption text-bh-ink-500">
            {formatCRC(Math.round(total / Math.max(1, evento.numPersonas)))} por persona ·
            depósito {POLITICA_EVENTO.depositoPct}%:{" "}
            {formatCRC(Math.round(total / 2))}
          </p>

          {puedeEditar && (
            <Button className="mt-4" onClick={guardar} disabled={pendiente}>
              {pendiente && <Loader2 className="size-4 animate-spin" />}
              Guardar cotización
            </Button>
          )}
        </section>

        <section className="rounded-card border border-bh-ink-200 bg-bh-white p-5">
          <h2 className="mb-3 text-heading">Actividad</h2>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              {(["nota", "llamada", "whatsapp"] as const).map((t) => (
                <button
                  key={t} type="button" onClick={() => setTipoNota(t)}
                  className={`min-h-9 flex-1 rounded-control border text-caption font-bold capitalize ${
                    tipoNota === t
                      ? "border-bh-ink-900 bg-bh-ink-900 text-bh-white"
                      : "border-bh-ink-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              value={nota} onChange={(e) => setNota(e.target.value)} rows={2}
              maxLength={2000} className="input-bh resize-none"
              placeholder="Qué se habló, qué quedó pendiente…"
            />
            <Button size="sm" variant="outline" onClick={agregarNota} disabled={pendiente || !nota.trim()}>
              Registrar
            </Button>
          </div>

          <ul className="mt-4 flex flex-col gap-3">
            {actividad.length === 0 && (
              <li className="text-caption text-bh-ink-500">Todavía no hay actividad.</li>
            )}
            {actividad.map((a) => (
              <li key={a.id} className="border-l-2 border-bh-ink-200 pl-3">
                <p className="text-caption">
                  <span className="font-bold capitalize">{a.tipo.replace("_", " ")}</span>
                  {a.autor && <span className="text-bh-ink-500"> · {a.autor}</span>}
                  <span className="text-bh-ink-500">
                    {" · "}
                    {new Date(a.createdAt).toLocaleDateString("es-CR", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      timeZone: "America/Costa_Rica",
                    })}
                  </span>
                </p>
                {a.contenido && <p className="text-caption text-bh-ink-700">{a.contenido}</p>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="flex flex-col gap-5">
        <section className="rounded-card border border-bh-ink-200 bg-bh-white p-5">
          <h2 className="mb-3 text-heading">Contacto</h2>
          <dl className="space-y-2 text-caption">
            <Fila etiqueta="Teléfono" valor={formatearTelefono(evento.telefono)} />
            {evento.email && <Fila etiqueta="Correo" valor={evento.email} />}
            {evento.preferenciaContacto && (
              <Fila etiqueta="Prefiere" valor={evento.preferenciaContacto} />
            )}
            <Fila
              etiqueta="Fecha"
              valor={`${evento.fechaLocal}${evento.fechaFlexible ? " (flexible)" : ""}`}
            />
          </dl>
          <a
            href={`https://wa.me/${evento.telefono.replace("+", "")}`}
            target="_blank" rel="noopener"
            className="mt-3 flex min-h-touch items-center justify-center rounded-control bg-support-bg font-bold text-support-on"
          >
            Escribir por WhatsApp
          </a>
        </section>

        <section className="rounded-card border border-bh-ink-200 bg-bh-white p-5">
          <h2 className="mb-3 text-heading">Depósito</h2>
          {evento.depositoPagadoAt ? (
            <p className="rounded-control bg-support-bg p-3 text-caption text-support-on">
              Pagado el{" "}
              {new Date(evento.depositoPagadoAt).toLocaleDateString("es-CR", {
                timeZone: "America/Costa_Rica",
              })}
              {evento.deposito && ` · ${formatCRC(evento.deposito)}`}
            </p>
          ) : (
            <p className="text-caption text-bh-ink-500">Sin registrar.</p>
          )}

          {puedeDeposito && (
            <div className="mt-3 flex gap-2">
              <input
                type="number" min={0} value={deposito}
                onChange={(e) => setDeposito(e.target.value)}
                className="input-bh flex-1" placeholder="Monto en colones"
                aria-label="Monto del depósito"
              />
              <Button size="sm" onClick={guardarDeposito} disabled={pendiente}>
                Registrar
              </Button>
            </div>
          )}
          {!puedeDeposito && (
            <p className="mt-2 text-caption text-bh-ink-500">
              Solo administración registra depósitos.
            </p>
          )}
        </section>

        {mensaje && (
          <p className="rounded-control bg-support-bg p-3 text-caption text-support-on">{mensaje}</p>
        )}
        {error && (
          <p role="alert" className="rounded-control bg-danger-bg p-3 text-caption text-danger-on">
            {error}
          </p>
        )}
      </aside>
    </div>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-bh-ink-500">{etiqueta}</dt>
      <dd className="text-right font-bold">{valor}</dd>
    </div>
  );
}
