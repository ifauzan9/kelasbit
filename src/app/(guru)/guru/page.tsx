import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ChipAI,
  GraduationCap,
  MonitorCode,
  Plus,
  Sparkles,
  Users,
} from "@/components/icons";
import { MiniBar, StatCard } from "@/components/dashboard/stat-card";
import { MateriManager } from "@/components/guru/materi-manager";
import { MaintenanceScheduleNotice } from "@/components/maintenance-schedule-notice";
import { requireUser } from "@/lib/auth/session";
import { listKelas } from "@/lib/guru/kelas-queries";
import { listMateri } from "@/lib/guru/queries";
import { countSiswa } from "@/lib/guru/siswa-queries";
import { getMaintenanceSetting } from "@/lib/settings/maintenance";

export const metadata: Metadata = {
  title: "Kelas Guru — KelasBit",
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

export default async function GuruDashboardPage() {
  const user = await requireUser("guru");
  const [rows, kelasRows, totalSiswa, maintenance] = await Promise.all([
    listMateri(),
    listKelas(),
    countSiswa(),
    getMaintenanceSetting(),
  ]);

  const materi = rows.map((row) => ({
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

  const lastUpdatedLabel = latest ? dateFormatter.format(latest.updatedAt) : "—";

  const totalKelas = kelasRows.length;
  const latestKelasYear = kelasRows[0]?.academicYear ?? null;

  return (
    <>
      {maintenance.scheduleState === "pending" ||
      maintenance.scheduleState === "active" ? (
        <MaintenanceScheduleNotice setting={maintenance} className="mb-5" />
      ) : null}

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
                Kelas Guru
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
              Kelola bahan ajar Informatika dan KKA, pantau koleksi materi, dan
              siapkan kelas berikutnya dari satu tempat.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#tambah-materi"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-lg shadow-emerald-950/20 transition-colors hover:bg-emerald-50"
              >
                <Plus className="h-4 w-4" />
                Tambah Materi
              </a>
              <a
                href="#materi"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/25 transition-colors hover:bg-white/10"
              >
                Lihat Koleksi
              </a>
              <Link
                href="/guru/kelas"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/25 transition-colors hover:bg-white/10"
              >
                <GraduationCap className="h-4 w-4" />
                Kelola Kelas
              </Link>
              <Link
                href="/guru/siswa"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/25 transition-colors hover:bg-white/10"
              >
                <Users className="h-4 w-4" />
                Kelola Siswa
              </Link>
            </div>
          </div>

          <div className="hidden w-full max-w-xs rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur lg:block">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/60">
              Total Materi
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

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Materi"
          value={total}
          hint="Seluruh bahan ajar tersimpan"
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
          label="Total Kelas"
          value={totalKelas}
          hint={latestKelasYear ? `Tahun ajaran ${latestKelasYear}` : "Belum ada kelas"}
          icon={GraduationCap}
          tone="emerald"
        />
        <StatCard
          label="Total Siswa"
          value={totalSiswa}
          hint="Akun siswa terdaftar"
          icon={Users}
          tone="sky"
        />
        <StatCard
          label="Terakhir Diperbarui"
          value={lastUpdatedLabel}
          hint={latest?.title ?? "Belum ada materi"}
          icon={CalendarDays}
          tone="amber"
          small
        />
      </div>

      <MateriManager materi={materi} />
    </>
  );
}
