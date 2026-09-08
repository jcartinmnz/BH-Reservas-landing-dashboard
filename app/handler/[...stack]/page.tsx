import Link from "next/link";
import { StackHandler } from "@stackframe/stack";
import { getStackApp } from "@/lib/auth/stack";

export const dynamic = "force-dynamic";

/**
 * Rutas de Neon Auth: inicio de sesión, callback de OAuth, cierre de sesión.
 *
 * Si el login todavía no está configurado, la ruta lo dice en vez de reventar:
 * el resto de la app (todo el flujo público) sigue funcionando.
 */
export default function Handler(props: unknown) {
  const app = getStackApp();

  if (!app) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-title">Falta configurar el acceso</h1>
        <p className="text-body text-bh-ink-700">
          El login del CRM necesita las variables de Neon Auth. Están listadas en{" "}
          <code className="rounded bg-bh-ink-100 px-1">.env.example</code>.
        </p>
        <Link href="/" className="text-caption font-bold underline">
          Volver al inicio
        </Link>
      </main>
    );
  }

  return <StackHandler fullPage app={app} routeProps={props} />;
}
