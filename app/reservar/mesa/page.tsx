import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { WizardMesa } from "./WizardMesa";
import { POLITICA_MESA } from "@/data/politicas";
import { TZ } from "@/lib/datetime";

export const metadata = { title: "Reservar mesa" };

/**
 * La ventana de fechas se calcula en el servidor, en hora de Costa Rica.
 * Si se calculara en el cliente, alguien en otro huso veria un rango corrido
 * un dia.
 */
export default function MesaPage() {
  const hoyCR = toZonedTime(new Date(), TZ);
  const minimo = format(hoyCR, "yyyy-MM-dd");
  const maximo = format(addDays(hoyCR, POLITICA_MESA.anticipacionMaximaDias), "yyyy-MM-dd");

  return <WizardMesa minimo={minimo} maximo={maximo} />;
}
