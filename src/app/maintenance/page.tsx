import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays } from "@/components/icons";
import { KelasbitLogo } from "@/components/kelasbit-logo";
import { MaintenanceCountdown } from "@/components/maintenance-countdown";
import {
  formatJakartaDateTime,
  getMaintenanceSetting,
} from "@/lib/settings/maintenance";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const maintenance = await getMaintenanceSetting();

  return {
    title: `${maintenance.title} — KelasBit`,
    description: maintenance.message,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ sesi?: string | string[] }>;
}) {
  const maintenance = await getMaintenanceSetting();
  const params = await searchParams;
  const sessionEnded = params.sesi === "berakhir";

  if (!maintenance.enabled) {
    redirect("/");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-slate-950 via-emerald-950 to-slate-900 px-5 py-16 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-teal-300/10 blur-3xl"
      />

      <div className="relative w-full max-w-xl text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]">
          <KelasbitLogo className="h-full w-full" priority />
        </span>

        <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.24em] text-emerald-300/80">
          KelasBit
        </p>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {maintenance.title}
        </h1>

        <p className="mx-auto mt-4 max-w-md whitespace-pre-line text-sm leading-relaxed text-white/70">
          {maintenance.message}
        </p>

        {sessionEnded ? (
          <p className="mx-auto mt-4 max-w-md rounded-xl border border-amber-300/25 bg-amber-400/10 px-4 py-2.5 text-xs leading-relaxed text-amber-100/90">
            Sesi Anda berakhir karena maintenance. Silakan masuk lagi setelah
            situs dibuka.
          </p>
        ) : null}

        {maintenance.until ? (
          <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="flex items-center justify-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/50">
              <CalendarDays className="h-3.5 w-3.5" />
              Perkiraan selesai
            </p>
            <p className="mt-2 text-sm font-bold text-white">
              {formatJakartaDateTime(maintenance.until)}
            </p>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-white/55">
              Buka otomatis dalam <MaintenanceCountdown until={maintenance.until.toISOString()} />
            </p>
          </div>
        ) : null}

        <p className="mt-10 text-[11px] font-medium text-white/35">
          Terima kasih atas kesabaran Anda.
        </p>
      </div>
    </main>
  );
}
