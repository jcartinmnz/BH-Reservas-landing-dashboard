import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { WizardEvento } from "./WizardEvento";
import { rangosPresupuesto, sugerenciasParaEvento, extrasCotizables } from "@/lib/eventos/cotizador";
import { POLITICA_EVENTO, POLITICA_MESA } from "@/data/politicas";
import { TZ } from "@/lib/datetime";

export const metadata = { title: "Cotizar un evento" };

/**
 * Las sugerencias se calculan en el servidor y se serializan SIN food cost:
 * ese dato ordena la lista pero no puede viajar al cliente
 * (docs/CONTEXT.md §5).
 */
export default async function EventoPage({
  searchParams,
}: {
  searchParams: Promise<{ sucursal?: string }>;
}) {
  const { sucursal } = await searchParams;
  const hoyCR = toZonedTime(new Date(), TZ);

  // 72 horas de anticipación mínima para eventos.
  const minimo = format(
    addDays(hoyCR, Math.ceil(POLITICA_EVENTO.anticipacionMinimaHoras / 24)),
    "yyyy-MM-dd",
  );
  const maximo = format(addDays(hoyCR, POLITICA_MESA.anticipacionMaximaDias), "yyyy-MM-dd");

  const sugerencias = sugerenciasParaEvento().map((i) => ({
    slug: i.slug,
    nombre: i.nombre,
    categoria: i.categoria,
    precioColones: i.precioColones,
  }));

  const extras = extrasCotizables().map((e) => ({
    slug: e.slug,
    nombre: e.nombre,
    precioColones: e.precioColones!,
    unidad: e.unidad,
  }));

  return (
    <WizardEvento
      minimo={minimo}
      maximo={maximo}
      rangos={rangosPresupuesto()}
      sugerencias={sugerencias}
      extras={extras}
      sucursalInicial={sucursal}
    />
  );
}
