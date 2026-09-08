"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { APAGADO, EJE, GRILLA, RESALTE } from "@/lib/charts/paleta";

export type Punto = {
  etiqueta: string;
  valor: number;
  /** Marca la barra que hay que mirar (franja a recuperar, días débiles). */
  destacado?: boolean;
  /** Color propio; si falta, usa destacado/apagado. */
  color?: string;
};

/**
 * Barras horizontales.
 *
 * Horizontal y no vertical porque las etiquetas son texto ("Fast Lunch
 * Premium", "Mall San Pedro") y en vertical se rotan y dejan de leerse.
 */
export function Barras({
  datos, formato, alto = 240,
}: {
  datos: Punto[];
  formato?: (v: number) => string;
  alto?: number;
}) {
  const fmt = formato ?? ((v: number) => String(v));

  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={datos} layout="vertical" margin={{ left: 4, right: 40, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRILLA} />
        <XAxis type="number" tick={{ fill: EJE, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category" dataKey="etiqueta" width={110}
          tick={{ fill: EJE, fontSize: 11 }} axisLine={false} tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          formatter={(v) => [fmt(Number(v)), ""] as [string, string]}
          contentStyle={{
            borderRadius: 12, border: "1px solid #E2E2E2",
            fontSize: 12, fontFamily: "inherit",
          }}
        />
        <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={18}>
          {datos.map((d, i) => (
            <Cell key={i} fill={d.color ?? (d.destacado ? RESALTE : APAGADO)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
