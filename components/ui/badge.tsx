import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Badge de estado.
 *
 * Cada variante es un par fondo/texto ya validado contra WCAG AA. No existe
 * una variante que use amarillo o teal como color de texto: sobre blanco dan
 * 1,2:1 y 2,3:1 (docs/MARCA.md §5).
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-pill px-2.5 py-0.5 text-caption font-bold",
  {
    variants: {
      estado: {
        pendiente: "bg-accent-bg text-accent-on",
        confirmada: "bg-support-bg text-support-on",
        sentada: "bg-bh-ink-900 text-bh-white",
        completada: "bg-bh-ink-200 text-bh-ink-700",
        cancelada: "bg-danger-bg text-danger-on",
        no_show: "bg-danger-fg text-bh-white",
        neutral: "bg-bh-ink-100 text-bh-ink-700",
      },
    },
    defaultVariants: { estado: "neutral" },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, estado, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ estado }), className)} {...props} />;
}

/** Etiqueta legible de cada estado de reserva. */
export const NOMBRE_ESTADO = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  sentada: "Sentada",
  completada: "Completada",
  cancelada: "Cancelada",
  no_show: "No-show",
} as const;
