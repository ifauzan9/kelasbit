"use client";

import { useActionState, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ChipAI,
  MonitorCode,
  Pencil,
  Trash2,
} from "@/components/icons";
import { useRefreshOnSuccess } from "@/components/guru/use-refresh-on-success";
import { deleteMateri, updateMateri, type MateriState } from "@/lib/guru/actions";
import { SUBJECTS, type Subject } from "@/lib/guru/constants";
import { SUBJECT_STYLES, toSubject } from "@/lib/guru/subjects";
import type { MateriView } from "@/lib/guru/types";

const initialState: MateriState = {};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const subjectDot: Record<Subject, string> = {
  Informatika: "bg-sky-500",
  KKA: "bg-violet-500",
};

const radioClass =
  "flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-700";

function DeleteButton({ pending, confirm }: { pending: boolean; confirm: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Trash2 className="h-4 w-4" />
      <span className="hidden sm:inline">{pending ? "Menghapus…" : "Hapus"}</span>
    </button>
  );
}

export function MateriRow({ materi }: { materi: MateriView }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateMateri, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteMateri,
    initialState,
  );

  useRefreshOnSuccess(state);
  useRefreshOnSuccess(deleteState);

  useEffect(() => {
    if (!state.success) return;

    setEditing(false);
  }, [state.stamp, state.success]);

  const subject = toSubject(materi.subject);
  const styles = SUBJECT_STYLES[subject];
  const Icon = subject === "KKA" ? ChipAI : MonitorCode;

  if (editing) {
    return (
      <li className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 ring-2 ring-emerald-100 sm:p-5">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={materi.id} />

          <div className="space-y-1.5">
            <label
              htmlFor={`title-${materi.id}`}
              className="block text-xs font-bold text-slate-600"
            >
              Judul Materi
            </label>
            <input
              id={`title-${materi.id}`}
              name="title"
              required
              maxLength={160}
              defaultValue={materi.title}
              className={inputClass}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-1.5 block text-xs font-bold text-slate-600">
              Mata Pelajaran
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {SUBJECTS.map((item) => (
                <label key={item} className={radioClass}>
                  <input
                    type="radio"
                    name="subject"
                    value={item}
                    defaultChecked={materi.subject === item}
                    className="sr-only"
                  />
                  <span className={`h-2 w-2 rounded-full ${subjectDot[item]}`} />
                  {item}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <label
              htmlFor={`description-${materi.id}`}
              className="block text-xs font-bold text-slate-600"
            >
              Deskripsi
            </label>
            <textarea
              id={`description-${materi.id}`}
              name="description"
              rows={3}
              maxLength={2000}
              defaultValue={materi.description}
              className={inputClass}
            />
          </div>

          {state.error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-100 bg-white px-3.5 py-2.5 text-sm font-medium text-rose-600"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {state.error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Menyimpan…
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Batal
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,12,40,0.04)] transition hover:border-emerald-200 hover:shadow-[0_16px_36px_-28px_rgba(16,12,40,0.35)] sm:p-5">
      <div className="flex items-start gap-4">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${styles.tile}`}
        >
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-extrabold leading-snug text-slate-900 sm:text-[15px]">
                {materi.title}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ring-1 ${styles.badge}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                  {materi.subject}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {materi.createdAtLabel}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              >
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>

              <form action={deleteAction}>
                <input type="hidden" name="id" value={materi.id} />
                <DeleteButton
                  pending={deletePending}
                  confirm={`Hapus materi "${materi.title}"?`}
                />
              </form>
            </div>
          </div>

          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-slate-500">
            {materi.description || "Tanpa deskripsi."}
          </p>
        </div>
      </div>
    </li>
  );
}
