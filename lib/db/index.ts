/**
 * Cliente de base de datos (Neon / Lakebase Postgres).
 *
 * Driver: node-postgres sobre Fluid compute de Vercel, que es lo que
 * recomienda Neon para este runtime — el pool se reutiliza entre requests
 * en vez de abrir una conexion por invocacion.
 *
 * `DATABASE_URL` es la cadena POOLED (hostname con `-pooler`). Las
 * migraciones usan `DATABASE_URL_UNPOOLED`: PgBouncer corre en modo
 * transaccion y rompe las sentencias de sesion que necesita drizzle-kit.
 */
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = ReturnType<typeof crearDb>;

function crearDb(connectionString: string) {
  const pool = new Pool({ connectionString, max: 10 });
  // Deja que Vercel drene el pool al suspender la instancia.
  attachDatabasePool(pool);
  return drizzle(pool, { schema });
}

let instancia: Database | null = null;

/**
 * Devuelve el cliente, creandolo la primera vez.
 *
 * Es perezoso a proposito: importar este modulo no puede tumbar el build
 * cuando `DATABASE_URL` todavia no esta configurada en el entorno.
 */
export function getDb(): Database {
  if (instancia) return instancia;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. Copiá .env.example a .env.local y pegá la cadena de conexión de Neon.",
    );
  }
  instancia = crearDb(url);
  return instancia;
}

/** `true` si hay credenciales de base de datos configuradas. */
export function hayBaseDeDatos(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export { schema };
