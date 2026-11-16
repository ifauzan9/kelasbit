import type { Metadata } from "next";
import type { ComponentType, SVGProps } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Megaphone,
  TrendingUp,
} from "@/components/icons";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Dashboard Siswa — KelasBit",
};

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function EmptyCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: IconComponent;
}) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)]">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{description}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-300 shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-semibold text-slate-500">Belum ada data</p>
        <p className="mt-1 text-xs text-slate-400">Konten akan tampil di sini.</p>
      </div>
    </section>
  );
}

export default async function SiswaDashboardPage() {
  const user = await requireUser("siswa");

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-emerald-500 via-emerald-600 to-emerald-900 px-6 py-8 text-white shadow-[0_30px_60px_-40px_rgba(5,150,105,0.55)] sm:px-9 sm:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 right-24 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl"
        />

        <div className="relative max-w-2xl">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-white/60">
            Dashboard Siswa
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Selamat datang, {user.name}!
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">
            Ayo mulai petualangan belajarmu di Informatika dan Koding &amp; Kecerdasan
            Artifisial (KKA). Materi dan aktivitas akan tampil di sini.
          </p>
        </div>
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <EmptyCard
          title="Materi Terbaru"
          description="Materi Informatika dan KKA yang baru ditambahkan."
          icon={BookOpen}
        />
        <EmptyCard
          title="Tugas Aktif"
          description="Tugas yang perlu kamu kerjakan."
          icon={ClipboardList}
        />
        <EmptyCard
          title="Jadwal Hari Ini"
          description="Agenda belajar yang akan kamu ikuti hari ini."
          icon={CalendarDays}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <EmptyCard
          title="Progress Belajar"
          description="Perkembangan belajarmu pada setiap mata pelajaran."
          icon={TrendingUp}
        />
        <EmptyCard
          title="Pengumuman"
          description="Informasi terbaru dari guru."
          icon={Megaphone}
        />
      </div>
    </>
  );
}
