"use client";

import { useState, useTransition } from "react";
import { CalendarX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, NOMBRE_ESTADO } from "@/components/ui/badge";
import { cancelarReservaAction } from "./acciones";
import { CANCELABLES_POR_CLIENTE } from "@/lib/crm/estados";

type Props = {
  reservationId: string;
  codigoPublico: string;
  sucursal: string;
  cuando: string;
  franja: string;
  numPersonas: number;
  estado: keyof typeof NOMBRE_ESTADO;
  token: string;
};

export function GestionReserva(props: Props) {
  const [estado, setEstado] = useState(props.estado);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, iniciar] = useTransition();

  // Misma lista que usa el servicio, para que el botón nunca se muestre
  // cuando la cancelación no va a proceder.
  const cancelable = (CANCELABLES_POR_CLIENTE as readonly string[]).includes(estado);

  function cancelar() {
    setError(null);
    iniciar(async () => {
      const res = await cancelarReservaAction({
        reservationId: props.reservationId,
        token: props.token,
      });
      if (res.ok) {
        setEstado("cancelada");
        setConfirmando(false);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-5 py-12">
      <header>
        <p className="text-overline text-bh-ink-500">Bread House</p>
        <h1 className="mt-2 text-title">Tu reserva</h1>
      </header>

      <div className="rounded-card border border-bh-ink-200 bg-bh-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-heading">{props.codigoPublico}</span>
          <Badge estado={estado}>{NOMBRE_ESTADO[estado]}</Badge>
        </div>
        <dl className="space-y-2 text-body">
          <Fila etiqueta="Sucursal" valor={props.sucursal} />
          <Fila etiqueta="Cuándo" valor={`${props.cuando} · ${props.franja}`} />
          <Fila
            etiqueta="Personas"
            valor={`${props.numPersonas} ${props.numPersonas === 1 ? "persona" : "personas"}`}
          />
        </dl>
      </div>

      {estado === "cancelada" && (
        <p className="rounded-card bg-bh-ink-100 p-4 text-caption text-bh-ink-700">
          Cancelamos tu reserva. Cuando quieras volver, acá estamos.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-control bg-danger-bg p-3 text-caption text-danger-on">
          {error}
        </p>
      )}

      {cancelable && !confirmando && (
        <Button variant="outline" full onClick={() => setConfirmando(true)}>
          <CalendarX className="size-4" /> Cancelar la reserva
        </Button>
      )}

      {cancelable && confirmando && (
        <div className="rounded-card border border-bh-ink-200 bg-bh-white p-5">
          <p className="font-bold">¿Seguro que la cancelás?</p>
          <p className="mt-1 text-caption text-bh-ink-500">
            Liberamos la mesa y no se puede deshacer. Podés volver a reservar cuando quieras.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="danger" full onClick={cancelar} disabled={pendiente}>
              {pendiente && <Loader2 className="size-4 animate-spin" />}
              Sí, cancelar
            </Button>
            <Button variant="ghost" full onClick={() => setConfirmando(false)}>
              No
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-caption text-bh-ink-500">{etiqueta}</dt>
      <dd className="text-right font-bold">{valor}</dd>
    </div>
  );
}
