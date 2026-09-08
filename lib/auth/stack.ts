import "server-only";
import { StackServerApp } from "@stackframe/stack";

/**
 * Neon Auth (Stack) — configuracion del servidor.
 *
 * La construccion es PEREZOSA a proposito. El SDK revienta al cargar el modulo
 * si faltan las variables, y eso tumbaba el build entero: sin login del admin
 * configurado, tampoco compilaba el flujo publico de reservas. Son dos cosas
 * independientes y deben poder desplegarse por separado.
 *
 * Proveedores activos: Google y GitHub (compartidos). Email/contrasena viene
 * deshabilitado en el proyecto de Neon Auth.
 */
let instancia: StackServerApp | null = null;

export function hayAuthConfigurado(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_STACK_PROJECT_ID &&
      process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY &&
      process.env.STACK_SECRET_SERVER_KEY,
  );
}

export function getStackApp(): StackServerApp | null {
  if (!hayAuthConfigurado()) return null;
  instancia ??= new StackServerApp({
    tokenStore: "nextjs-cookie",
    urls: { signIn: "/handler/sign-in", afterSignIn: "/admin", afterSignOut: "/" },
  });
  return instancia;
}
