"use client";

import { useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, NOMBRE_ESTADO } from "@/components/ui/badge";
import { cambiarEstado, guardarNotaInterna } from "@/app/admin/acciones";
import { TRANSICIONES } from "@/lib/crm/estados";
import { formatearTelefono } from "@/lib/telefono";
import { nombreFranja } from "@/lib/franjas";
import type { ReservaCalendario } from "@/lib/crm/consultas";

const ETIQUETA_ACCION: Record<string, string> = {
  confirmada: "Confirmar",
  sentada: "Marcar sentada",
  completada: "Marcar completada",
  cancelada: "Cancelar",
  no_show: "Marcar no-show",
};

const NOMBRE_SOURCE: Record<string, string> = {
  web: "Link web",
  whatsapp_pani: "WhatsApp (Pani)",
  instagram: "Instagram",
  telefono: "Teléfono",
  walk_in: "Walk-in",
};

/** Panel lateral con el detalle y las acciones rápidas. */
export function PanelReserva({
  reserva, onCerrar, puedeEditarNotas,
}: {
  reserva: ReservaCalendario;
  onCerrar: () => void;
  puedeEditarNotas: boolean;
}) {
  const [estado, setEstado] = useState(reserva.estado);
  const [notas, setNotas] = useState(reserva.notasInternas ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [pendiente, iniciar] = useTransition();

  const siguientes = TRANSICIONES[estado] ?? [];

  function accion(nuevo: string) {
    setError(null);
    iniciar(async () => {
      const res = await cambiarEstado({ reservationId: reserva.id, estado: nuevo });
      if (res.ok) setEstado(nuevo as typeof estado);
      else setError(res.error);
    });
  }

  function guardarNotas() {
    setError(null);
    setGuardado(false);
    iniciar(async () => {
      const res = await guardarNotaInterna({
        reservationId: reserva.id,
        notasInternas: notas,
      });
      if (res.ok) setGuardado(true);
      else setError(res.error);
    });
  }

  const hora = new Date(reserva.startsAt).toLocaleTimeString("es-CR", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Costa_Rica", hour12: false,
  });

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCerrar}
        className="absolute inset-0 bg-bh-ink-900/30"
      />

      <aside className="relative flex w-full max-w-md flex-col overflow-y-auto bg-bh-white shadow-lift">
        <header className="sticky top-0 flex items-start justify-between gap-3 border-b border-bh-ink-200 bg-bh-white p-5">
          <div>
            <p className="text-overline text-bh-ink-500">{reserva.codigoPublico}</p>
            <h2 className="mt-1 text-title">{reserva.cliente}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge estado={estado as keyof typeof NOMBRE_ESTADO}>
                {NOMBRE_ESTADO[estado as keyof typeof NOMBRE_ESTADO]}
              </Badge>
              {reserva.tipo === "evento" && <Badge estado="neutral">Evento</Badge>}
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar panel"
            className="flex size-touch shrink-0 items-center justify-center rounded-control hover:bg-bh-ink-100"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="flex flex-col gap-5 p-5">
          <dl className="space-y-2">
            <Fila etiqueta="Sucursal" valor={reserva.sucursal} />
            <Fila etiqueta="Cuándo" valor={`${reserva.fechaLocal} · ${hora}`} />
            <Fila etiqueta="Franja" valor={nombreFranja(reserva.franja)} />
            <Fila
              etiqueta="Personas"
              valor={`${reserva.numPersonas} ${reserva.numPersonas === 1 ? "persona" : "personas"}`}
            />
            {reserva.mesa && <Fila etiqueta="Mesa" valor={reserva.mesa} />}
            <Fila etiqueta="Canal" valor={NOMBRE_SOURCE[reserva.source] ?? reserva.source} />
            <Fila
              etiqueta="Teléfono"
              valor={formatearTelefono(reserva.telefono)}
              href={`tel:${reserva.telefono}`}
            />
            {reserva.ocasion && <Fila etiqueta="Ocasión" valor={reserva.ocasion} />}
          </dl>

          {reserva.notasCliente && (
            <section>
              <h3 className="mb-1 text-overline text-bh-ink-500">Notas del cliente</h3>
              <p className="rounded-control bg-bh-ink-100 p-3 text-caption">
                {reserva.notasCliente}
              </p>
            </section>
          )}

          {siguientes.length > 0 && (
            <section>
              <h3 className="mb-2 text-overline text-bh-ink-500">Acciones</h3>
              <div className="flex flex-wrap gap-2">
                {siguientes.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={s === "cancelada" || s === "no_show" ? "danger" : "solid"}
                    disabled={pendiente}
                    onClick={() => accion(s)}
                  >
                    {pendiente && <Loader2 className="size-3 animate-spin" />}
                    {ETIQUETA_ACCION[s] ?? s}
                  </Button>
                ))}
              </div>
            </section>
          )}

          {siguientes.length === 0 && (
            <p className="rounded-control bg-bh-ink-100 p-3 text-caption text-bh-ink-500">
              Esta reserva ya está cerrada. No admite más cambios de estado.
            </p>
          )}

          {puedeEditarNotas && (
            <section>
              <h3 className="mb-2 text-overline text-bh-ink-500">Nota interna</h3>
              <textarea
                value={notas}
                onChange={(e) => {
                  setNotas(e.target.value);
                  setGuardado(false);
                }}
                rows={3}
                maxLength={2000}
                className="input-bh resize-none"
                placeholder="Solo la ve el equipo"
              />
              <div className="mt-2 flex items-center gap-3">
                <Button size="sm" variant="outline" onClick={guardarNotas} disabled={pendiente}>
                  Guardar nota
                </Button>
                {guardado && <span className="text-caption text-success-fg">Guardada</span>}
              </div>
            </section>
          )}

          {error && (
            <p role="alert" className="rounded-control bg-danger-bg p-3 text-caption text-danger-on">
              {error}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Fila({ etiqueta, valor, href }: { etiqueta: string; valor: string; href?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-caption text-bh-ink-500">{etiqueta}</dt>
      <dd className="text-right font-bold">
        {href ? (
          <a href={href} className="underline">{valor}</a>
        ) : (
          valor
        )}
      </dd>
    </div>
  );
}
