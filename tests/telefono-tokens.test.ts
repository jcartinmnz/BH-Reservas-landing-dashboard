import { beforeAll, describe, expect, it } from "vitest";
import { esTelefonoCRValido, formatearTelefono, normalizarTelefonoCR } from "@/lib/telefono";
import { generarCodigoPublico } from "@/lib/codigo";

beforeAll(() => {
  process.env.CANCEL_TOKEN_SECRET = "secreto-de-prueba-suficientemente-largo";
});

describe("teléfonos de Costa Rica", () => {
  it("normaliza los formatos que escribe la gente al mismo E.164", () => {
    // El mismo número escrito de cinco formas tiene que dar un solo registro,
    // o el historial del CRM se parte.
    const esperado = "+50688887777";
    for (const entrada of [
      "88887777", "8888-7777", "8888 7777", "+506 8888 7777", "50688887777",
    ]) {
      expect(normalizarTelefonoCR(entrada)).toBe(esperado);
    }
  });

  it("acepta móviles (6,7,8) y fijos (2)", () => {
    expect(esTelefonoCRValido("60001111")).toBe(true);
    expect(esTelefonoCRValido("70001111")).toBe(true);
    expect(esTelefonoCRValido("80001111")).toBe(true);
    expect(esTelefonoCRValido("22001111")).toBe(true);
  });

  it("rechaza lo que no es un teléfono de CR", () => {
    expect(normalizarTelefonoCR("1234567")).toBeNull();      // muy corto
    expect(normalizarTelefonoCR("123456789")).toBeNull();    // muy largo
    expect(normalizarTelefonoCR("38887777")).toBeNull();     // prefijo inválido
    expect(normalizarTelefonoCR("+1 555 123 4567")).toBeNull();
    expect(normalizarTelefonoCR("")).toBeNull();
  });

  it("formatea para lectura", () => {
    expect(formatearTelefono("+50688887777")).toBe("8888-7777");
  });
});

describe("código público", () => {
  it("tiene el prefijo de marca y largo fijo", () => {
    const c = generarCodigoPublico();
    expect(c).toMatch(/^BH-[A-Z0-9]{5}$/);
  });

  it("no usa caracteres que se confunden al dictarlo por teléfono", () => {
    // Sin I, O, 0 ni 1: el cliente le dicta este código a Pani por WhatsApp.
    const codigos = Array.from({ length: 300 }, generarCodigoPublico);
    for (const c of codigos) {
      expect(c.slice(3)).not.toMatch(/[IO01]/);
    }
  });

  it("no repite en un volumen razonable", () => {
    const codigos = new Set(Array.from({ length: 2000 }, generarCodigoPublico));
    expect(codigos.size).toBe(2000);
  });
});

describe("tokens de cancelación", () => {
  it("valida el token correcto y rechaza uno ajeno", async () => {
    const { firmarToken, hashDeToken, tokenValido } = await import("@/lib/tokens");
    const id = "11111111-1111-1111-1111-111111111111";
    const otro = "22222222-2222-2222-2222-222222222222";

    const token = firmarToken(id);
    const hash = hashDeToken(token);

    expect(tokenValido(token, hash)).toBe(true);
    expect(tokenValido(firmarToken(otro), hash)).toBe(false);
    expect(tokenValido("inventado", hash)).toBe(false);
  });

  it("el hash guardado no permite reconstruir el token", async () => {
    const { firmarToken, hashDeToken } = await import("@/lib/tokens");
    const token = firmarToken("11111111-1111-1111-1111-111111111111");
    const hash = hashDeToken(token);
    // Si alguien lee la tabla de reservas, no puede cancelar reservas ajenas.
    expect(hash).not.toContain(token);
    expect(token).not.toContain(hash);
  });
});
