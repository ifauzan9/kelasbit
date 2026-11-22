"use client";

import { AlertCircle, CheckCircle2 } from "@/components/icons";
import { GradeForm } from "@/components/tugas/grade-form";
import { OutputDiffPanel } from "@/components/tugas/output-diff-panel";
import type { TugasSubmissionView } from "@/lib/tugas/types";

export function SubmissionDetailContent({
  submission,
  maxScore,
  expectedOutput,
  showGradeForm = true,
}: {
  submission: TugasSubmissionView;
  maxScore: number;
  expectedOutput: string;
  showGradeForm?: boolean;
}) {
  return (
    <div>
      {submission.checks && submission.checks.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
              Pemeriksaan struktur wajib
            </p>
            <p className="text-[10px] font-semibold text-slate-500">
              Output {submission.outputScore ?? 0} · Struktur{" "}
              {submission.structureScore ?? 0}
            </p>
          </div>

          {submission.checks.some(
            (check) => check.mandatory && !check.passed,
          ) ? (
            <p className="mt-1.5 text-[10px] font-semibold text-rose-600">
              Ada aturan wajib yang belum terpenuhi.
            </p>
          ) : null}

          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {submission.checks.map((check) => (
              <li
                key={check.id}
                className={`flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-[11px] ${
                  check.passed
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-rose-50 text-rose-800"
                }`}
              >
                {check.passed ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                <span className="min-w-0">
                  <span className="font-bold">{check.label}</span>
                  {check.mandatory ? (
                    <span className="ml-1 rounded bg-rose-100 px-1 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-rose-700">
                      Wajib
                    </span>
                  ) : null}
                  <span className="block text-[10px] font-medium opacity-70">
                    {check.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            Jawaban siswa
          </p>
          <span className="text-[10px] font-semibold text-slate-400">
            Percobaan ke-{submission.attemptNo}
          </span>
        </div>

        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre rounded-lg bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">
          {submission.code}
        </pre>

        {submission.stdin ? (
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Input yang dipakai
            </p>
            <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2.5 font-mono text-xs text-slate-700 ring-1 ring-slate-200">
              {submission.stdin}
            </pre>
          </div>
        ) : null}

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Output
            </p>
            <pre className="mt-1 max-h-40 min-h-16 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2.5 font-mono text-xs text-slate-700 ring-1 ring-slate-200">
              {submission.stdout || "(tidak ada output)"}
            </pre>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-rose-400">
              Error
            </p>
            <pre className="mt-1 max-h-40 min-h-16 overflow-auto whitespace-pre-wrap rounded-lg bg-rose-50 p-2.5 font-mono text-xs text-rose-700 ring-1 ring-rose-100">
              {submission.stderr || "(tidak ada error)"}
            </pre>
          </div>
        </div>
      </div>

      <OutputDiffPanel
        expectedOutput={expectedOutput}
        actualOutput={submission.stdout}
      />

      {submission.feedback ? (
        <p className="mt-2 text-[11px] text-slate-500">
          Feedback:{" "}
          <span className="font-medium text-slate-700">
            {submission.feedback}
          </span>
        </p>
      ) : null}

      {showGradeForm ? (
        <GradeForm
          submissionId={submission.id}
          maxScore={maxScore}
          initialScore={submission.score}
          initialFeedback={submission.feedback}
        />
      ) : null}
    </div>
  );
}
