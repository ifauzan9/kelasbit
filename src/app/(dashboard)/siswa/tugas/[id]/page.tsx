import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  GraduationCap,
} from "@/components/icons";
import { TugasRequirements } from "@/components/tugas/tugas-requirements";
import { TugasGpsGate } from "@/components/tugas/tugas-gps-gate";
import { TugasWorkspace } from "@/components/tugas/tugas-workspace";
import { getTugasForSiswa } from "@/lib/tugas/queries";
import {
  RETRY_COOLDOWN_EVERY,
  RETRY_COOLDOWN_MINUTES,
} from "@/lib/tugas/rules";

export const metadata: Metadata = {
  title: "Kerjakan Tugas — KelasBit",
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

export default async function SiswaTugasDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const data = await getTugasForSiswa(id);
  if (!data) notFound();

  const { tugas, submissions, latestLocation } = data;
  const attemptsLeft = Math.max(0, tugas.maxAttempts - submissions.length);
  const closed =
    tugas.dueAt !== null && new Date(tugas.dueAt).getTime() <= Date.now();
  const bestScore = submissions.reduce<number | null>((best, item) => {
    if (item.score === null) return best;
    return best === null ? item.score : Math.max(best, item.score);
  }, null);
  const passed =
    tugas.minScore !== null
      ? submissions.length > 0
        ? submissions.some((item) => item.passed === true)
        : null
      : null;
  const repeat = tugas.repeatUntilPass && tugas.minScore !== null;
  const canWork =
    !closed && passed !== true && (repeat || attemptsLeft > 0);
  const GPS_VALIDITY_MS = 60 * 60 * 1000;
  const gpsValid =
    latestLocation?.status === "tersedia" &&
    new Date(latestLocation.capturedAt).getTime() >=
      Date.now() - GPS_VALIDITY_MS;

  if (tugas.requireGps && canWork && !gpsValid) {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/siswa/tugas"
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            ← Kembali ke daftar tugas
          </Link>
        </div>
        <TugasGpsGate tugasId={tugas.id} tugasTitle={tugas.title} />
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          Soal dan editor akan ditampilkan setelah lokasi GPS berhasil dicatat.
        </p>
      </>
    );
  }

  let cooldownUntil: string | null = null;
  if (
    repeat &&
    passed !== true &&
    submissions.length > 0 &&
    submissions.length % RETRY_COOLDOWN_EVERY === 0
  ) {
    const last = new Date(submissions[0].submittedAt).getTime();
    const until = last + RETRY_COOLDOWN_MINUTES * 60_000;
    if (Date.now() < until) cooldownUntil = new Date(until).toISOString();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/siswa/tugas"
          className="text-xs font-bold text-emerald-700 hover:underline"
        >
          ← Kembali ke daftar tugas
        </Link>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
          {repeat
            ? `${submissions.length} percobaan`
            : `Percobaan ${submissions.length} / ${tugas.maxAttempts}`}
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
              {tugas.blockCopyPaste ? (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-rose-700 ring-1 ring-rose-100">
                  Copy/paste dikunci
                </span>
              ) : null}
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
                    : "Untukmu"}
              </span>
              <span>·</span>
              <span>Nilai maks {tugas.maxScore}</span>
              {tugas.minScore !== null ? (
                <>
                  <span>·</span>
                  <span>KKM {tugas.minScore}</span>
                </>
              ) : null}
              <span>·</span>
              <span>
                {repeat
                  ? `Percobaan ${submissions.length} (ulangi sampai lulus)`
                  : `Sisa percobaan ${attemptsLeft}`}
              </span>
            </div>
          </div>
        </div>

        {tugas.description.trim() ? (
          <p className="mt-4 whitespace-pre-line rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm leading-relaxed text-slate-700">
            {tugas.description}
          </p>
        ) : null}
      </section>

      <TugasRequirements
        rules={tugas.structureRules}
        minScore={tugas.minScore}
        repeatUntilPass={repeat}
      />

      {passed === true ? (
        <p
          role="status"
          className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
        >
          Lulus! Nilai terbaikmu {bestScore} / {tugas.maxScore}
          {tugas.minScore !== null ? ` (KKM ${tugas.minScore})` : ""}.
        </p>
      ) : null}

      {canWork ? (
        <div className="mt-6">
          <TugasWorkspace
            tugasId={tugas.id}
            starterCode={tugas.starterCode}
            maxScore={tugas.maxScore}
            minScore={tugas.minScore}
            repeatUntilPass={repeat}
            attemptsLeft={attemptsLeft}
            attemptsUsed={submissions.length}
            initialCooldownUntil={cooldownUntil}
            closed={closed}
            expectedOutput={tugas.expectedOutput}
            blockCopyPaste={tugas.blockCopyPaste}
          />
        </div>
      ) : passed === true ? null : (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {closed
            ? "Batas waktu pengumpulan sudah lewat."
            : "Percobaan sudah habis. Hubungi guru jika perlu remedial."}
        </p>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
          Riwayat Pengumpulan
        </h2>

        {submissions.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
            Belum ada pengumpulan.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {submissions.map((submission) => (
              <li
                key={submission.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,12,40,0.04)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-800">
                      Percobaan ke-{submission.attemptNo}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ring-1 ${STATUS_CLASS[submission.status]}`}
                    >
                      {STATUS_LABEL[submission.status]}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {submittedFormatter.format(
                        new Date(submission.submittedAt),
                      )}{" "}
                      WIB
                    </span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-700">
                    {submission.score === null
                      ? "Menunggu penilaian"
                      : `Nilai ${submission.score} / ${tugas.maxScore}`}
                  </span>
                </div>

                {submission.feedback ? (
                  <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800 ring-1 ring-emerald-100">
                    Feedback guru: {submission.feedback}
                  </p>
                ) : null}

                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-bold text-slate-500">
                    Lihat kode &amp; output
                  </summary>
                  <pre className="mt-2 max-h-56 overflow-auto whitespace-pre rounded-lg bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">
                    {submission.code}
                  </pre>
                  {submission.stdout ? (
                    <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 font-mono text-xs text-slate-700 ring-1 ring-slate-200">
                      {submission.stdout}
                    </pre>
                  ) : null}
                  {submission.stderr ? (
                    <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-rose-50 p-2.5 font-mono text-xs text-rose-700 ring-1 ring-rose-100">
                      {submission.stderr}
                    </pre>
                  ) : null}
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
