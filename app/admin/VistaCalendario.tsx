"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CalendarioCRM } from "@/components/admin/CalendarioCRM";
import { FRANJAS_ORDENADAS } from "@/lib/franjas";
import { NOMBRE_ESTADO } from "@/components/ui/badge";
import type { ReservaCalendario } from "@/lib/crm/consultas";

type Props = {
  reservas: ReservaCalendario[];
  anio: number;
  mes: number;
  sucursales: { id: string; nombre: string }[];
  puedeElegirSucursal: boolean;
  puedeEditarNotas: boolean;
};

/** Los filtros viven en la URL: así un filtro se puede compartir por link. */
export function VistaCalendario(props: Props) {
  const router = useRouter();
  const params = useSearchParams();

  function set(clave: string, valor: string) {
    const p = new URLSearchParams(params.toString());
    if (valor) p.set(clave, valor);
    else p.delete(clave);
    router.push(`/admin?${p.toString()}`);
  }

  function navegar(anio: number, mes: number) {
    const p = new URLSearchParams(params.toString());
    p.set("anio", String(anio));
    p.set("mes", String(mes + 1));
    router.push(`/admin?${p.toString()}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {props.puedeElegirSucursal && (
          <Select
            etiqueta="Sucursal"
            valor={params.get("branchId") ?? ""}
            onChange={(v) => set("branchId", v)}
            opciones={[
              { valor: "", texto: "Todas" },
              ...props.sucursales.map((s) => ({ valor: s.id, texto: s.nombre })),
            ]}
          />
        )}
        <Select
          etiqueta="Tipo"
          valor={params.get("tipo") ?? ""}
          onChange={(v) => set("tipo", v)}
          opciones={[
            { valor: "", texto: "Todos" },
            { valor: "mesa", texto: "Mesas" },
            { valor: "evento", texto: "Eventos" },
          ]}
        />
        <Select
          etiqueta="Estado"
          valor={params.get("estado") ?? ""}
          onChange={(v) => set("estado", v)}
          opciones={[
            { valor: "", texto: "Todos" },
            ...Object.entries(NOMBRE_ESTADO).map(([valor, texto]) => ({ valor, texto })),
          ]}
        />
        <Select
          etiqueta="Franja"
          valor={params.get("franja") ?? ""}
          onChange={(v) => set("franja", v)}
          opciones={[
            { valor: "", texto: "Todas" },
            ...FRANJAS_ORDENADAS.map((f) => ({ valor: f.codigo, texto: f.nombre })),
          ]}
        />
      </div>

      <CalendarioCRM
        reservas={props.reservas}
        anio={props.anio}
        mes={props.mes}
        onNavegar={navegar}
        puedeEditarNotas={props.puedeEditarNotas}
      />
    </div>
  );
}

function Select({
  etiqueta, valor, onChange, opciones,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  opciones: { valor: string; texto: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-overline text-bh-ink-500">{etiqueta}</span>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-touch rounded-control border border-bh-ink-200 bg-bh-white px-3 text-caption"
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>{o.texto}</option>
        ))}
      </select>
    </label>
  );
}
