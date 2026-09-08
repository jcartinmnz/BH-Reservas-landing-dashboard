import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { staff } from "@/lib/db/schema";
import { getStackApp } from "./stack";

export type Rol = "admin" | "gerente_sucursal" | "anfitrion";

export type Sesion = {
  staffId: string;
  nombre: string;
  email: string;
  rol: Rol;
  /** null para admin: ve todas las sucursales. */
  branchId: string | null;
};

/**
 * Sesion del CRM.
 *
 * Autenticacion y autorizacion son cosas distintas y se resuelven en dos
 * lugares distintos a proposito: Neon Auth dice QUIEN es la persona, y la
 * tabla `staff` dice QUE puede hacer. Que alguien logre iniciar sesion no le
 * da acceso: si su correo no esta en `staff`, no entra.
 *
 * `cache` la memoiza por request, para no consultar la base en cada layout.
 */
export const obtenerSesion = cache(async (): Promise<Sesion | null> => {
  const app = getStackApp();
  if (!app) return null;

  const user = await app.getUser();
  if (!user?.primaryEmail) return null;

  const db = getDb();
  const [fila] = await db
    .select()
    .from(staff)
    .where(eq(staff.email, user.primaryEmail.toLowerCase()))
    .limit(1);

  if (!fila || !fila.activo) return null;

  // Se enlaza el id de Neon Auth en el primer ingreso. Asi se puede dar de
  // alta a alguien antes de que entre por primera vez.
  if (!fila.authUserId) {
    await db.update(staff).set({ authUserId: user.id }).where(eq(staff.id, fila.id));
  }

  return {
    staffId: fila.id,
    nombre: fila.nombre,
    email: fila.email,
    rol: fila.rol,
    branchId: fila.branchId,
  };
});

/** Sucursales que la sesión puede ver. `null` = todas. */
export function alcanceSucursal(sesion: Sesion): string | null {
  return sesion.rol === "admin" ? null : sesion.branchId;
}

/** Permisos por rol, en un solo lugar para no dispersarlos por la UI. */
export const PUEDE = {
  verTodasLasSucursales: (s: Sesion) => s.rol === "admin",
  cambiarEstadoReserva: () => true,
  editarNotasInternas: (s: Sesion) => s.rol !== "anfitrion",
  verPipeline: (s: Sesion) => s.rol !== "anfitrion",
  editarCotizacion: (s: Sesion) => s.rol !== "anfitrion",
  registrarDeposito: (s: Sesion) => s.rol === "admin",
  verMetricas: (s: Sesion) => s.rol !== "anfitrion",
  verClientes: (s: Sesion) => s.rol !== "anfitrion",
  exportarDatos: (s: Sesion) => s.rol === "admin",
} as const;

export const NOMBRE_ROL: Record<Rol, string> = {
  admin: "Administración",
  gerente_sucursal: "Gerencia de sucursal",
  anfitrion: "Anfitrión",
};
