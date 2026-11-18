import type { Metadata } from "next";
import type { ComponentType, SVGProps } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChipAI,
  ClipboardList,
  Megaphone,
  MonitorCode,
  Sparkles,
  TrendingUp,
} from "@/components/icons";
import { MiniBar, StatCard } from "@/components/dashboard/stat-card";
import { requireUser } from "@/lib/auth/session";
import { listMateri } from "@/lib/guru/queries";
import { SUBJECT_STYLES, toSubject } from "@/lib/guru/subjects";
import type { MateriView } from "@/lib/guru/types";

export const metadata: Metadata = {
  title: "Kelas Siswa — KelasBit",
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const todayFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function EmptyCard({
  id,
  title,
  description,
  icon: Icon,
}: {
  id?: string;
  title: string;
  description: string;
  icon: IconComponent;
}) {
  return (
    <section
      id={id}
      className="flex h-full scroll-mt-36 flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] xl:scroll-mt-24"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-extrabold text-slate-900">{title}</h2>
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

function MateriTerbaruCard({
  items,
  total,
}: {
  items: MateriView[];
  total: number;
}) {
  return (
    <section
      id="materi"
      className="scroll-mt-36 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] xl:scroll-mt-24"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-extrabold text-slate-900">Materi Terbaru</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
              Bahan ajar terbaru dari guru.
            </p>
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
          {total} materi
        </span>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-12 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-300 shadow-sm">
            <BookOpen className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-500">Belum ada materi</p>
          <p className="mt-1 text-xs text-slate-400">
            Materi dari guru akan tampil di sini.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {items.map((item) => {
            const subject = toSubject(item.subject);
            const styles = SUBJECT_STYLES[subject];
            const Icon = subject === "KKA" ? ChipAI : MonitorCode;

            return (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-colors hover:border-emerald-100 hover:bg-emerald-50/30"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${styles.tile}`}
                >
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">
                    {item.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ring-1 ${styles.badge}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                      {item.subject}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {item.createdAtLabel}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default async function SiswaDashboardPage() {
  const user = await requireUser("siswa");
  const rows = await listMateri();

  const materi: MateriView[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    subject: row.subject,
    createdAtLabel: dateFormatter.format(row.createdAt),
  }));

  const total = rows.length;
  const informatika = rows.filter((row) => row.subject === "Informatika").length;
  const kka = rows.filter((row) => row.subject === "KKA").length;

  const latest = rows.reduce<(typeof rows)[number] | null>(
    (acc, row) => (!acc || row.updatedAt > acc.updatedAt ? row : acc),
    null,
  );

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-emerald-500 via-emerald-700 to-teal-950 px-6 py-8 text-white shadow-[0_30px_60px_-40px_rgba(5,150,105,0.55)] sm:px-9 sm:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 right-24 h-64 w-64 rounded-full bg-teal-300/20 blur-3xl"
        />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80 ring-1 ring-white/15">
                <Sparkles className="h-3.5 w-3.5" />
                Kelas Siswa
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/70 ring-1 ring-white/10">
                <CalendarDays className="h-3.5 w-3.5" />
                {todayFormatter.format(new Date())}
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Halo, {user.name}!
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">
              Ayo mulai petualangan belajarmu di Informatika dan Koding &amp;
              Kecerdasan Artifisial (KKA). Materi terbaru sudah menunggumu.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#materi"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-lg shadow-emerald-950/20 transition-colors hover:bg-emerald-50"
              >
                Jelajahi Materi
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#tugas"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/25 transition-colors hover:bg-white/10"
              >
                Lihat Tugas
              </a>
            </div>
          </div>

          <div className="hidden w-full max-w-xs rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur lg:block">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/60">
              Materi Tersedia
            </p>
            <p className="mt-2 text-5xl font-extrabold tracking-tight">{total}</p>

            <div className="mt-5 space-y-3">
              <MiniBar
                label="Informatika"
                value={informatika}
                total={total}
                barClass="bg-sky-300"
              />
              <MiniBar
                label="KKA"
                value={kka}
                total={total}
                barClass="bg-violet-300"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Materi Tersedia"
          value={total}
          hint="Bahan ajar untukmu"
          icon={BookOpen}
          tone="emerald"
        />
        <StatCard
          label="Informatika"
          value={informatika}
          hint="Materi Informatika"
          icon={MonitorCode}
          tone="sky"
        />
        <StatCard
          label="KKA"
          value={kka}
          hint="Koding & Kecerdasan Artifisial"
          icon={ChipAI}
          tone="violet"
        />
        <StatCard
          label="Update Terakhir"
          value={latest ? dateFormatter.format(latest.updatedAt) : "—"}
          hint={latest?.title ?? "Belum ada materi"}
          icon={CalendarDays}
          tone="amber"
          small
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <MateriTerbaruCard items={materi.slice(0, 3)} total={total} />
        <EmptyCard
          id="tugas"
          title="Tugas Aktif"
          description="Tugas yang perlu kamu kerjakan."
          icon={ClipboardList}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <EmptyCard
          title="Jadwal Hari Ini"
          description="Agenda belajar yang akan kamu ikuti hari ini."
          icon={CalendarDays}
        />
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
