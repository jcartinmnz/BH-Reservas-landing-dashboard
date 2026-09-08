/**
 * Esquemas de validacion.
 *
 * Se usan en el cliente (react-hook-form) y en el servidor (server actions).
 * El mismo esquema en los dos lados: la validacion del cliente es comodidad,
 * la del servidor es la que manda.
 */
import { z } from "zod";
import { OCASIONES, POLITICA_MESA } from "@/data/politicas";
import { esTelefonoCRValido } from "@/lib/telefono";
import { SUCURSALES } from "@/data/sucursales";

const SLUGS = SUCURSALES.map((s) => s.slug) as [string, ...string[]];

export const fechaLocalSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const horaSchema = z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida");

export const consultaHorariosSchema = z.object({
  sucursalSlug: z.enum(SLUGS),
  fechaLocal: fechaLocalSchema,
  numPersonas: z.coerce
    .number()
    .int()
    .min(POLITICA_MESA.minPersonas)
    .max(POLITICA_MESA.maxPersonas),
});

export const reservaMesaSchema = z.object({
  sucursalSlug: z.enum(SLUGS),
  fechaLocal: fechaLocalSchema,
  hora: horaSchema,
  numPersonas: z.coerce
    .number()
    .int()
    .min(POLITICA_MESA.minPersonas, "Mínimo 1 persona")
    .max(POLITICA_MESA.maxPersonas, "Para 8 o más manejamos reserva de evento"),

  nombre: z
    .string()
    .trim()
    .min(2, "Necesitamos tu nombre")
    .max(120, "El nombre es muy largo"),

  telefono: z
    .string()
    .trim()
    .refine(esTelefonoCRValido, "Debe ser un teléfono de Costa Rica, 8 dígitos"),

  email: z
    .string()
    .trim()
    .email("El correo no parece válido")
    .max(160)
    .optional()
    .or(z.literal("")),

  ocasion: z.enum(OCASIONES).optional(),

  notasCliente: z.string().trim().max(500, "Máximo 500 caracteres").optional(),

  // Ley 8968: el consentimiento es explícito y opcional. Reservar no obliga a
  // aceptar comunicaciones comerciales.
  consentMarketing: z.boolean().default(false),

  // Aceptar la política de reserva sí es obligatorio.
  aceptaPolitica: z
    .boolean()
    .refine((v) => v === true, "Tenés que aceptar la política de reserva"),
});

export type ReservaMesaInput = z.input<typeof reservaMesaSchema>;
export type ReservaMesaOutput = z.output<typeof reservaMesaSchema>;
