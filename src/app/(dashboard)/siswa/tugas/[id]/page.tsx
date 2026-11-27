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
import { TugasLinkForm } from "@/components/tugas/tugas-link-form";
import { TugasWorkspace } from "@/components/tugas/tugas-workspace";
import { getTugasForSiswa } from "@/lib/tugas/queries";
import { isGpsAccuracyAccepted, GPS_VALIDITY_MS } from "@/lib/tugas/location";
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

  const {
    tugas,
    questions,
    submissions,
    latestLocation,
    gpsBypassActive,
    userId,
    link,
  } = data;
  const isMultiQuestion = questions.length > 0;
  const totalBestScore = isMultiQuestion
    ? Math.min(
        tugas.maxScore,
        questions.reduce(
          (total, question) => total + (question.bestScore ?? 0),
          0,
        ),
      )
    : null;
  const questionsPassed =
    isMultiQuestion &&
    questions.length > 0 &&
    questions.every((question) => question.passed);
  const linkDone =
    !tugas.linkRequired || link?.reviewStatus === "disetujui";
  const linkStatusLabel = !tugas.linkRequired
    ? ""
    : !link
      ? "video belum"
      : link.reviewStatus === "disetujui"
        ? "video disetujui"
        : link.reviewStatus === "perbaikan"
          ? "video perlu diperbaiki"
          : "video menunggu";
  const allRequirementsPassed = questionsPassed && linkDone;
  const attemptsLeft = Math.max(0, tugas.maxAttempts - submissions.length);
  const closed =
    tugas.dueAt !== null && new Date(tugas.dueAt).getTime() <= Date.now();
  const bestScore = isMultiQuestion
    ? totalBestScore
    : submissions.reduce<number | null>((best, item) => {
        if (item.score === null) return best;
        return best === null ? item.score : Math.max(best, item.score);
      }, null);
  const passed =
    tugas.minScore !== null
      ? isMultiQuestion
        ? submissions.length > 0
          ? allRequirementsPassed
          : null
        : submissions.length > 0
          ? submissions.some((item) => item.passed === true) && linkDone
          : null
      : null;
  const repeat =
    isMultiQuestion || (tugas.repeatUntilPass && tugas.minScore !== null);
  const canWork = isMultiQuestion
    ? !closed && !allRequirementsPassed
    : !closed && passed !== true && (repeat || attemptsLeft > 0);
  const gpsValid =
    latestLocation?.status === "tersedia" &&
    isGpsAccuracyAccepted(latestLocation.accuracy) &&
    new Date(latestLocation.capturedAt).getTime() >=
      Date.now() - GPS_VALIDITY_MS;

  if (
    tugas.requireGps &&
    canWork &&
    !gpsValid &&
    !gpsBypassActive
  ) {
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
          {isMultiQuestion
            ? `${questions.filter((question) => question.passed).length} / ${
                questions.length
              } soal selesai${
                tugas.linkRequired ? ` · ${linkStatusLabel}` : ""
              }`
            : repeat
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
              {gpsBypassActive ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-700 ring-1 ring-amber-100">
                  Akses via kode guru
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
                {isMultiQuestion
                  ? `${questions.length} soal · nilai total ${tugas.maxScore}`
                  : repeat
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

      {isMultiQuestion ? (
        <section className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                Daftar Soal
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Kerjakan satu per satu. Setiap soal harus benar 5/5. Nilai total
                100 jika seluruh soal selesai.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-100">
              Nilai {totalBestScore ?? 0} / {tugas.maxScore}
            </span>
          </div>

          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {questions.map((question) => (
              <li key={question.id}>
                <Link
                  href={`/siswa/tugas/${tugas.id}/soal/${question.id}`}
                  className={`flex h-full items-start gap-3 rounded-2xl border p-3.5 transition-colors ${
                    question.passed
                      ? "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50"
                      : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/30"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ring-1 ${
                      question.passed
                        ? "bg-emerald-600 text-white ring-emerald-600"
                        : "bg-slate-100 text-slate-600 ring-slate-200"
                    }`}
                  >
                    {question.orderNo}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold leading-snug text-slate-900">
                      {question.title}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                      <span>
                        {question.passed
                          ? "Selesai"
                          : question.attemptsUsed > 0
                            ? "Belum benar"
                            : "Belum dikerjakan"}
                      </span>
                      <span>·</span>
                      <span>{question.attemptsUsed} percobaan</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      className={`block text-sm font-extrabold ${
                        question.passed ? "text-emerald-700" : "text-slate-700"
                      }`}
                    >
                      {question.bestScore ?? 0}/{question.maxScore}
                    </span>
                    <span className="mt-1 block text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">
                      {question.passed ? "Lihat" : "Kerjakan"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {tugas.linkRequired ? (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-extrabold tracking-tight text-slate-900">
                21. Bukti Pengumpulan Video
              </h3>
              <TugasLinkForm
                tugasId={tugas.id}
                initialUrl={link?.url ?? null}
                reviewStatus={link?.reviewStatus ?? null}
                reviewNote={link?.reviewNote ?? null}
                disabled={closed}
                taskMaxScore={tugas.maxScore}
                totalQuestions={questions.length}
              />
            </div>
          ) : null}

          {allRequirementsPassed ? (
            <p
              role="status"
              className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
            >
              Semua soal dan video selesai. Nilai akhir kamu {totalBestScore} /{" "}
              {tugas.maxScore}. Tugas dinyatakan selesai.
            </p>
          ) : questionsPassed && link?.reviewStatus === "menunggu" ? (
            <p
              role="status"
              className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
            >
              Semua soal sudah selesai. Video kamu sedang menunggu pemeriksaan
              guru.
            </p>
          ) : questionsPassed && link?.reviewStatus === "perbaikan" ? (
            <p
              role="status"
              className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800"
            >
              Semua soal sudah selesai. Video perlu diperbaiki sesuai catatan
              guru sebelum tugas dinyatakan selesai.
            </p>
          ) : closed ? (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              Batas waktu sudah lewat. Soal yang belum selesai tidak dapat
              dikerjakan lagi.
            </p>
          ) : null}
        </section>
      ) : (
        <>
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
            draftOwnerId={userId}
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
      )}
    </>
  );
}
