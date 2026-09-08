import { redirect } from "next/navigation";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { obtenerSesion, PUEDE } from "@/lib/auth/sesion";
import { sucursalesVisibles } from "@/lib/crm/consultas";
import {
  delta, metricasClientes, metricasEventos, ocupacionPorFranja, porCanal,
  porDiaSemana, porFranja, porSucursal, rangoAnterior, resumenReservas, type Rango,
} from "@/lib/crm/metricas";
import { TZ } from "@/lib/datetime";
import { Dashboard } from "./Dashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Métricas" };

export default async function MetricasPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; branchId?: string }>;
}) {
  const sesion = (await obtenerSesion())!;
  if (!PUEDE.verMetricas(sesion)) redirect("/admin");

  const sp = await searchParams;
  const hoy = toZonedTime(new Date(), TZ);
  const rango: Rango = {
    desde: sp.desde ?? format(startOfMonth(hoy), "yyyy-MM-dd"),
    hasta: sp.hasta ?? format(endOfMonth(hoy), "yyyy-MM-dd"),
  };
  const previo = rangoAnterior(rango);
  const branchId = sp.branchId || undefined;

  // Todo en paralelo: son consultas independientes contra la misma base.
  const [
    resumen, resumenPrevio, franjas, dias, canales, sucursales,
    ocupacion, eventos, eventosPrevios, clientes, listaSucursales,
  ] = await Promise.all([
    resumenReservas(sesion, rango, branchId),
    resumenReservas(sesion, previo, branchId),
    porFranja(sesion, rango, branchId),
    porDiaSemana(sesion, rango, branchId),
    porCanal(sesion, rango, branchId),
    porSucursal(sesion, rango),
    ocupacionPorFranja(sesion, rango),
    metricasEventos(sesion, rango, branchId),
    metricasEventos(sesion, previo, branchId),
    metricasClientes(sesion, rango, branchId),
    sucursalesVisibles(sesion),
  ]);

  return (
    <Dashboard
      rango={rango}
      previo={previo}
      resumen={resumen}
      deltas={{
        total: delta(resumen.total, resumenPrevio.total),
        comensales: delta(resumen.comensales, resumenPrevio.comensales),
        tasaNoShow: delta(resumen.tasaNoShow, resumenPrevio.tasaNoShow),
        tasaCancelacion: delta(resumen.tasaCancelacion, resumenPrevio.tasaCancelacion),
        valorConfirmado: delta(eventos.valorConfirmado, eventosPrevios.valorConfirmado),
        tasaConversion: delta(eventos.tasaConversion, eventosPrevios.tasaConversion),
      }}
      franjas={franjas}
      dias={dias}
      canales={canales}
      sucursales={sucursales}
      ocupacion={ocupacion}
      eventos={eventos}
      clientes={clientes}
      listaSucursales={listaSucursales}
      puedeExportar={PUEDE.exportarDatos(sesion)}
      puedeElegirSucursal={PUEDE.verTodasLasSucursales(sesion)}
    />
  );
}
