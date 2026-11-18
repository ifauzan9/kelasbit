import type { Metadata } from "next";
import { CalendarDays, GraduationCap, ShieldCheck, Users } from "@/components/icons";
import { StatCard } from "@/components/dashboard/stat-card";
import { SiswaImport } from "@/components/guru/siswa-import";
import { SiswaManager } from "@/components/guru/siswa-manager";
import { requireUser } from "@/lib/auth/session";
import { listKelasWithCount, listSiswa } from "@/lib/guru/siswa-queries";

export const metadata: Metadata = {
  title: "Siswa — KelasBit",
};

export default async function SiswaPage() {
  await requireUser("guru");

  const [rows, kelasRows] = await Promise.all([listSiswa(), listKelasWithCount()]);

  const siswa = rows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    isActive: row.isActive,
    kelasId: row.kelasId,
    kelasName: row.kelasName,
    academicYear: row.academicYear,
  }));

  const kelasOptions = kelasRows.map((row) => ({
    id: row.id,
    name: row.name,
    academicYear: row.academicYear,
  }));

  const total = siswa.length;
  const aktif = siswa.filter((row) => row.isActive).length;
  const nonaktif = total - aktif;
  const tanpaKelas = siswa.filter((row) => row.kelasId === null).length;

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
              <ShieldCheck className="h-3.5 w-3.5" />
              Kelola Siswa
            </span>

            <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Akun Siswa
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">
              Setiap siswa yang dibuat di sini langsung bisa login memakai{" "}
              <span className="font-semibold text-white">username</span> dan password
              yang diberikan.
            </p>
          </div>

          <a
            href="#tambah-siswa"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-lg shadow-emerald-950/20 transition-colors hover:bg-emerald-50"
          >
            <Users className="h-4 w-4" />
            Tambah Siswa
          </a>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Siswa"
          value={total}
          hint="Seluruh akun siswa"
          icon={Users}
          tone="emerald"
        />
        <StatCard
          label="Akun Aktif"
          value={aktif}
          hint="Bisa login sekarang"
          icon={ShieldCheck}
          tone="sky"
        />
        <StatCard
          label="Nonaktif"
          value={nonaktif}
          hint="Login diblokir sementara"
          icon={CalendarDays}
          tone="amber"
        />
        <StatCard
          label="Tanpa Kelas"
          value={tanpaKelas}
          hint="Belum punya kelas"
          icon={GraduationCap}
          tone="violet"
        />
      </div>

      <SiswaManager siswa={siswa} kelasOptions={kelasOptions} />

      <div className="mt-6">
        <SiswaImport />
      </div>
    </>
  );
}
