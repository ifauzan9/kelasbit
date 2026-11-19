import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  History,
  MapPin,
  Search,
  ShieldCheck,
  Users,
} from "@/components/icons";
import { StatCard } from "@/components/dashboard/stat-card";
import { LoginLogTable } from "@/components/guru/login-log-table";
import { requireUser } from "@/lib/auth/session";
import {
  getLoginLogStats,
  listLoginLogKelasOptions,
  listLoginLogs,
  type LoginLogStatusFilter,
} from "@/lib/guru/login-log-queries";
import { getLoginLocationSetting } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Log Login — KelasBit",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parseStatus(value: string): LoginLogStatusFilter {
  return value === "berhasil" || value === "gagal" || value === "diblokir"
    ? value
    : "semua";
}

function parsePeriode(value: string): { days: number | null; value: string } {
  if (value === "semua") return { days: null, value: "semua" };
  if (value === "30") return { days: 30, value: "30" };
  if (value === "90") return { days: 90, value: "90" };
  return { days: 7, value: "7" };
}

export default async function LogLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireUser("guru");

  const params = await searchParams;
  const status = parseStatus(first(params.status));
  const search = first(params.q).trim();
  const requestedKelas = first(params.kelas) || "semua";
  const periode = parsePeriode(first(params.periode));
  const requestedPage = Number.parseInt(first(params.page), 10) || 1;

  const [kelasOptions, stats, locationSetting] = await Promise.all([
    listLoginLogKelasOptions(),
    getLoginLogStats(),
    getLoginLocationSetting(),
  ]);

  const kelasValues = kelasOptions.map(
    (item) => `${item.kelasName}|${item.academicYear ?? ""}`,
  );
  const kelas =
    requestedKelas === "semua" ||
    requestedKelas === "tanpa" ||
    kelasValues.includes(requestedKelas)
      ? requestedKelas
      : "semua";

  const result = await listLoginLogs({
    status,
    search,
    kelas,
    days: periode.days,
    page: requestedPage,
  });

  function hrefForPage(target: number): string {
    const query = new URLSearchParams();

    if (search) query.set("q", search);
    if (status !== "semua") query.set("status", status);
    if (kelas !== "semua") query.set("kelas", kelas);
    if (periode.value !== "7") query.set("periode", periode.value);
    if (target > 1) query.set("page", String(target));

    const queryString = query.toString();
    return `/guru/log-login${queryString ? `?${queryString}` : ""}`;
  }

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

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80 ring-1 ring-white/15">
            <History className="h-3.5 w-3.5" />
            Keamanan Akun
          </span>

          <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Log Login Siswa
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">
            Pantau aktivitas masuk akun siswa, termasuk percobaan yang gagal dan
            diblokir oleh rate limit.
          </p>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Berhasil Hari Ini"
          value={stats.todaySuccess}
          hint="Login siswa yang berhasil"
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Gagal Hari Ini"
          value={stats.todayFailed}
          hint="Password salah atau akun tidak valid"
          icon={AlertCircle}
          tone="amber"
        />
        <StatCard
          label="Diblokir Hari Ini"
          value={stats.todayBlocked}
          hint="Melewati batas percobaan"
          icon={ShieldCheck}
          tone="rose"
        />
        <StatCard
          label="Siswa Unik 7 Hari"
          value={stats.uniqueStudents7d}
          hint="Pernah berhasil login"
          icon={Users}
          tone="sky"
        />
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,12,40,0.04)] sm:p-5">
        <form
          method="get"
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_180px_150px_auto_auto] md:items-end"
        >
          <div className="space-y-1.5">
            <label htmlFor="q" className="block text-xs font-bold text-slate-600">
              Cari Siswa
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={search}
                placeholder="Nama atau username…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="status" className="block text-xs font-bold text-slate-600">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="semua">Semua status</option>
              <option value="berhasil">Berhasil</option>
              <option value="gagal">Gagal</option>
              <option value="diblokir">Diblokir</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="kelas" className="block text-xs font-bold text-slate-600">
              Kelas
            </label>
            <select
              id="kelas"
              name="kelas"
              defaultValue={kelas}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="semua">Semua kelas</option>
              <option value="tanpa">Tanpa kelas</option>
              {kelasOptions.map((item) => (
                <option
                  key={`${item.kelasName}|${item.academicYear ?? ""}`}
                  value={`${item.kelasName}|${item.academicYear ?? ""}`}
                >
                  {item.kelasName}
                  {item.academicYear ? ` · ${item.academicYear}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="periode" className="block text-xs font-bold text-slate-600">
              Periode
            </label>
            <select
              id="periode"
              name="periode"
              defaultValue={periode.value}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="7">7 hari</option>
              <option value="30">30 hari</option>
              <option value="90">90 hari</option>
              <option value="semua">Semua</option>
            </select>
          </div>

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-colors hover:bg-emerald-700"
          >
            Terapkan
          </button>

          <Link
            href="/guru/log-login"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Reset
          </Link>
        </form>
      </section>

      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,12,40,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              Riwayat Login
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {result.total} log ditemukan · 25 per halaman
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                locationSetting.enabled
                  ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100"
                  : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200"
              }
            >
              <MapPin className="h-3 w-3" />
              Lacak lokasi: {locationSetting.enabled ? "Aktif" : "Nonaktif"}
            </span>
            <Link
              href="/guru/pengaturan"
              className="text-[11px] font-bold text-emerald-700 underline-offset-2 hover:underline"
            >
              Ubah
            </Link>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {result.total}
            </span>
          </div>
        </div>

        <LoginLogTable
          rows={result.rows}
          total={result.total}
          page={result.page}
          pageCount={result.pageCount}
          pageSize={result.pageSize}
          hrefForPage={hrefForPage}
        />
      </section>
    </>
  );
}
