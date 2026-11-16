"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteMateri, updateMateri, type MateriState } from "@/lib/guru/actions";
import { SUBJECTS } from "@/lib/guru/constants";
import type { MateriView } from "@/lib/guru/types";

const initialState: MateriState = {};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menghapus…" : "Hapus"}
    </button>
  );
}

export function MateriRow({ materi }: { materi: MateriView }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateMateri, initialState);

  useEffect(() => {
    if (state.success) setEditing(false);
  }, [state.stamp, state.success]);

  if (editing) {
    return (
      <li className="bg-slate-50/60 px-5 py-4 sm:px-6">
        <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <input type="hidden" name="id" value={materi.id} />

          <div className="space-y-1.5">
            <label
              htmlFor={`title-${materi.id}`}
              className="block text-xs font-bold text-slate-600"
            >
              Judul
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

          <div className="space-y-1.5">
            <label
              htmlFor={`subject-${materi.id}`}
              className="block text-xs font-bold text-slate-600"
            >
              Mata Pelajaran
            </label>
            <select
              id={`subject-${materi.id}`}
              name="subject"
              defaultValue={materi.subject}
              className={inputClass}
            >
              {SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
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
              className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600 sm:col-span-2"
            >
              {state.error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? "Menyimpan…" : "Simpan Perubahan"}
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
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">{materi.title}</h3>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
            {materi.subject}
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          {materi.description || "Tanpa deskripsi."}
        </p>
        <p className="mt-1.5 text-[11px] text-slate-400">
          Dibuat {materi.createdAtLabel}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-200 hover:text-emerald-700"
        >
          Edit
        </button>

        <form
          action={deleteMateri}
          onSubmit={(event) => {
            if (!window.confirm(`Hapus materi "${materi.title}"?`)) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={materi.id} />
          <DeleteButton />
        </form>
      </div>
    </li>
  );
}
