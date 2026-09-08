"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Calendario mensual.
 *
 * Escrito a mano en vez de traer una libreria: hace falta control fino sobre
 * que dias se deshabilitan (cierres, ventana de anticipacion) y sobre la
 * navegacion por teclado, y las librerias de fecha traen su propio manejo de
 * zona horaria que pelea con el nuestro.
 *
 * Trabaja con strings `YYYY-MM-DD` en hora de Costa Rica, nunca con `Date`,
 * para no arrastrar la zona del navegador del cliente.
 */

const DIAS_CORTOS = ["D", "L", "K", "M", "J", "V", "S"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

type Props = {
  /** `YYYY-MM-DD` seleccionado. */
  valor: string | null;
  onChange: (fecha: string) => void;
  /** Primer día tomable, `YYYY-MM-DD`. */
  minimo: string;
  /** Último día tomable, `YYYY-MM-DD`. */
  maximo: string;
  /** Días cerrados adicionales, `YYYY-MM-DD`. */
  deshabilitados?: string[];
};

function ymd(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function Calendario({ valor, onChange, minimo, maximo, deshabilitados = [] }: Props) {
  const [anio, mesInicial] = minimo.split("-").map(Number);
  const [cursor, setCursor] = useState({ anio, mes: mesInicial - 1 });

  const bloqueados = useMemo(() => new Set(deshabilitados), [deshabilitados]);

  const celdas = useMemo(() => {
    const primero = new Date(Date.UTC(cursor.anio, cursor.mes, 1));
    const diasEnMes = new Date(Date.UTC(cursor.anio, cursor.mes + 1, 0)).getUTCDate();
    const offset = primero.getUTCDay();

    const lista: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= diasEnMes; d++) lista.push(ymd(cursor.anio, cursor.mes, d));
    return lista;
  }, [cursor]);

  const mesAnterior = () =>
    setCursor((c) => (c.mes === 0 ? { anio: c.anio - 1, mes: 11 } : { ...c, mes: c.mes - 1 }));
  const mesSiguiente = () =>
    setCursor((c) => (c.mes === 11 ? { anio: c.anio + 1, mes: 0 } : { ...c, mes: c.mes + 1 }));

  // El mes entero cae fuera de la ventana permitida.
  const primerDiaDelMes = ymd(cursor.anio, cursor.mes, 1);
  const ultimoDiaDelMes = ymd(cursor.anio, cursor.mes, 31);
  const puedeRetroceder = primerDiaDelMes > minimo;
  const puedeAvanzar = ultimoDiaDelMes < maximo;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={mesAnterior}
          disabled={!puedeRetroceder}
          aria-label="Mes anterior"
          className="flex size-touch items-center justify-center rounded-control text-bh-ink-700 disabled:opacity-30 enabled:hover:bg-bh-ink-100"
        >
          <ChevronLeft className="size-5" />
        </button>
        <p aria-live="polite" className="font-bold capitalize">
          {MESES[cursor.mes]} {cursor.anio}
        </p>
        <button
          type="button"
          onClick={mesSiguiente}
          disabled={!puedeAvanzar}
          aria-label="Mes siguiente"
          className="flex size-touch items-center justify-center rounded-control text-bh-ink-700 disabled:opacity-30 enabled:hover:bg-bh-ink-100"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1" role="grid">
        {DIAS_CORTOS.map((d, i) => (
          <div
            key={i}
            role="columnheader"
            className="pb-1 text-center text-overline text-bh-ink-500"
          >
            {d}
          </div>
        ))}

        {celdas.map((fecha, i) => {
          if (!fecha) return <div key={`v${i}`} />;

          const fueraDeRango = fecha < minimo || fecha > maximo;
          const cerrado = bloqueados.has(fecha);
          const deshabilitado = fueraDeRango || cerrado;
          const seleccionado = fecha === valor;
          const dia = Number(fecha.slice(-2));

          return (
            <button
              key={fecha}
              type="button"
              role="gridcell"
              disabled={deshabilitado}
              aria-selected={seleccionado}
              aria-label={`${dia} de ${MESES[cursor.mes]}${cerrado ? ", cerrado" : ""}`}
              onClick={() => onChange(fecha)}
              className={cn(
                "flex aspect-square min-h-touch items-center justify-center rounded-control text-body transition",
                seleccionado && "bg-bh-ink-900 font-bold text-bh-white",
                !seleccionado && !deshabilitado && "hover:bg-bh-ink-100",
                deshabilitado && "cursor-not-allowed text-bh-ink-300 line-through",
              )}
            >
              {dia}
            </button>
          );
        })}
      </div>
    </div>
  );
}
