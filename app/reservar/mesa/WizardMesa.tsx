"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendario } from "@/components/reservar/Calendario";
import { cn } from "@/lib/utils";
import { SUCURSALES } from "@/data/sucursales";
import { NOMBRE_OCASION, OCASIONES, POLITICA_MESA, type Ocasion } from "@/data/politicas";
import { EXPLICACION_MOTIVO, type Slot } from "@/lib/availability/engine";
import type { Franja } from "@/lib/franjas";
import { obtenerHorarios, enviarReserva } from "../acciones";

type Grupo = { franja: Franja; nombre: string; slots: Slot[] };

type Paso = "sucursal" | "personas" | "fecha" | "hora" | "datos";

const PASOS: Paso[] = ["sucursal", "personas", "fecha", "hora", "datos"];

const TITULO: Record<Paso, string> = {
  sucursal: "¿En cuál sucursal?",
  personas: "¿Cuántas personas?",
  fecha: "¿Qué día?",
  hora: "¿A qué hora?",
  datos: "Tus datos",
};

type Props = { minimo: string; maximo: string };

export function WizardMesa({ minimo, maximo }: Props) {
  const router = useRouter();
  const [enviando, iniciarEnvio] = useTransition();
  const [cargandoHoras, cargarHoras] = useTransition();

  const [paso, setPaso] = useState<Paso>("sucursal");
  const [sucursal, setSucursal] = useState<string | null>(null);
  const [personas, setPersonas] = useState<number | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [errorHoras, setErrorHoras] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [ocasion, setOcasion] = useState<Ocasion | "">("");
  const [notas, setNotas] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [politica, setPolitica] = useState(false);

  const indice = PASOS.indexOf(paso);

  function volver() {
    setError(null);
    if (indice > 0) setPaso(PASOS[indice - 1]);
  }

  /** Al elegir fecha se consultan los horarios reales contra la base. */
  function elegirFecha(nuevaFecha: string) {
    setFecha(nuevaFecha);
    setHora(null);
    setErrorHoras(null);
    setPaso("hora");

    cargarHoras(async () => {
      const res = await obtenerHorarios({
        sucursalSlug: sucursal,
        fechaLocal: nuevaFecha,
        numPersonas: personas,
      });
      if (res.ok) {
        setGrupos(res.grupos);
        if (!res.hayCupo) setErrorHoras("No queda campo ese día. Probá con otra fecha.");
      } else {
        setGrupos([]);
        setErrorHoras(res.error);
      }
    });
  }

  function confirmar() {
    setError(null);
    iniciarEnvio(async () => {
      const res = await enviarReserva({
        sucursalSlug: sucursal,
        fechaLocal: fecha,
        hora,
        numPersonas: personas,
        nombre,
        telefono,
        email,
        ocasion: ocasion || undefined,
        notasCliente: notas,
        consentMarketing: marketing,
        aceptaPolitica: politica,
      });

      if (res.ok) {
        router.push(`/reservar/confirmacion/${res.codigoPublico}`);
      } else {
        setError(res.error);
        // Si el horario se ocupó mientras llenaba los datos, lo devuelve al
        // paso de hora en vez de dejarlo trabado en un formulario que no pasa.
        if (res.campo === "hora") setPaso("hora");
      }
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-10 pt-6">
      <header className="mb-6">
        <div className="mb-5 flex items-center gap-3">
          {indice > 0 ? (
            <button
              type="button"
              onClick={volver}
              aria-label="Volver"
              className="-ml-2 flex size-touch items-center justify-center rounded-control hover:bg-bh-ink-100"
            >
              <ArrowLeft className="size-5" />
            </button>
          ) : (
            <Link
              href="/reservar"
              aria-label="Volver"
              className="-ml-2 flex size-touch items-center justify-center rounded-control hover:bg-bh-ink-100"
            >
              <ArrowLeft className="size-5" />
            </Link>
          )}
          <div
            className="flex flex-1 gap-1.5"
            role="progressbar"
            aria-valuenow={indice + 1}
            aria-valuemin={1}
            aria-valuemax={PASOS.length}
            aria-label={`Paso ${indice + 1} de ${PASOS.length}`}
          >
            {PASOS.map((p, i) => (
              <span
                key={p}
                className={cn(
                  "h-1 flex-1 rounded-pill transition-colors",
                  i <= indice ? "bg-bh-ink-900" : "bg-bh-ink-200",
                )}
              />
            ))}
          </div>
        </div>
        <h1 className="text-title">{TITULO[paso]}</h1>
      </header>

      {/* ---------------------------------------------------- sucursal --- */}
      {paso === "sucursal" && (
        <div className="flex flex-col gap-3">
          {SUCURSALES.map((s) => (
            <button
              key={s.slug}
              type="button"
              onClick={() => {
                setSucursal(s.slug);
                setPaso("personas");
              }}
              className="rounded-card border border-bh-ink-200 bg-bh-white p-4 text-left transition hover:border-bh-ink-900 hover:shadow-soft"
            >
              <p className="font-bold">{s.nombre}</p>
              <p className="text-caption text-bh-ink-500">{s.conceptoZona}</p>
              <p className="mt-2 text-caption text-bh-ink-500">
                {s.horarios[0].abre.slice(0, 5)}–{s.horarios[0].cierra.slice(0, 5)} · hasta{" "}
                {s.capacidadTotal} personas
              </p>
            </button>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------- personas --- */}
      {paso === "personas" && (
        <div>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: POLITICA_MESA.maxPersonas }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setPersonas(n);
                  setPaso("fecha");
                }}
                className={cn(
                  "flex aspect-square min-h-touch flex-col items-center justify-center rounded-card border text-title transition",
                  personas === n
                    ? "border-bh-ink-900 bg-bh-ink-900 text-bh-white"
                    : "border-bh-ink-200 bg-bh-white hover:border-bh-ink-900",
                )}
              >
                {n}
              </button>
            ))}
          </div>

          {/* 8+ salta al flujo de eventos conservando lo ya llenado. */}
          <div className="mt-4 rounded-card border border-bh-ink-200 bg-bh-ink-100 p-4">
            <p className="flex items-center gap-2 font-bold">
              <Users className="size-4" /> ¿Son 8 o más?
            </p>
            <p className="mt-1 text-caption text-bh-ink-700">
              Para grupos grandes manejamos reserva de evento, con menú y espacio armados
              para ustedes.
            </p>
            <Button asChild variant="solid" size="sm" className="mt-3">
              <Link href={`/reservar/evento?sucursal=${sucursal ?? ""}`}>
                Cotizar un evento
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- fecha --- */}
      {paso === "fecha" && (
        <Calendario valor={fecha} onChange={elegirFecha} minimo={minimo} maximo={maximo} />
      )}

      {/* -------------------------------------------------------- hora --- */}
      {paso === "hora" && (
        <div>
          {cargandoHoras && (
            <p className="flex items-center gap-2 py-8 text-bh-ink-500">
              <Loader2 className="size-4 animate-spin" /> Buscando horarios…
            </p>
          )}

          {!cargandoHoras && errorHoras && (
            <div className="rounded-card border border-bh-ink-200 bg-bh-white p-5 text-center">
              <p className="text-bh-ink-700">{errorHoras}</p>
              <Button variant="outline" className="mt-4" onClick={() => setPaso("fecha")}>
                Elegir otra fecha
              </Button>
            </div>
          )}

          {!cargandoHoras && !errorHoras && (
            <div className="flex flex-col gap-5">
              {grupos.map((g) => (
                <section key={g.franja}>
                  <h2 className="mb-2 text-overline text-bh-ink-500">{g.nombre}</h2>
                  <div className="grid grid-cols-4 gap-2">
                    {g.slots.map((s) => (
                      <button
                        key={s.hora}
                        type="button"
                        disabled={!s.disponible}
                        title={s.motivo ? EXPLICACION_MOTIVO[s.motivo] : undefined}
                        onClick={() => {
                          setHora(s.hora);
                          setPaso("datos");
                        }}
                        className={cn(
                          "min-h-touch rounded-control border text-body transition",
                          hora === s.hora && "border-bh-ink-900 bg-bh-ink-900 text-bh-white",
                          s.disponible && hora !== s.hora &&
                            "border-bh-ink-200 bg-bh-white hover:border-bh-ink-900",
                          !s.disponible &&
                            "cursor-not-allowed border-transparent bg-bh-ink-100 text-bh-ink-300 line-through",
                        )}
                      >
                        {s.hora}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------- datos --- */}
      {paso === "datos" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            confirmar();
          }}
        >
          <Campo etiqueta="Nombre" requerido>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              autoComplete="name"
              className="input-bh"
            />
          </Campo>

          <Campo etiqueta="Teléfono" requerido ayuda="8 dígitos">
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              required
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="8888-8888"
              className="input-bh"
            />
          </Campo>

          <Campo etiqueta="Correo" ayuda="Para mandarte la confirmación">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className="input-bh"
            />
          </Campo>

          <Campo etiqueta="Ocasión">
            <select
              value={ocasion}
              onChange={(e) => setOcasion(e.target.value as Ocasion | "")}
              className="input-bh"
            >
              <option value="">Sin ocasión especial</option>
              {OCASIONES.map((o) => (
                <option key={o} value={o}>
                  {NOMBRE_OCASION[o]}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Notas" ayuda="Alergias, silla de bebé, mascota…">
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              maxLength={500}
              className="input-bh resize-none"
            />
          </Campo>

          <label className="flex cursor-pointer items-start gap-3 text-caption">
            <input
              type="checkbox"
              checked={politica}
              onChange={(e) => setPolitica(e.target.checked)}
              required
              className="mt-0.5 size-5 shrink-0 accent-bh-ink-900"
            />
            <span>
              Acepto la política de reserva: guardan mi mesa{" "}
              {POLITICA_MESA.toleranciaLlegadaMin} minutos y puedo cancelar sin costo
              hasta {POLITICA_MESA.cancelacionSinPenalidadHoras} horas antes.
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 text-caption text-bh-ink-500">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-bh-ink-900"
            />
            <span>Quiero recibir novedades y promociones. Puedo darme de baja cuando quiera.</span>
          </label>

          {error && (
            <p role="alert" className="rounded-control bg-danger-bg p-3 text-caption text-danger-on">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" full disabled={enviando}>
            {enviando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {enviando ? "Reservando…" : "Confirmar reserva"}
          </Button>
        </form>
      )}
    </main>
  );
}

function Campo({
  etiqueta, ayuda, requerido, children,
}: {
  etiqueta: string;
  ayuda?: string;
  requerido?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-caption font-bold">
        {etiqueta}
        {!requerido && <span className="font-light text-bh-ink-500"> · opcional</span>}
      </span>
      {children}
      {ayuda && <span className="text-caption text-bh-ink-500">{ayuda}</span>}
    </label>
  );
}
