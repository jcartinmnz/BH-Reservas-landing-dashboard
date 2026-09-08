import Link from "next/link";
import { CalendarDays, PartyPopper } from "lucide-react";

export const metadata = { title: "Reservar" };

/** Pantalla de entrada: mesa o evento. */
export default function ReservarPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-8 px-5 py-12">
      <header>
        <p className="text-overline text-bh-ink-500">Bread House</p>
        <h1 className="mt-2 text-display">Reservá</h1>
      </header>

      <div className="flex flex-col gap-3">
        <Link
          href="/reservar/mesa"
          className="group rounded-card border border-bh-ink-200 bg-bh-white p-6 transition hover:border-bh-ink-900 hover:shadow-lift"
        >
          <span className="mb-3 flex size-11 items-center justify-center rounded-control bg-accent-bg text-accent-on">
            <CalendarDays className="size-5" />
          </span>
          <p className="text-heading">Reservar mesa</p>
          <p className="mt-1 text-caption text-bh-ink-500">De 1 a 7 personas</p>
        </Link>

        <Link
          href="/reservar/evento"
          className="group rounded-card border border-bh-ink-200 bg-bh-white p-6 transition hover:border-bh-ink-900 hover:shadow-lift"
        >
          <span className="mb-3 flex size-11 items-center justify-center rounded-control bg-support-bg text-support-on">
            <PartyPopper className="size-5" />
          </span>
          <p className="text-heading">Organizar un evento</p>
          <p className="mt-1 text-caption text-bh-ink-500">Desde 8 personas</p>
        </Link>
      </div>
    </main>
  );
}
