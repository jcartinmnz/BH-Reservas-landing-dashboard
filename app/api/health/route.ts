import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb, hayBaseDeDatos } from "@/lib/db";

/**
 * Chequeo de salud.
 *
 * Verifica que la aplicacion realmente alcanza la base y que el seed esta
 * cargado. Es la prueba de que el despliegue quedo conectado: el build de
 * Next puede pasar sin base, asi que un build verde no dice nada del enlace
 * a Postgres.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!hayBaseDeDatos()) {
    return NextResponse.json(
      {
        estado: "sin_base",
        detalle: "Falta DATABASE_URL en el entorno.",
      },
      { status: 503 },
    );
  }

  try {
    const db = getDb();
    const { rows } = await db.execute<{
      sucursales: string;
      menu_items: string;
      paquetes: string;
      franjas: string;
    }>(sql`
      SELECT
        (SELECT count(*) FROM branches WHERE activa)          AS sucursales,
        (SELECT count(*) FROM menu_items WHERE activo)        AS menu_items,
        (SELECT count(*) FROM packages WHERE activo)          AS paquetes,
        (SELECT count(DISTINCT franja) FROM branch_slot_capacity) AS franjas
    `);

    const conteos = rows[0];

    return NextResponse.json({
      estado: "ok",
      base: "neon",
      conteos: {
        sucursales: Number(conteos.sucursales),
        menuItems: Number(conteos.menu_items),
        paquetes: Number(conteos.paquetes),
        franjas: Number(conteos.franjas),
      },
      // El seed real son 4 sucursales, 124 ítems, 4 paquetes y 4 franjas.
      seedCompleto:
        Number(conteos.sucursales) === 4 &&
        Number(conteos.menu_items) === 124 &&
        Number(conteos.paquetes) === 4 &&
        Number(conteos.franjas) === 4,
    });
  } catch (error) {
    // No se filtra el mensaje crudo: la cadena de conexion aparece en varios
    // errores de node-postgres y lleva la contrasena.
    console.error("Fallo el chequeo de salud:", error);
    return NextResponse.json(
      { estado: "error", detalle: "No se pudo consultar la base de datos." },
      { status: 503 },
    );
  }
}
