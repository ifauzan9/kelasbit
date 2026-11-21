"use client";

import { useActionState } from "react";
import { CheckCircle2, Save } from "@/components/icons";
import { useRefreshOnSuccess } from "@/components/guru/use-refresh-on-success";
import {
  gradeSubmissionForm,
  type GradeFormState,
} from "@/lib/tugas/actions";

const initialState: GradeFormState = {};

export function GradeForm({
  submissionId,
  maxScore,
  initialScore,
  initialFeedback,
}: {
  submissionId: number;
  maxScore: number;
  initialScore: number | null;
  initialFeedback: string | null;
}) {
  const [state, action, pending] = useActionState(
    gradeSubmissionForm,
    initialState,
  );

  useRefreshOnSuccess(state);

  return (
    <form action={action} className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <input type="hidden" name="submissionId" value={submissionId} />

      <div className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Nilai (0–{maxScore})
          </span>
          <input
            type="number"
            name="score"
            min={0}
            max={maxScore}
            required
            defaultValue={initialScore ?? ""}
            className="mt-1 h-9 w-24 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <label className="min-w-[220px] flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Feedback (opsional)
          </span>
          <input
            name="feedback"
            maxLength={2000}
            defaultValue={initialFeedback ?? ""}
            placeholder="Catatan untuk siswa…"
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" />
          {pending ? "Menyimpan…" : "Simpan nilai"}
        </button>
      </div>

      {state.error ? (
        <p role="alert" className="mt-2 text-[11px] font-medium text-rose-600">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          role="status"
          className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Nilai tersimpan.
        </p>
      ) : null}
    </form>
  );
}
