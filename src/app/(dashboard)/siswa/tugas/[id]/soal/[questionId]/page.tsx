import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, ClipboardList } from "@/components/icons";
import { TugasGpsGate } from "@/components/tugas/tugas-gps-gate";
import { TugasRequirements } from "@/components/tugas/tugas-requirements";
import { TugasWorkspace } from "@/components/tugas/tugas-workspace";
import { isGpsAccuracyAccepted, GPS_VALIDITY_MS } from "@/lib/tugas/location";
import { getTugasForSiswa } from "@/lib/tugas/queries";
import { RETRY_COOLDOWN_MINUTES } from "@/lib/tugas/rules";

export const metadata: Metadata = {
  title: "Kerjakan Soal — KelasBit",
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

const MULTI_RETRY_COOLDOWN_EVERY = 10;

export default async function SiswaTugasSoalPage({
  params,
}: {
  params: Promise<{ id: string; questionId: string }>;
}) {
  const { id: rawId, questionId: rawQuestionId } = await params;
  const id = Number(rawId);
  const questionId = Number(rawQuestionId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  if (!Number.isInteger(questionId) || questionId <= 0) notFound();

  const data = await getTugasForSiswa(id);
  if (!data) notFound();

  const question = data.questions.find((item) => item.id === questionId);
  if (!question) notFound();

  const { tugas, submissions, latestLocation, gpsBypassActive, userId } = data;
  const closed =
    tugas.dueAt !== null && new Date(tugas.dueAt).getTime() <= Date.now();
  const canWork = !closed && !question.passed;
  const gpsValid =
    latestLocation?.status === "tersedia" &&
    isGpsAccuracyAccepted(latestLocation.accuracy) &&
    new Date(latestLocation.capturedAt).getTime() >=
      Date.now() - GPS_VALIDITY_MS;

  if (tugas.requireGps && canWork && !gpsValid && !gpsBypassActive) {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/siswa/tugas/${tugas.id}`}
            className="text-xs font-bold text-emerald-700 hover:underline"
          >
            ← Kembali ke daftar soal
          </Link>
        </div>
        <TugasGpsGate tugasId={tugas.id} tugasTitle={tugas.title} />
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          Soal dan editor akan ditampilkan setelah lokasi GPS berhasil dicatat.
        </p>
      </>
    );
  }

  const questionSubmissions = submissions.filter(
    (submission) => submission.questionId === question.id,
  );
  const lastSubmission =
    question.attemptsUsed > 0 ? questionSubmissions[0] : undefined;
  let cooldownUntil: string | null = null;
  if (
    !question.passed &&
    lastSubmission &&
    question.attemptsUsed > 0 &&
    question.attemptsUsed % MULTI_RETRY_COOLDOWN_EVERY === 0
  ) {
    const until =
      new Date(lastSubmission.submittedAt).getTime() +
      RETRY_COOLDOWN_MINUTES * 60_000;
    if (Date.now() < until) cooldownUntil = new Date(until).toISOString();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/siswa/tugas/${tugas.id}`}
          className="text-xs font-bold text-emerald-700 hover:underline"
        >
          ← Kembali ke daftar soal
        </Link>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
          Soal {question.orderNo} dari {data.questions.length}
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
                Soal {question.orderNo}
              </span>
              {question.passed ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                  <CheckCircle2 className="h-3 w-3" />
                  Selesai 5/5
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-700 ring-1 ring-amber-100">
                  {question.attemptsUsed} percobaan
                </span>
              )}
              {tugas.dueAt ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <CalendarDays className="h-3 w-3 text-slate-400" />
                  Batas: {dueFormatter.format(new Date(tugas.dueAt))} WIB
                </span>
              ) : null}
            </div>
            <h1 className="mt-1.5 text-xl font-extrabold tracking-tight text-slate-900">
              {question.title}
            </h1>
            <p className="mt-1 text-[11px] font-medium text-slate-500">
              {tugas.title} · Nilai soal {question.bestScore ?? 0}/
              {question.maxScore}
            </p>
          </div>
        </div>

        {question.description.trim() ? (
          <p className="mt-4 whitespace-pre-line rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm leading-relaxed text-slate-700">
            {question.description}
          </p>
        ) : null}
      </section>

      <TugasRequirements
        rules={question.structureRules}
        minScore={question.maxScore}
        repeatUntilPass
        retryCooldownEvery={MULTI_RETRY_COOLDOWN_EVERY}
      />

      {question.passed ? (
        <p
          role="status"
          className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
        >
          Soal ini sudah selesai dengan nilai {question.bestScore}/
          {question.maxScore}. Pilih soal lain dari daftar.
        </p>
      ) : canWork ? (
        <div className="mt-6">
          <TugasWorkspace
            tugasId={tugas.id}
            questionId={question.id}
            questionNumber={question.orderNo}
            backHref={`/siswa/tugas/${tugas.id}`}
            taskMaxScore={tugas.maxScore}
            totalQuestions={data.questions.length}
            starterCode={question.starterCode}
            maxScore={question.maxScore}
            minScore={question.maxScore}
            repeatUntilPass
            attemptsLeft={0}
            attemptsUsed={question.attemptsUsed}
            initialCooldownUntil={cooldownUntil}
            closed={closed}
            expectedOutput={question.expectedOutput}
            blockCopyPaste={tugas.blockCopyPaste}
            draftOwnerId={userId}
          />
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Batas waktu pengumpulan sudah lewat.
        </p>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
          Riwayat Soal Ini
        </h2>

        {questionSubmissions.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
            Belum ada pengumpulan untuk soal ini.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {questionSubmissions.map((submission) => (
              <li
                key={submission.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,12,40,0.04)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-800">
                      Percobaan ke-{submission.attemptNo}
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
                      : `Nilai ${submission.score} / ${question.maxScore}`}
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
