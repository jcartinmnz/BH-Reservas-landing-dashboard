import { renderToBuffer } from "@react-pdf/renderer";
import { format } from "date-fns";
import { obtenerSesion } from "@/lib/auth/sesion";
import { eventoPorId } from "@/lib/crm/consultas";
import { CotizacionPdf } from "@/lib/eventos/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Genera la cotización final en PDF con la marca de Bread House. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sesion = await obtenerSesion();
  if (!sesion) return new Response("No autorizado", { status: 401 });

  const { id } = await params;
  // `eventoPorId` ya aplica el alcance por rol.
  const evento = await eventoPorId(sesion, id);
  if (!evento) return new Response("No encontrado", { status: 404 });

  const buffer = await renderToBuffer(
    <CotizacionPdf
      d={{
        codigoPublico: evento.codigoPublico,
        cliente: evento.cliente,
        ocasion: evento.ocasion,
        sucursal: evento.sucursal,
        fechaLocal: evento.fechaLocal,
        fechaFlexible: evento.fechaFlexible,
        numPersonas: evento.numPersonas,
        items: evento.items.map((i) => ({
          nombre: i.nombre,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
        })),
        subtotal: evento.subtotal,
        ivaPct: evento.ivaPct,
        servicioPct: evento.servicioPct,
        total: evento.totalConfirmado ?? evento.totalEstimado,
        deposito: evento.deposito,
        emitidoEl: format(new Date(), "dd/MM/yyyy"),
      }}
    />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cotizacion-${evento.codigoPublico}.pdf"`,
    },
  });
}
