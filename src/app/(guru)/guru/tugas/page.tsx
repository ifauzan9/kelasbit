import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  GraduationCap,
  MapPin,
  Sparkles,
} from "@/components/icons";
import { DeleteTugasButton } from "@/components/tugas/delete-tugas-button";
import { TugasForm } from "@/components/tugas/tugas-form";
import { requireUser } from "@/lib/auth/session";
import { listKelas } from "@/lib/guru/kelas-queries";
import { listSiswa } from "@/lib/guru/siswa-queries";
import { listTugasForGuru } from "@/lib/tugas/queries";

export const metadata: Metadata = {
  title: "Tugas — KelasBit",
};

const dueFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "medium",
  timeStyle: "short",
});

const JENIS_LABEL = {
  tugas: "Tugas",
  ulangan: "Ulangan",
  remedial: "Remedial",
} as const;

const JENIS_CLASS = {
  tugas: "bg-sky-50 text-sky-700 ring-sky-100",
  ulangan: "bg-violet-50 text-violet-700 ring-violet-100",
  remedial: "bg-amber-50 text-amber-700 ring-amber-100",
} as const;

export default async function GuruTugasPage() {
  await requireUser("guru");

  const [rows, kelasRows, siswaRows] = await Promise.all([
    listTugasForGuru(),
    listKelas(),
    listSiswa(),
  ]);

  const kelasOptions = kelasRows.map((row) => ({
    id: row.id,
    label: `${row.name} · ${row.academicYear}`,
  }));

  const students = siswaRows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    kelasLabel: row.kelasName
      ? `${row.kelasName} · ${row.academicYear ?? ""}`.trim()
      : null,
  }));

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-emerald-500 via-emerald-700 to-teal-950 px-6 py-7 text-white shadow-[0_30px_60px_-40px_rgba(5,150,105,0.55)] sm:px-9 sm:py-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80 ring-1 ring-white/15">
            <Sparkles className="h-3.5 w-3.5" />
            Tugas &amp; Ulangan
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Kelola Tugas Coding
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">
            Buat tugas, ulangan, atau remedial coding. Siswa mengerjakan di
            editor Python, lalu output otomatis dinilai dan bisa Anda tinjau.
          </p>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] xl:items-start">
        <TugasForm kelasOptions={kelasOptions} students={students} />

        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                Daftar Tugas
              </h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {rows.length} tugas tersimpan.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {rows.length}
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
              Belum ada tugas. Buat tugas pertama di formulir sebelah.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {rows.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-slate-200/80 p-4 transition hover:border-emerald-200 hover:shadow-[0_16px_36px_-28px_rgba(16,12,40,0.35)]"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                      <ClipboardList className="h-5 w-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/guru/tugas/${item.id}`}
                        className="truncate text-sm font-extrabold text-slate-900 hover:text-emerald-700"
                      >
                        {item.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ring-1 ${JENIS_CLASS[item.jenis]}`}
                        >
                          {JENIS_LABEL[item.jenis]}
                        </span>
                        {item.manuallyClosed ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-700 ring-1 ring-amber-100">
                            Ditutup
                          </span>
                        ) : null}
                        {item.requireGps ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-sky-700 ring-1 ring-sky-100">
                            <MapPin className="h-2.5 w-2.5" />
                            GPS wajib
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                          <GraduationCap className="h-3 w-3 text-slate-400" />
                          {item.targetType === "semua"
                            ? "Semua kelas"
                            : item.targetType === "kelas"
                              ? (item.kelasLabel ?? "Kelas")
                              : `${item.targetCount} siswa`}
                        </span>
                        {item.dueAt ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <CalendarDays className="h-3 w-3" />
                            {dueFormatter.format(new Date(item.dueAt))} WIB
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-[11px] font-medium text-slate-400">
                        {item.submissionCount} pengumpulan · nilai maks{" "}
                        {item.maxScore} · {item.maxAttempts} percobaan
                        {item.minScore !== null
                          ? ` · KKM ${item.minScore}${
                              item.repeatUntilPass ? " (ulangi)" : ""
                            }`
                          : ""}
                        {item.expectedOutput.trim()
                          ? " · auto-grade"
                          : " · nilai manual"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Link
                        href={`/guru/tugas/${item.id}`}
                        className="rounded-lg px-2.5 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
                      >
                        Buka
                      </Link>
                      <DeleteTugasButton id={item.id} title={item.title} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
