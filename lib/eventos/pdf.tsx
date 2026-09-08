import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCRC } from "@/lib/money";
import { NOMBRE_OCASION, POLITICA_EVENTO, type Ocasion } from "@/data/politicas";

/**
 * Cotizacion en PDF con la marca de Bread House.
 *
 * Se usa @react-pdf/renderer y no Puppeteer: Chromium en una funcion
 * serverless de Vercel pesa demasiado y arranca lento. Esto renderiza en el
 * runtime de Node sin navegador.
 *
 * La tipografia queda en Helvetica: Montserrat exigiria empaquetar el archivo
 * de fuente, y la regla de marca que si importa respetar aca es la de color.
 */
const NEGRO = "#000000";
const AMARILLO = "#FFF042";
const GRIS = "#6B6B6B";
const LINEA = "#E2E2E2";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: NEGRO },
  encabezado: {
    backgroundColor: NEGRO, padding: 20, marginBottom: 24,
    alignItems: "center", borderRadius: 8,
  },
  marca: { color: "#FFFFFF", fontSize: 18, fontFamily: "Helvetica-Bold" },
  bajada: { color: "#FFFFFF", fontSize: 7, letterSpacing: 2, marginTop: 3, opacity: 0.7 },
  titulo: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  sub: { color: GRIS, marginBottom: 20 },
  codigo: {
    backgroundColor: AMARILLO, color: NEGRO, padding: 8, borderRadius: 6,
    fontFamily: "Helvetica-Bold", fontSize: 13, textAlign: "center", marginBottom: 20,
  },
  grid: { flexDirection: "row", marginBottom: 20, gap: 24 },
  dato: { flex: 1 },
  etiqueta: { color: GRIS, fontSize: 7, letterSpacing: 1, marginBottom: 2 },
  valor: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  filaCabecera: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: NEGRO,
    paddingBottom: 5, marginBottom: 5,
  },
  fila: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINEA,
    paddingVertical: 5,
  },
  colConcepto: { flex: 4 },
  colCant: { flex: 1, textAlign: "right" },
  colPrecio: { flex: 1.5, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right" },
  totales: { marginTop: 12, marginLeft: "auto", width: 220 },
  filaTotal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  granTotal: {
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: NEGRO, paddingTop: 6, marginTop: 4,
  },
  granTotalTexto: { fontFamily: "Helvetica-Bold", fontSize: 13 },
  aviso: {
    marginTop: 24, borderWidth: 1, borderColor: LINEA, borderRadius: 6, padding: 12,
  },
  avisoTitulo: { fontFamily: "Helvetica-Bold", marginBottom: 4 },
  pie: { position: "absolute", bottom: 30, left: 40, right: 40, color: GRIS, fontSize: 7 },
});

export type DatosPdf = {
  codigoPublico: string;
  cliente: string;
  ocasion: string;
  sucursal: string;
  fechaLocal: string;
  fechaFlexible: boolean;
  numPersonas: number;
  items: { nombre: string; cantidad: number; precioUnitario: number }[];
  subtotal: number;
  ivaPct: number;
  servicioPct: number;
  total: number;
  deposito: number | null;
  emitidoEl: string;
};

export function CotizacionPdf({ d }: { d: DatosPdf }) {
  const iva = Math.round((d.subtotal * d.ivaPct) / 100);
  const servicio = Math.round((d.subtotal * d.servicioPct) / 100);

  return (
    <Document title={`Cotización ${d.codigoPublico} · Bread House`} author="Bread House">
      <Page size="LETTER" style={s.page}>
        <View style={s.encabezado}>
          <Text style={s.marca}>Bread House</Text>
          <Text style={s.bajada}>BISTRÓ &amp; CAFÉ</Text>
        </View>

        <Text style={s.titulo}>Cotización de evento</Text>
        <Text style={s.sub}>Emitida el {d.emitidoEl}</Text>

        <Text style={s.codigo}>{d.codigoPublico}</Text>

        <View style={s.grid}>
          <View style={s.dato}>
            <Text style={s.etiqueta}>CLIENTE</Text>
            <Text style={s.valor}>{d.cliente}</Text>
          </View>
          <View style={s.dato}>
            <Text style={s.etiqueta}>OCASIÓN</Text>
            <Text style={s.valor}>
              {NOMBRE_OCASION[d.ocasion as Ocasion] ?? d.ocasion}
            </Text>
          </View>
        </View>

        <View style={s.grid}>
          <View style={s.dato}>
            <Text style={s.etiqueta}>SUCURSAL</Text>
            <Text style={s.valor}>{d.sucursal}</Text>
          </View>
          <View style={s.dato}>
            <Text style={s.etiqueta}>FECHA</Text>
            <Text style={s.valor}>
              {d.fechaLocal}{d.fechaFlexible ? " (flexible)" : ""}
            </Text>
          </View>
          <View style={s.dato}>
            <Text style={s.etiqueta}>PERSONAS</Text>
            <Text style={s.valor}>{d.numPersonas}</Text>
          </View>
        </View>

        <View style={s.filaCabecera}>
          <Text style={[s.colConcepto, s.etiqueta]}>CONCEPTO</Text>
          <Text style={[s.colCant, s.etiqueta]}>CANT.</Text>
          <Text style={[s.colPrecio, s.etiqueta]}>PRECIO</Text>
          <Text style={[s.colTotal, s.etiqueta]}>TOTAL</Text>
        </View>

        {d.items.map((i, n) => (
          <View key={n} style={s.fila}>
            <Text style={s.colConcepto}>{i.nombre}</Text>
            <Text style={s.colCant}>{i.cantidad}</Text>
            <Text style={s.colPrecio}>{formatCRC(i.precioUnitario)}</Text>
            <Text style={s.colTotal}>{formatCRC(i.precioUnitario * i.cantidad)}</Text>
          </View>
        ))}

        <View style={s.totales}>
          <View style={s.filaTotal}>
            <Text style={{ color: GRIS }}>Subtotal</Text>
            <Text>{formatCRC(d.subtotal)}</Text>
          </View>
          <View style={s.filaTotal}>
            <Text style={{ color: GRIS }}>IVA {d.ivaPct}%</Text>
            <Text>{formatCRC(iva)}</Text>
          </View>
          <View style={s.filaTotal}>
            <Text style={{ color: GRIS }}>Servicio {d.servicioPct}%</Text>
            <Text>{formatCRC(servicio)}</Text>
          </View>
          <View style={s.granTotal}>
            <Text style={s.granTotalTexto}>Total</Text>
            <Text style={s.granTotalTexto}>{formatCRC(d.total)}</Text>
          </View>
          {d.numPersonas > 0 && (
            <View style={s.filaTotal}>
              <Text style={{ color: GRIS }}>Por persona</Text>
              <Text style={{ color: GRIS }}>
                {formatCRC(Math.round(d.total / d.numPersonas))}
              </Text>
            </View>
          )}
        </View>

        <View style={s.aviso}>
          <Text style={s.avisoTitulo}>Condiciones</Text>
          <Text>
            Para confirmar el evento se requiere un depósito del{" "}
            {POLITICA_EVENTO.depositoPct}%
            {d.deposito ? ` (${formatCRC(d.deposito)})` : ""}. No se trabaja con
            reembolso. El menú final se define{" "}
            {POLITICA_EVENTO.confirmacionMenuDiasAntes} días antes del evento.
          </Text>
        </View>

        <Text style={s.pie} fixed>
          Bread House · Bistró &amp; Café — Escazú · Pinares · Cartago · Mall San Pedro
        </Text>
      </Page>
    </Document>
  );
}
