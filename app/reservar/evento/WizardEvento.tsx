"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendario } from "@/components/reservar/Calendario";
import { cn } from "@/lib/utils";
import { formatCRC } from "@/lib/money";
import { SUCURSALES } from "@/data/sucursales";
import { NOMBRE_OCASION, OCASIONES, POLITICA_EVENTO, type Ocasion } from "@/data/politicas";
import { FRANJAS_ORDENADAS, type Franja } from "@/lib/franjas";
import type { Cotizacion, RangoPresupuesto } from "@/lib/eventos/cotizador";
import { estimar, enviarSolicitud } from "./acciones";

type ItemPublico = { slug: string; nombre: string; categoria: string; precioColones: number };

/**
 * Orden de las preguntas segun el brief: fecha, ocasion, personas, sucursal,
 * presupuesto, estimado, personalizar, contacto.
 *
 * Se agrega un paso de franja que el brief no pide pero el modelo necesita
 * (toda reserva lleva franja) y que ademas es dato util: permite medir cuanta
 * demanda de eventos cae en Tardeada Social, la franja a recuperar.
 */
type Paso =
  | "fecha" | "ocasion" | "personas" | "sucursal" | "franja"
  | "presupuesto" | "estimado" | "personalizar" | "contacto";

const PASOS: Paso[] = [
  "fecha", "ocasion", "personas", "sucursal", "franja",
  "presupuesto", "estimado", "personalizar", "contacto",
];

const TITULO: Record<Paso, string> = {
  fecha: "¿Qué día es el evento?",
  ocasion: "¿Qué celebran?",
  personas: "¿Cuántas personas?",
  sucursal: "¿En cuál sucursal?",
  franja: "¿A qué hora, más o menos?",
  presupuesto: "¿Qué presupuesto manejan?",
  estimado: "Tu estimado",
  personalizar: "Armá tu menú",
  contacto: "¿Cómo te contactamos?",
};

type Props = {
  minimo: string;
  maximo: string;
  rangos: RangoPresupuesto[];
  sugerencias: ItemPublico[];
  extras: { slug: string; nombre: string; precioColones: number; unidad: string }[];
  sucursalInicial?: string;
};

export function WizardEvento(props: Props) {
  const router = useRouter();
  const [enviando, iniciarEnvio] = useTransition();
  const [, recalcular] = useTransition();

  const [paso, setPaso] = useState<Paso>("fecha");
  const [fecha, setFecha] = useState<string | null>(null);
  const [flexible, setFlexible] = useState(false);
  const [ocasion, setOcasion] = useState<Ocasion | null>(null);
  const [personas, setPersonas] = useState<number>(POLITICA_EVENTO.minPersonas);
  const [sucursal, setSucursal] = useState<string | null>(props.sucursalInicial ?? null);
  const [franja, setFranja] = useState<Franja | null>(null);
  const [paquete, setPaquete] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Record<string, number>>({});
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [preferencia, setPreferencia] = useState<"whatsapp" | "llamada" | "correo">("whatsapp");
  const [notas, setNotas] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [politica, setPolitica] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aMedida = paquete === "a-la-medida";
  const indice = PASOS.indexOf(paso);
  const sucursalElegida = SUCURSALES.find((s) => s.slug === sucursal);

  /** Recotiza cada vez que cambia algo que mueve el precio. */
  useEffect(() => {
    if (!paquete) return;
    recalcular(async () => {
      const res = await estimar({
        paqueteSlug: paquete,
        numPersonas: personas,
        seleccion: Object.entries(seleccion).map(([slug, cantidad]) => ({ slug, cantidad })),
      });
      setCotizacion(res.ok ? res.cotizacion : null);
    });
  }, [paquete, personas, seleccion]);

  function avanzar() {
    setError(null);
    // "A la medida" es el único que pasa por el paso de personalizar.
    const siguiente = PASOS[indice + 1];
    if (siguiente === "personalizar" && !aMedida) return setPaso("contacto");
    if (siguiente) setPaso(siguiente);
  }

  function volver() {
    setError(null);
    const anterior = PASOS[indice - 1];
    if (anterior === "personalizar" && !aMedida) return setPaso("estimado");
    if (anterior) setPaso(anterior);
  }

  function cantidad(slug: string) {
    return seleccion[slug] ?? 0;
  }

  function ajustar(slug: string, delta: number) {
    setSeleccion((s) => {
      const nueva = Math.max(0, (s[slug] ?? 0) + delta);
      const copia = { ...s };
      if (nueva === 0) delete copia[slug];
      else copia[slug] = nueva;
      return copia;
    });
  }

  function enviar() {
    setError(null);
    iniciarEnvio(async () => {
      const res = await enviarSolicitud({
        sucursalSlug: sucursal, fechaLocal: fecha, fechaFlexible: flexible,
        franja, ocasion, numPersonas: personas, paqueteSlug: paquete,
        seleccion: Object.entries(seleccion).map(([slug, c]) => ({ slug, cantidad: c })),
        nombre, telefono, email, preferenciaContacto: preferencia,
        notas, consentMarketing: marketing, aceptaPolitica: politica,
      });
      if (res.ok) router.push(`/reservar/evento/enviado/${res.codigoPublico}`);
      else setError(res.error);
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-10 pt-6">
      <header className="mb-6">
        <div className="mb-5 flex items-center gap-3">
          {indice > 0 ? (
            <button type="button" onClick={volver} aria-label="Volver"
              className="-ml-2 flex size-touch items-center justify-center rounded-control hover:bg-bh-ink-100">
              <ArrowLeft className="size-5" />
            </button>
          ) : (
            <Link href="/reservar" aria-label="Volver"
              className="-ml-2 flex size-touch items-center justify-center rounded-control hover:bg-bh-ink-100">
              <ArrowLeft className="size-5" />
            </Link>
          )}
          <div className="flex flex-1 gap-1.5" role="progressbar"
            aria-valuenow={indice + 1} aria-valuemin={1} aria-valuemax={PASOS.length}
            aria-label={`Paso ${indice + 1} de ${PASOS.length}`}>
            {PASOS.map((p, i) => (
              <span key={p} className={cn("h-1 flex-1 rounded-pill transition-colors",
                i <= indice ? "bg-bh-ink-900" : "bg-bh-ink-200")} />
            ))}
          </div>
        </div>
        <h1 className="text-title">{TITULO[paso]}</h1>
      </header>

      {paso === "fecha" && (
        <div>
          <Calendario valor={fecha} onChange={(f) => { setFecha(f); setPaso("ocasion"); }}
            minimo={props.minimo} maximo={props.maximo} />
          <label className="mt-4 flex cursor-pointer items-center gap-3 text-caption">
            <input type="checkbox" checked={flexible} onChange={(e) => setFlexible(e.target.checked)}
              className="size-5 accent-bh-ink-900" />
            <span>La fecha es flexible, podemos coordinarla</span>
          </label>
        </div>
      )}

      {paso === "ocasion" && (
        <div className="grid grid-cols-2 gap-2">
          {OCASIONES.map((o) => (
            <button key={o} type="button"
              onClick={() => { setOcasion(o); setPaso("personas"); }}
              className={cn("min-h-touch rounded-card border p-3 text-left text-caption font-bold transition",
                ocasion === o ? "border-bh-ink-900 bg-bh-ink-900 text-bh-white"
                  : "border-bh-ink-200 bg-bh-white hover:border-bh-ink-900")}>
              {NOMBRE_OCASION[o]}
            </button>
          ))}
        </div>
      )}

      {paso === "personas" && (
        <div>
          <div className="flex items-center justify-center gap-5 rounded-card border border-bh-ink-200 bg-bh-white p-6">
            <button type="button" aria-label="Menos personas"
              onClick={() => setPersonas((p) => Math.max(POLITICA_EVENTO.minPersonas, p - 1))}
              className="flex size-touch items-center justify-center rounded-control border border-bh-ink-200 hover:bg-bh-ink-100">
              <Minus className="size-4" />
            </button>
            <span className="min-w-16 text-center text-display">{personas}</span>
            <button type="button" aria-label="Más personas"
              onClick={() => setPersonas((p) => p + 1)}
              className="flex size-touch items-center justify-center rounded-control border border-bh-ink-200 hover:bg-bh-ink-100">
              <Plus className="size-4" />
            </button>
          </div>
          <p className="mt-3 text-caption text-bh-ink-500">
            Los eventos son desde {POLITICA_EVENTO.minPersonas} personas. Para menos,{" "}
            <Link href="/reservar/mesa" className="font-bold underline">reservá una mesa</Link>.
          </p>
          <Button full size="lg" className="mt-5" onClick={avanzar}>Seguir</Button>
        </div>
      )}

      {paso === "sucursal" && (
        <div className="flex flex-col gap-3">
          {SUCURSALES.map((s) => {
            const cabe = personas <= s.capacidadMaxEvento;
            return (
              <button key={s.slug} type="button" disabled={!cabe}
                onClick={() => { setSucursal(s.slug); setPaso("franja"); }}
                className={cn("rounded-card border p-4 text-left transition",
                  !cabe && "cursor-not-allowed border-bh-ink-200 bg-bh-ink-100 opacity-60",
                  cabe && "border-bh-ink-200 bg-bh-white hover:border-bh-ink-900 hover:shadow-soft")}>
                <p className="font-bold">{s.nombre}</p>
                <p className="text-caption text-bh-ink-500">
                  Hasta {s.capacidadMaxEvento} personas
                  {s.capacidadSalonPrivado && ` · salón privado de ${s.capacidadSalonPrivado}`}
                </p>
                {!cabe && (
                  <p className="mt-1 text-caption font-bold text-danger-fg">
                    No recibe grupos de {personas}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {paso === "franja" && (
        <div className="flex flex-col gap-2">
          {FRANJAS_ORDENADAS.map((f) => (
            <button key={f.codigo} type="button"
              onClick={() => { setFranja(f.codigo); setPaso("presupuesto"); }}
              className={cn("rounded-card border p-4 text-left transition",
                franja === f.codigo ? "border-bh-ink-900 bg-bh-ink-900 text-bh-white"
                  : "border-bh-ink-200 bg-bh-white hover:border-bh-ink-900")}>
              <p className="font-bold">{f.nombre}</p>
              <p className={cn("text-caption", franja === f.codigo ? "opacity-70" : "text-bh-ink-500")}>
                {String(Math.floor(f.inicioMin / 60)).padStart(2, "0")}:00 –{" "}
                {String(Math.floor(f.finMin / 60)).padStart(2, "0")}:00
              </p>
            </button>
          ))}
        </div>
      )}

      {paso === "presupuesto" && (
        <div className="flex flex-col gap-3">
          {props.rangos.map((r) => (
            <button key={r.slug} type="button"
              onClick={() => { setPaquete(r.slug); setPaso("estimado"); }}
              className="rounded-card border border-bh-ink-200 bg-bh-white p-4 text-left transition hover:border-bh-ink-900 hover:shadow-soft">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-heading">{r.nombre}</p>
                {r.precioPpCentimos !== null && (
                  <p className="whitespace-nowrap font-bold">
                    {formatCRC(r.precioPpCentimos)}
                    <span className="text-caption font-light text-bh-ink-500"> p/p</span>
                  </p>
                )}
              </div>
              <p className="mt-1 text-caption text-bh-ink-500">{r.descripcion}</p>
              {r.incluye.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {r.incluye.map((i) => (
                    <li key={i} className="flex gap-2 text-caption text-bh-ink-700">
                      <Check className="mt-0.5 size-3 shrink-0" /> {i}
                    </li>
                  ))}
                </ul>
              )}
            </button>
          ))}
        </div>
      )}

      {paso === "estimado" && cotizacion && (
        <div className="flex flex-col gap-4">
          <ResumenCotizacion c={cotizacion} />
          <Button full size="lg" onClick={avanzar}>
            {aMedida ? "Armar el menú" : "Seguir"}
          </Button>
          {!aMedida && (
            <button type="button" onClick={() => setPaquete("a-la-medida")}
              className="text-caption font-bold underline">
              Prefiero armarlo a mi medida
            </button>
          )}
        </div>
      )}

      {paso === "personalizar" && (
        <div className="flex flex-col gap-5">
          <p className="text-caption text-bh-ink-500">
            Agregá lo que quieras. El total se recalcula solo.
          </p>

          {["entradas", "pescados", "risottos", "carnes", "desayunos", "postres", "mimosa"].map((cat) => {
            const items = props.sugerencias.filter((i) => i.categoria === cat);
            if (items.length === 0) return null;
            return (
              <section key={cat}>
                <h2 className="mb-2 text-overline text-bh-ink-500">{cat}</h2>
                <div className="flex flex-col gap-1.5">
                  {items.slice(0, 6).map((i) => (
                    <FilaItem key={i.slug} nombre={i.nombre} precio={i.precioColones * 100}
                      cantidad={cantidad(i.slug)} onAjustar={(d) => ajustar(i.slug, d)} />
                  ))}
                </div>
              </section>
            );
          })}

          <section>
            <h2 className="mb-2 text-overline text-bh-ink-500">Extras</h2>
            <div className="flex flex-col gap-1.5">
              {props.extras.map((e) => (
                <FilaItem key={e.slug} nombre={`${e.nombre} (${e.unidad})`}
                  precio={e.precioColones * 100} cantidad={cantidad(e.slug)}
                  onAjustar={(d) => ajustar(e.slug, d)} />
              ))}
            </div>
          </section>

          {cotizacion && <ResumenCotizacion c={cotizacion} />}
          <Button full size="lg" onClick={() => setPaso("contacto")}
            disabled={cotizacion?.lineas.length === 0}>
            Seguir
          </Button>
        </div>
      )}

      {paso === "contacto" && (
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-bold">Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required
              autoComplete="name" className="input-bh" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-bold">Teléfono</span>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} required
              type="tel" inputMode="numeric" autoComplete="tel" placeholder="8888-8888"
              className="input-bh" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-bold">
              Correo <span className="font-light text-bh-ink-500">· para mandarte la cotización</span>
            </span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
              autoComplete="email" className="input-bh" />
          </label>

          <fieldset>
            <legend className="mb-2 text-caption font-bold">¿Cómo preferís que te contactemos?</legend>
            <div className="flex gap-2">
              {(["whatsapp", "llamada", "correo"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPreferencia(p)}
                  className={cn("min-h-touch flex-1 rounded-control border text-caption font-bold capitalize transition",
                    preferencia === p ? "border-bh-ink-900 bg-bh-ink-900 text-bh-white"
                      : "border-bh-ink-200 bg-bh-white")}>
                  {p}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-bold">
              Notas <span className="font-light text-bh-ink-500">· opcional</span>
            </span>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3}
              maxLength={500} className="input-bh resize-none"
              placeholder="Decoración, alergias, algo que debamos saber…" />
          </label>

          {cotizacion && <ResumenCotizacion c={cotizacion} />}

          <label className="flex cursor-pointer items-start gap-3 text-caption">
            <input type="checkbox" checked={politica} onChange={(e) => setPolitica(e.target.checked)}
              required className="mt-0.5 size-5 shrink-0 accent-bh-ink-900" />
            <span>
              Entiendo que es un estimado sujeto a confirmación, que para reservar se pide un
              depósito del {POLITICA_EVENTO.depositoPct}% y que no se trabaja con reembolso.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-caption text-bh-ink-500">
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-bh-ink-900" />
            <span>Quiero recibir novedades y promociones.</span>
          </label>

          {error && (
            <p role="alert" className="rounded-control bg-danger-bg p-3 text-caption text-danger-on">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" full disabled={enviando}>
            {enviando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {enviando ? "Enviando…" : "Enviar solicitud"}
          </Button>
          <p className="text-center text-caption text-bh-ink-500">
            Te contactamos en menos de {POLITICA_EVENTO.respuestaPrometidaHoras} horas.
          </p>
        </form>
      )}

      {sucursalElegida && paso !== "sucursal" && indice > 3 && (
        <p className="mt-6 text-caption text-bh-ink-500">
          {sucursalElegida.nombre} · {personas} personas{fecha && ` · ${fecha}`}
        </p>
      )}
    </main>
  );
}

function ResumenCotizacion({ c }: { c: Cotizacion }) {
  return (
    <div className="rounded-card border border-bh-ink-200 bg-bh-white p-5">
      {c.lineas.length > 0 ? (
        <ul className="mb-3 space-y-1.5">
          {c.lineas.map((l) => (
            <li key={l.slug} className="flex justify-between gap-3 text-caption">
              <span>
                {l.nombre} <span className="text-bh-ink-500">× {l.cantidad}</span>
              </span>
              <span className="whitespace-nowrap">{formatCRC(l.subtotalCentimos)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-caption text-bh-ink-500">Todavía no agregaste nada.</p>
      )}

      <dl className="space-y-1 border-t border-bh-ink-200 pt-3 text-caption">
        <Linea etiqueta="Subtotal" valor={formatCRC(c.subtotalCentimos)} />
        <Linea etiqueta={`IVA ${c.ivaPct}%`} valor={formatCRC(c.ivaCentimos)} />
        <Linea etiqueta={`Servicio ${c.servicioPct}%`} valor={formatCRC(c.servicioCentimos)} />
      </dl>

      <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-bh-ink-900 pt-3">
        <span className="text-heading">Total estimado</span>
        <span className="text-heading">{formatCRC(c.totalCentimos)}</span>
      </div>
      <p className="mt-1 text-right text-caption text-bh-ink-500">
        {formatCRC(c.porPersonaCentimos)} por persona
      </p>

      <p className="mt-4 rounded-control bg-accent-bg p-3 text-caption text-accent-on">
        <strong>Estimado sujeto a confirmación.</strong> Un asesor te contacta en menos de{" "}
        {POLITICA_EVENTO.respuestaPrometidaHoras} horas. Para confirmar pedimos un depósito de{" "}
        {formatCRC(c.depositoCentimos)}.
      </p>
    </div>
  );
}

function Linea({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-bh-ink-500">{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

function FilaItem({
  nombre, precio, cantidad, onAjustar,
}: {
  nombre: string; precio: number; cantidad: number; onAjustar: (d: number) => void;
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-control border p-2.5 transition",
      cantidad > 0 ? "border-bh-ink-900 bg-bh-white" : "border-bh-ink-200 bg-bh-white")}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-caption font-bold">{nombre}</p>
        <p className="text-caption text-bh-ink-500">{formatCRC(precio)}</p>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" aria-label={`Quitar ${nombre}`} onClick={() => onAjustar(-1)}
          disabled={cantidad === 0}
          className="flex size-9 items-center justify-center rounded-control border border-bh-ink-200 disabled:opacity-30">
          <Minus className="size-3.5" />
        </button>
        <span className="w-7 text-center text-caption font-bold">{cantidad}</span>
        <button type="button" aria-label={`Agregar ${nombre}`} onClick={() => onAjustar(1)}
          className="flex size-9 items-center justify-center rounded-control border border-bh-ink-200 hover:bg-bh-ink-100">
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
