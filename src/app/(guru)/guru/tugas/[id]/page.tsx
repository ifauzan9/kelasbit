import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Users,
} from "@/components/icons";
import { GradeForm } from "@/components/tugas/grade-form";
import { requireUser } from "@/lib/auth/session";
import {
  getTugasForGuru,
  listSubmissionsForTugas,
  listTugasTargets,
} from "@/lib/tugas/queries";

export const metadata: Metadata = {
  title: "Detail Tugas — KelasBit",
};

const dueFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "medium",
  timeStyle: "short",
});

const submittedFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "medium",
  timeStyle: "short",
});

const JENIS_LABEL = {
  tugas: "Tugas",
  ulangan: "Ulangan",
  remedial: "Remedial",
} as const;

const STATUS_LABEL = {
  success: "Berhasil",
  error: "Error",
  timeout: "Timeout",
  stopped: "Dihentikan",
} as const;

const STATUS_CLASS = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  error: "bg-rose-50 text-rose-700 ring-rose-100",
  timeout: "bg-amber-50 text-amber-700 ring-amber-100",
  stopped: "bg-slate-100 text-slate-600 ring-slate-200",
} as const;

export default async function GuruTugasDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser("guru");

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const tugas = await getTugasForGuru(id);
  if (!tugas) notFound();

  const submissions = await listSubmissionsForTugas(id);
  const targets =
    tugas.targetType === "siswa" ? await listTugasTargets(id) : [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/guru/tugas"
          className="text-xs font-bold text-emerald-700 hover:underline"
        >
          ← Kembali ke daftar tugas
        </Link>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
          {submissions.length} pengumpulan
        </span>
      </div>

      <section className="mt-3 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                {JENIS_LABEL[tugas.jenis]}
              </span>
              {tugas.dueAt ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <CalendarDays className="h-3 w-3 text-slate-400" />
                  Batas: {dueFormatter.format(new Date(tugas.dueAt))} WIB
                </span>
              ) : (
                <span className="text-[11px] font-medium text-slate-400">
                  Tanpa batas waktu
                </span>
              )}
            </div>
            <h1 className="mt-1.5 text-xl font-extrabold tracking-tight text-slate-900">
              {tugas.title}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                {tugas.targetType === "semua"
                  ? "Semua kelas"
                  : tugas.targetType === "kelas"
                    ? (tugas.kelasLabel ?? "Kelas")
                    : `${targets.length} siswa`}
              </span>
              <span>·</span>
              <span>Nilai maks {tugas.maxScore}</span>
              <span>·</span>
              <span>{tugas.maxAttempts} percobaan</span>
              <span>·</span>
              <span>
                {tugas.expectedOutput.trim() ? "Auto-grade" : "Nilai manual"}
              </span>
            </div>
          </div>
        </div>

        {tugas.description.trim() ? (
          <p className="mt-4 whitespace-pre-line rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm leading-relaxed text-slate-700">
            {tugas.description}
          </p>
        ) : null}

        {tugas.expectedOutput.trim() ? (
          <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <summary className="cursor-pointer text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
              Output yang diharapkan
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-slate-800">
              {tugas.expectedOutput}
            </pre>
          </details>
        ) : null}

        {tugas.targetType === "siswa" ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
              Target siswa ({targets.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {targets.map((target) => (
                <span
                  key={target.id}
                  className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200"
                >
                  {target.name}
                  {target.kelasLabel ? ` · ${target.kelasLabel}` : " · tanpa kelas"}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
          Pengumpulan Siswa
        </h2>

        {submissions.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            Belum ada siswa yang mengumpulkan.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {submissions.map((submission) => (
              <li
                key={submission.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,12,40,0.04)] sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                      <Users className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">
                        {submission.userName}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                        Percobaan ke-{submission.attemptNo} ·{" "}
                        {submittedFormatter.format(
                          new Date(submission.submittedAt),
                        )}{" "}
                        WIB
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ring-1 ${STATUS_CLASS[submission.status]}`}
                    >
                      {STATUS_LABEL[submission.status]}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-700">
                      {submission.score === null
                        ? "Belum dinilai"
                        : `Nilai ${submission.score} / ${tugas.maxScore}`}
                    </span>
                  </div>
                </div>

                <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5">
                  <summary className="cursor-pointer text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                    Lihat kode &amp; output
                  </summary>

                  {submission.stdin ? (
                    <div className="mt-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Input
                      </p>
                      <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2.5 font-mono text-xs text-slate-700 ring-1 ring-slate-200">
                        {submission.stdin}
                      </pre>
                    </div>
                  ) : null}

                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Kode
                    </p>
                    <pre className="mt-1 max-h-64 overflow-auto whitespace-pre rounded-lg bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">
                      {submission.code}
                    </pre>
                  </div>

                  {submission.stdout ? (
                    <div className="mt-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Output
                      </p>
                      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2.5 font-mono text-xs text-slate-700 ring-1 ring-slate-200">
                        {submission.stdout}
                      </pre>
                    </div>
                  ) : null}

                  {submission.stderr ? (
                    <div className="mt-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-rose-400">
                        Error
                      </p>
                      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-rose-50 p-2.5 font-mono text-xs text-rose-700 ring-1 ring-rose-100">
                        {submission.stderr}
                      </pre>
                    </div>
                  ) : null}
                </details>

                {submission.feedback ? (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Feedback:{" "}
                    <span className="font-medium text-slate-700">
                      {submission.feedback}
                    </span>
                  </p>
                ) : null}

                <GradeForm
                  submissionId={submission.id}
                  maxScore={tugas.maxScore}
                  initialScore={submission.score}
                  initialFeedback={submission.feedback}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
