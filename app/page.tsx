import Link from "next/link";
import { SUCURSALES } from "@/data/sucursales";
import { FRANJAS_ORDENADAS } from "@/lib/franjas";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-10 px-6 py-16">
      <header className="space-y-4">
        <p className="text-overline text-bh-ink-500">Bistró &amp; Café</p>
        <h1 className="text-display">Bread House</h1>
        <p className="text-body max-w-md text-bh-ink-700">
          Reservá tu mesa en segundos o cotizá tu evento privado desde ocho personas.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/reservar"
          className="flex min-h-touch flex-1 items-center justify-center rounded-control bg-accent-bg px-6 font-bold text-accent-on shadow-soft transition hover:shadow-lift"
        >
          Reservar mesa
        </Link>
        <Link
          href="/reservar/evento"
          className="flex min-h-touch flex-1 items-center justify-center rounded-control border border-bh-ink-900 px-6 font-bold text-bh-ink-900 transition hover:bg-bh-ink-100"
        >
          Organizar un evento
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-overline text-bh-ink-500">Sucursales</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {SUCURSALES.map((s) => (
            <li
              key={s.slug}
              className="rounded-card border border-bh-ink-200 bg-bh-white p-4"
            >
              <p className="font-bold">{s.nombre}</p>
              <p className="text-caption text-bh-ink-500">{s.conceptoZona}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-overline text-bh-ink-500">Franjas</h2>
        <ul className="flex flex-wrap gap-2">
          {FRANJAS_ORDENADAS.map((f) => (
            <li
              key={f.codigo}
              className={`rounded-pill px-3 py-1 text-caption ${
                f.enRecuperacion
                  ? "bg-support-bg font-bold text-support-on"
                  : "bg-bh-ink-100 text-bh-ink-700"
              }`}
            >
              {f.nombre}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
