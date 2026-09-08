import { redirect } from "next/navigation";
import { obtenerSesion, PUEDE } from "@/lib/auth/sesion";
import { listarClientes } from "@/lib/crm/consultas";
import { TablaClientes } from "./TablaClientes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clientes" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sesion = (await obtenerSesion())!;
  if (!PUEDE.verClientes(sesion)) redirect("/admin");

  const { q } = await searchParams;
  const clientes = await listarClientes(sesion, q);

  return (
    <TablaClientes
      clientes={clientes.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        ultimaVisita: c.ultimaVisita ? new Date(c.ultimaVisita).toISOString() : null,
      }))}
      busqueda={q ?? ""}
      puedeExportar={PUEDE.exportarDatos(sesion)}
    />
  );
}
