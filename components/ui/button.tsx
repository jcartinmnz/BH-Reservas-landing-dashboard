import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Boton.
 *
 * Los acentos de marca solo aparecen como FONDO con texto negro
 * (docs/MARCA.md §5): #FFF042 y #38B6AB como color de texto reprueban
 * WCAG AA. No hay variante que los use como foreground.
 *
 * Altura minima `touch` (44px) en todas las variantes: la mayoria del
 * trafico entra desde el link de Instagram, en movil.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-control font-bold transition-shadow disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** CTA principal: amarillo de marca, texto negro. */
        primary: "bg-accent-bg text-accent-on shadow-soft hover:shadow-lift",
        /** Acento de apoyo: teal, texto negro. */
        support: "bg-support-bg text-support-on shadow-soft hover:shadow-lift",
        /** Acción seria sobre fondo claro. */
        solid: "bg-bh-ink-900 text-bh-white hover:bg-bh-ink-700",
        outline: "border border-bh-ink-900 text-bh-ink-900 hover:bg-bh-ink-100",
        ghost: "text-bh-ink-700 hover:bg-bh-ink-100",
        danger: "bg-danger-bg text-danger-on hover:brightness-95",
      },
      size: {
        default: "min-h-touch px-5 text-body",
        sm: "min-h-touch px-3 text-caption",
        lg: "min-h-[3.25rem] px-7 text-heading",
        /** Cuadrado para iconos, sin bajar del target táctil. */
        icon: "size-touch",
      },
      full: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "default", full: false },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, full, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, full }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
