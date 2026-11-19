import type { Metadata } from "next";
import { CalendarDays, ClipboardList, GraduationCap, Plus, Sparkles } from "@/components/icons";
import { StatCard } from "@/components/dashboard/stat-card";
import { KelasManager } from "@/components/guru/kelas-manager";
import { requireUser } from "@/lib/auth/session";
import { academicYearOptions, currentAcademicYear } from "@/lib/guru/constants";
import { listKelas } from "@/lib/guru/kelas-queries";

export const metadata: Metadata = {
  title: "Kelas — KelasBit",
};

export default async function KelasPage() {
  await requireUser("guru");

  const rows = await listKelas();

  const kelas = rows;

  const total = rows.length;
  const latestYear = rows[0]?.academicYear ?? "—";
  const totalYears = new Set(rows.map((row) => row.academicYear)).size;
  const totalSiswa = rows.reduce((sum, row) => sum + row.studentCount, 0);

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-emerald-500 via-emerald-700 to-teal-950 px-6 py-7 text-white shadow-[0_30px_60px_-40px_rgba(5,150,105,0.55)] sm:px-9 sm:py-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 right-24 h-64 w-64 rounded-full bg-teal-300/20 blur-3xl"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80 ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" />
              Manajemen Kelas
            </span>

            <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Kelola Kelas
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">
              Tambahkan kelas cukup dengan nama dan tahun ajaran. Contoh:{" "}
              <span className="font-semibold text-white">9A</span> untuk tahun ajaran{" "}
              <span className="font-semibold text-white">2026/2027</span>.
            </p>
          </div>

          <a
            href="#tambah-kelas"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-lg shadow-emerald-950/20 transition-colors hover:bg-emerald-50"
          >
            <Plus className="h-4 w-4" />
            Tambah Kelas
          </a>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Kelas"
          value={total}
          hint={`${totalSiswa} siswa terdaftar`}
          icon={GraduationCap}
          tone="emerald"
        />
        <StatCard
          label="Tahun Ajaran Terbaru"
          value={latestYear}
          hint={latestYear === "—" ? "Belum ada kelas" : `Ada ${rows.filter((row) => row.academicYear === latestYear).length} kelas`}
          icon={CalendarDays}
          tone="sky"
          small
        />
        <StatCard
          label="Tahun Ajaran Terdata"
          value={totalYears}
          hint="Rentang arsip kelas"
          icon={ClipboardList}
          tone="violet"
        />
      </div>

      <KelasManager
        kelas={kelas}
        academicYears={academicYearOptions()}
        defaultAcademicYear={currentAcademicYear()}
      />
    </>
  );
}
