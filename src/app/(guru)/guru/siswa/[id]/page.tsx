import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  GraduationCap,
  MapPin,
  UserRound,
} from "@/components/icons";
import { requireUser } from "@/lib/auth/session";
import { getSiswa } from "@/lib/guru/siswa-queries";
import {
  formatAccuracy,
  formatLoginTime,
  mapUrlFor,
  locationStatusLabel,
} from "@/lib/guru/login-log-utils";
import { listTugasLocationsForUser } from "@/lib/tugas/queries";

export const metadata: Metadata = {
  title: "Detail Siswa — KelasBit",
};

const LOCATION_STYLE: Record<string, string> = {
  tersedia: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  ditolak: "bg-rose-50 text-rose-700 ring-rose-100",
  timeout: "bg-amber-50 text-amber-700 ring-amber-100",
  tidak_didukung: "bg-slate-100 text-slate-600 ring-slate-200",
  error: "bg-rose-50 text-rose-700 ring-rose-100",
  tidak_dicatat: "bg-slate-100 text-slate-600 ring-slate-200",
  dimatikan: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default async function DetailSiswaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser("guru");

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const siswa = await getSiswa(id);
  if (!siswa) notFound();

  const locations = await listTugasLocationsForUser(id, 100);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/guru/siswa"
          className="text-xs font-bold text-emerald-700 hover:underline"
        >
          ← Kembali ke daftar siswa
        </Link>
        <span
          className={
            siswa.isActive
              ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100"
              : "rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200"
          }
        >
          {siswa.isActive ? "Akun aktif" : "Akun nonaktif"}
        </span>
      </div>

      <section className="mt-3 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <UserRound className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              {siswa.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
              <span>@{siswa.username ?? "tanpa-username"}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="h-3 w-3 text-slate-400" />
                {siswa.kelasName
                  ? `${siswa.kelasName}${
                      siswa.academicYear ? ` · ${siswa.academicYear}` : ""
                    }`
                  : "Tanpa kelas"}
              </span>
              {siswa.email ? (
                <>
                  <span>·</span>
                  <span>{siswa.email}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                Riwayat Lokasi Tugas
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Titik lokasi yang tercatat saat siswa membuka atau mengerjakan
                tugas dengan GPS wajib.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
            {locations.length} catatan terakhir
          </span>
        </div>

        {locations.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center">
            <MapPin className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Belum ada riwayat lokasi tugas.
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Lokasi akan muncul setelah siswa mengerjakan tugas dengan GPS
              wajib.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
                  <th className="px-2 py-2 font-extrabold">Waktu</th>
                  <th className="px-2 py-2 font-extrabold">Tugas</th>
                  <th className="px-2 py-2 font-extrabold">Status GPS</th>
                  <th className="px-2 py-2 font-extrabold">Akurasi</th>
                  <th className="px-2 py-2 text-right font-extrabold">Peta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {locations.map((location) => {
                  const mapUrl = mapUrlFor(
                    location.latitude,
                    location.longitude,
                  );
                  const accuracy = formatAccuracy(location.accuracy);

                  return (
                    <tr key={location.id} className="hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-2 py-2.5 text-[10px] font-medium text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 text-slate-300" />
                          {formatLoginTime(new Date(location.capturedAt))}
                        </span>
                      </td>
                      <td className="max-w-[240px] px-2 py-2.5">
                        <p className="truncate font-bold text-slate-700">
                          {location.tugasTitle}
                        </p>
                      </td>
                      <td className="px-2 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ring-1 ${
                            LOCATION_STYLE[location.status] ??
                            LOCATION_STYLE.tidak_dicatat
                          }`}
                        >
                          {locationStatusLabel(location.status)}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-[10px] font-medium text-slate-500">
                        {accuracy ?? "—"}
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        {mapUrl ? (
                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
                          >
                            <MapPin className="h-3 w-3" />
                            Lihat peta
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {locations.length >= 100 ? (
          <p className="mt-3 text-[10px] font-medium text-slate-400">
            Menampilkan 100 catatan terbaru. Riwayat lebih lama tetap tersimpan
            di database.
          </p>
        ) : null}
      </section>
    </>
  );
}
