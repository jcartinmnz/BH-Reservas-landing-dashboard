import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tarjeta de KPI.
 *
 * Un numero suelto no dice nada: el delta contra el periodo anterior es lo que
 * lo convierte en senal. `null` significa que no hay base de comparacion (el
 * periodo anterior fue cero), y se dice explicitamente en vez de mostrar un
 * falso 0%.
 */
export function Tarjeta({
  etiqueta, valor, delta, sufijo, invertido, nota,
}: {
  etiqueta: string;
  valor: string;
  delta?: number | null;
  sufijo?: string;
  /** Para métricas donde subir es malo (cancelaciones, no-shows). */
  invertido?: boolean;
  nota?: string;
}) {
  const sinBase = delta === null;
  const bueno = delta != null && (invertido ? delta < 0 : delta > 0);
  const malo = delta != null && (invertido ? delta > 0 : delta < 0);
  const Icono = delta == null || delta === 0 ? Minus : delta > 0 ? ArrowUp : ArrowDown;

  return (
    <div className="rounded-card border border-bh-ink-200 bg-bh-white p-4">
      <p className="text-overline text-bh-ink-500">{etiqueta}</p>
      <p className="mt-1 text-title">
        {valor}
        {sufijo && <span className="text-heading text-bh-ink-500">{sufijo}</span>}
      </p>

      {delta !== undefined && (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-caption",
            bueno && "text-success-fg",
            malo && "text-danger-fg",
            !bueno && !malo && "text-bh-ink-500",
          )}
        >
          {sinBase ? (
            <span className="text-bh-ink-500">Sin base de comparación</span>
          ) : (
            <>
              <Icono className="size-3" />
              {Math.abs(delta!)}% vs. período anterior
            </>
          )}
        </p>
      )}

      {nota && <p className="mt-1 text-caption text-bh-ink-500">{nota}</p>}
    </div>
  );
}
