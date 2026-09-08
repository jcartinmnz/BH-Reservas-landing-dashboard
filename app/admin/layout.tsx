import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ClipboardList, KanbanSquare, LineChart, Users } from "lucide-react";
import { obtenerSesion, NOMBRE_ROL, PUEDE } from "@/lib/auth/sesion";
import { hayAuthConfigurado } from "@/lib/auth/stack";

export const metadata = { title: "CRM" };
export const dynamic = "force-dynamic";

/**
 * Guarda de acceso del CRM.
 *
 * Se verifica en el layout, no en cada pagina: una pagina nueva bajo /admin
 * queda protegida por defecto, en vez de depender de que alguien se acuerde
 * de agregarle el chequeo.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!hayAuthConfigurado()) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-title">Falta configurar el acceso</h1>
        <p className="text-body text-bh-ink-700">
          El CRM necesita las variables de Neon Auth para el login. Están listadas en{" "}
          <code className="rounded bg-bh-ink-100 px-1">.env.example</code>.
        </p>
      </main>
    );
  }

  const sesion = await obtenerSesion();
  // Autenticarse no alcanza: si el correo no está en `staff`, no hay acceso.
  if (!sesion) redirect("/handler/sign-in");

  const navegacion = [
    { href: "/admin", etiqueta: "Calendario", icono: CalendarDays, visible: true },
    { href: "/admin/dia", etiqueta: "Servicio", icono: ClipboardList, visible: true },
    { href: "/admin/eventos", etiqueta: "Eventos", icono: KanbanSquare, visible: PUEDE.verPipeline(sesion) },
    { href: "/admin/clientes", etiqueta: "Clientes", icono: Users, visible: PUEDE.verClientes(sesion) },
    { href: "/admin/metricas", etiqueta: "Métricas", icono: LineChart, visible: PUEDE.verMetricas(sesion) },
  ].filter((n) => n.visible);

  return (
    <div className="min-h-dvh bg-bh-cream">
      <header className="sticky top-0 z-20 border-b border-bh-ink-200 bg-bh-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link href="/admin" className="shrink-0">
            <span className="text-heading">Bread House</span>
          </Link>

          <nav className="flex flex-1 gap-1 overflow-x-auto" aria-label="Secciones del CRM">
            {navegacion.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex min-h-touch items-center gap-2 whitespace-nowrap rounded-control px-3 text-caption font-bold text-bh-ink-700 transition hover:bg-bh-ink-100"
              >
                <n.icono className="size-4" />
                {n.etiqueta}
              </Link>
            ))}
          </nav>

          <div className="hidden shrink-0 text-right sm:block">
            <p className="text-caption font-bold">{sesion.nombre}</p>
            <p className="text-caption text-bh-ink-500">{NOMBRE_ROL[sesion.rol]}</p>
          </div>
          <Link
            href="/handler/sign-out"
            className="flex min-h-touch items-center rounded-control px-3 text-caption font-bold text-bh-ink-500 hover:bg-bh-ink-100"
          >
            Salir
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
