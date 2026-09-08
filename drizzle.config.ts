import { defineConfig } from "drizzle-kit";
import "dotenv/config";

/**
 * Las migraciones van por la conexion DIRECTA (sin `-pooler`): PgBouncer en
 * modo transaccion no soporta las sentencias de sesion que emite drizzle-kit,
 * y falla de formas que no mencionan el pooling.
 */
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
