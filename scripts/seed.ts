/**
 * Seed con los datos reales de docs/.
 *
 * Idempotente: se puede correr varias veces. Usa la conexion DIRECTA
 * (DATABASE_URL_UNPOOLED) porque inserta en lote.
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";

import * as schema from "../lib/db/schema";
import { SUCURSALES, topeReservablePorFranja } from "../data/sucursales";
import { MENU } from "../data/menu";
import { PAQUETES } from "../data/paquetes";
import { FRANJAS } from "../lib/franjas";
import { colonesACentimos } from "../lib/money";
import type { DiaSemana } from "../lib/datetime";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL_UNPOOLED (o DATABASE_URL). Ver .env.example.");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const db = drizzle(pool, { schema });

async function seedSucursales() {
  for (const s of SUCURSALES) {
    const [branch] = await db
      .insert(schema.branches)
      .values({
        slug: s.slug,
        nombre: s.nombre,
        conceptoZona: s.conceptoZona,
        direccion: s.direccion,
        telefono: s.telefono,
        capacidadTotal: s.capacidadTotal,
        capacidadMaxEvento: s.capacidadMaxEvento,
        capacidadSalonPrivado: s.capacidadSalonPrivado,
        tieneBhFit: s.tieneBhFit,
      })
      .onConflictDoUpdate({
        target: schema.branches.slug,
        set: {
          nombre: s.nombre,
          capacidadTotal: s.capacidadTotal,
          capacidadMaxEvento: s.capacidadMaxEvento,
          capacidadSalonPrivado: s.capacidadSalonPrivado,
          tieneBhFit: s.tieneBhFit,
        },
      })
      .returning();

    // Horarios
    await db.delete(schema.branchHours).where(eq(schema.branchHours.branchId, branch.id));
    await db.insert(schema.branchHours).values(
      s.horarios.map((h) => ({
        branchId: branch.id,
        diaSemana: h.dia,
        abre: h.abre,
        cierra: h.cierra,
      })),
    );

    // Capacidad por franja y dia. null = sin tope (lun-vie); los fines de
    // semana el 30% de la capacidad total, por franja.
    await db
      .delete(schema.branchSlotCapacity)
      .where(eq(schema.branchSlotCapacity.branchId, branch.id));

    const filas = [];
    for (let dia = 0 as DiaSemana; dia <= 6; dia = (dia + 1) as DiaSemana) {
      const esFinDeSemana = dia === 0 || dia === 6;
      const tope = esFinDeSemana ? topeReservablePorFranja(s, dia) : null;
      for (const franja of FRANJAS) {
        filas.push({ branchId: branch.id, franja, diaSemana: dia, capacidadMax: tope });
      }
    }
    await db.insert(schema.branchSlotCapacity).values(filas);

    console.log(`  ✓ ${s.nombre} — ${s.horarios.length} días, ${filas.length} topes de franja`);
  }
}

async function seedMenu() {
  for (const item of MENU) {
    await db
      .insert(schema.menuItems)
      .values({
        slug: item.slug,
        nombre: item.nombre,
        categoria: item.categoria,
        precioCentimos: colonesACentimos(item.precioColones),
        clasificacion: item.clasificacion,
        esBebida: item.esBebida,
        aptoEvento: item.aptoEvento,
        // Se guarda x10 para no perder el decimal sin usar float.
        foodCostPct: Math.round(item.foodCostPct * 10),
        unidades2026: item.unidades2026,
      })
      .onConflictDoUpdate({
        target: schema.menuItems.slug,
        set: {
          precioCentimos: colonesACentimos(item.precioColones),
          clasificacion: item.clasificacion,
          aptoEvento: item.aptoEvento,
          foodCostPct: Math.round(item.foodCostPct * 10),
          unidades2026: item.unidades2026,
        },
      });
  }
  console.log(`  ✓ ${MENU.length} ítems de menú`);
}

async function seedPaquetes() {
  for (const p of PAQUETES) {
    await db
      .insert(schema.packages)
      .values({
        slug: p.slug,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precioPpCentimos: colonesACentimos(p.precioPpColones),
        minPersonas: p.minPersonas,
        incluyeJson: p.incluye,
        orden: p.orden,
      })
      .onConflictDoUpdate({
        target: schema.packages.slug,
        set: {
          precioPpCentimos: colonesACentimos(p.precioPpColones),
          incluyeJson: p.incluye,
        },
      });
  }
  console.log(`  ✓ ${PAQUETES.length} paquetes de evento`);
}

async function main() {
  console.log("Seed Bread House\n");
  console.log("Sucursales:");
  await seedSucursales();
  console.log("Menú:");
  await seedMenu();
  console.log("Paquetes:");
  await seedPaquetes();
  console.log("\nListo.");
  await pool.end();
}

main().catch(async (e) => {
  console.error("Falló el seed:", e);
  await pool.end();
  process.exit(1);
});
