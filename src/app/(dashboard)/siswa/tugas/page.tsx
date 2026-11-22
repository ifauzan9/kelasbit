import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Sparkles,
} from "@/components/icons";
import { listTugasForSiswa } from "@/lib/tugas/queries";

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

export default async function SiswaTugasPage() {
  const rows = await listTugasForSiswa();

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-emerald-950 to-slate-900 px-6 py-7 text-white shadow-[0_30px_60px_-40px_rgba(2,44,34,0.65)] sm:px-9 sm:py-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-emerald-400/10 blur-2xl"
        />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80 ring-1 ring-white/15">
            <Sparkles className="h-3.5 w-3.5" />
            Tugas &amp; Ulangan
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Tugas Coding
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
            Kerjakan tugas langsung di editor Python. Output akan diperiksa
            otomatis, lalu bisa ditinjau oleh guru.
          </p>
        </div>
      </section>

      <section className="mt-6">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
            <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Belum ada tugas untuk kelasmu.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {rows.map((item) => {
              const repeat = item.repeatUntilPass && item.minScore !== null;
              const passed = item.passed === true;
              const selesai =
                passed || (!repeat && item.attemptsLeft <= 0);
              const status = passed
                ? "Lulus"
                : item.closed
                  ? "Ditutup"
                  : item.attemptsUsed === 0
                    ? "Belum dikerjakan"
                    : item.minScore !== null
                      ? "Belum lulus"
                      : item.bestScore !== null
                        ? `Dinilai: ${item.bestScore}/${item.maxScore}`
                        : "Terkumpul";

              return (
                <li
                  key={item.id}
                  className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_18px_40px_-24px_rgba(45,20,120,0.35)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                      <ClipboardList className="h-5 w-5" />
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ring-1 ${JENIS_CLASS[item.jenis]}`}
                      >
                        {JENIS_LABEL[item.jenis]}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ring-1 ${
                          selesai
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                            : item.closed
                              ? "bg-slate-100 text-slate-500 ring-slate-200"
                              : "bg-amber-50 text-amber-700 ring-amber-100"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/siswa/tugas/${item.id}`}
                    className="mt-3 text-[15px] font-extrabold leading-snug text-slate-900 hover:text-emerald-700"
                  >
                    {item.title}
                  </Link>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <GraduationCap className="h-3 w-3 text-slate-400" />
                      {item.targetType === "semua"
                        ? "Semua kelas"
                        : item.targetType === "kelas"
                          ? (item.kelasLabel ?? "Kelas")
                          : "Untukmu"}
                    </span>
                    {item.dueAt ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3 text-slate-400" />
                        {dueFormatter.format(new Date(item.dueAt))} WIB
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px]">
                    <span className="font-semibold text-slate-500">
                      {repeat ? (
                        <>
                          Percobaan{" "}
                          <span className="font-extrabold text-slate-700">
                            {item.attemptsUsed}
                          </span>
                          {item.minScore !== null ? ` · KKM ${item.minScore}` : ""}
                        </>
                      ) : (
                        <>
                          Sisa percobaan:{" "}
                          <span className="font-extrabold text-slate-700">
                            {item.attemptsLeft}
                          </span>
                        </>
                      )}
                    </span>
                    <Link
                      href={`/siswa/tugas/${item.id}`}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-emerald-700"
                    >
                      {passed
                        ? "Lihat"
                        : item.attemptsUsed > 0
                          ? "Kerjakan Ulang"
                          : "Kerjakan"}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
