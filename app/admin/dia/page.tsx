import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import Link from "next/link";
import { obtenerSesion, PUEDE } from "@/lib/auth/sesion";
import { reservasDelRango } from "@/lib/crm/consultas";
import { TZ } from "@/lib/datetime";
import { FRANJAS_ORDENADAS } from "@/lib/franjas";
import { VistaServicio } from "./VistaServicio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Servicio del día" };

/**
 * Vista de servicio para el anfitrion, pensada para tablet: quien llega, a que
 * hora, cuantos y con que notas. Agrupada por franja porque asi se opera el
 * turno, no por mesa.
 */
export default async function DiaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const sesion = (await obtenerSesion())!;
  const { fecha } = await searchParams;
  const hoy = format(toZonedTime(new Date(), TZ), "yyyy-MM-dd");
  const dia = fecha ?? hoy;

  const reservas = await reservasDelRango(sesion, { desde: dia, hasta: dia });

  const porFranja = FRANJAS_ORDENADAS.map((f) => ({
    franja: f.codigo,
    nombre: f.nombre,
    enRecuperacion: f.enRecuperacion,
    reservas: reservas.filter((r) => r.franja === f.codigo),
  }));

  const comensales = reservas
    .filter((r) => r.estado !== "cancelada" && r.estado !== "no_show")
    .reduce((s, r) => s + r.numPersonas, 0);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title">Servicio del día</h1>
          <p className="text-caption text-bh-ink-500">
            {reservas.length} {reservas.length === 1 ? "reserva" : "reservas"} · {comensales} comensales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form className="flex items-center gap-2">
            <input
              type="date"
              name="fecha"
              defaultValue={dia}
              className="min-h-touch rounded-control border border-bh-ink-200 bg-bh-white px-3 text-caption"
            />
            <button
              type="submit"
              className="min-h-touch rounded-control bg-bh-ink-900 px-4 text-caption font-bold text-bh-white"
            >
              Ver
            </button>
          </form>
          {dia !== hoy && (
            <Link href="/admin/dia" className="text-caption font-bold underline">
              Hoy
            </Link>
          )}
        </div>
      </header>

      <VistaServicio grupos={porFranja} puedeEditarNotas={PUEDE.editarNotasInternas(sesion)} />
    </div>
  );
}
