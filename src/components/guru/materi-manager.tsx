"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createMateri, type MateriState } from "@/lib/guru/actions";
import { SUBJECTS } from "@/lib/guru/constants";
import type { MateriView } from "@/lib/guru/types";
import { MateriRow } from "@/components/guru/materi-row";

const initialState: MateriState = {};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export function MateriManager({ materi }: { materi: MateriView[] }) {
  const [state, formAction, pending] = useActionState(createMateri, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!state.success) return;

    formRef.current?.reset();
    setShowSuccess(true);
    const timer = setTimeout(() => setShowSuccess(false), 4000);

    return () => clearTimeout(timer);
  }, [state.stamp, state.success]);

  return (
    <section className="mt-8 rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(16,12,40,0.04)]">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <h2 className="text-lg font-bold text-slate-900">Kelola Materi</h2>
        <p className="mt-1 text-sm text-slate-500">
          CRUD sederhana untuk testing: tambah, edit, dan hapus materi.
        </p>
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="grid gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-5 sm:grid-cols-[1fr_180px] sm:px-6"
      >
        <div className="space-y-1.5">
          <label htmlFor="title" className="block text-xs font-bold text-slate-600">
            Judul
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={160}
            placeholder="Contoh: Variabel Python"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="subject" className="block text-xs font-bold text-slate-600">
            Mata Pelajaran
          </label>
          <select id="subject" name="subject" className={inputClass}>
            {SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="description" className="block text-xs font-bold text-slate-600">
            Deskripsi
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={2000}
            placeholder="Deskripsi singkat materi (opsional)"
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

        {showSuccess ? (
          <p
            role="status"
            className="rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700 sm:col-span-2"
          >
            Materi berhasil ditambahkan.
          </p>
        ) : null}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Menyimpan…" : "Tambah Materi"}
          </button>
        </div>
      </form>

      {materi.length === 0 ? (
        <div className="px-5 py-12 text-center sm:px-6">
          <p className="text-sm font-semibold text-slate-600">Belum ada materi</p>
          <p className="mt-1 text-sm text-slate-400">
            Tambahkan materi pertama lewat form di atas.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {materi.map((item) => (
            <MateriRow key={item.id} materi={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
