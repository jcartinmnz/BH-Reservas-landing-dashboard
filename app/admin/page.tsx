import { Suspense } from "react";
import { format, endOfMonth, startOfMonth } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { obtenerSesion, PUEDE } from "@/lib/auth/sesion";
import { reservasDelRango, sucursalesVisibles, type FiltrosCalendario } from "@/lib/crm/consultas";
import { VistaCalendario } from "./VistaCalendario";
import { TZ } from "@/lib/datetime";
import type { Franja } from "@/lib/franjas";

export const dynamic = "force-dynamic";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sesion = (await obtenerSesion())!;
  const sp = await searchParams;

  const hoy = toZonedTime(new Date(), TZ);
  const anio = Number(sp.anio) || hoy.getFullYear();
  const mes = (Number(sp.mes) || hoy.getMonth() + 1) - 1;

  const inicio = startOfMonth(new Date(anio, mes, 1));
  const fin = endOfMonth(inicio);

  const filtros: FiltrosCalendario = {
    desde: format(inicio, "yyyy-MM-dd"),
    hasta: format(fin, "yyyy-MM-dd"),
    branchId: sp.branchId || undefined,
    tipo: sp.tipo === "mesa" || sp.tipo === "evento" ? sp.tipo : undefined,
    estado: sp.estado as FiltrosCalendario["estado"],
    franja: sp.franja as Franja | undefined,
  };

  const [reservas, sucursales] = await Promise.all([
    reservasDelRango(sesion, filtros),
    sucursalesVisibles(sesion),
  ]);

  return (
    <Suspense fallback={<p className="text-bh-ink-500">Cargando calendario…</p>}>
      <VistaCalendario
        reservas={reservas}
        anio={anio}
        mes={mes}
        sucursales={sucursales}
        puedeElegirSucursal={PUEDE.verTodasLasSucursales(sesion)}
        puedeEditarNotas={PUEDE.editarNotasInternas(sesion)}
      />
    </Suspense>
  );
}
