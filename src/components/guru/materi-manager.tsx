"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Plus,
  Search,
  X,
} from "@/components/icons";
import { MateriRow } from "@/components/guru/materi-row";
import { useScheduleRefresh } from "@/components/guru/use-refresh-on-success";
import { createMateri, type MateriState } from "@/lib/guru/actions";
import { SUBJECTS, type Subject } from "@/lib/guru/constants";
import type { MateriView } from "@/lib/guru/types";

const initialState: MateriState = {};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const subjectDot: Record<Subject, string> = {
  Informatika: "bg-sky-500",
  KKA: "bg-violet-500",
};

type Filter = "Semua" | Subject;

const filters: Filter[] = ["Semua", ...SUBJECTS];

export function MateriManager({ materi }: { materi: MateriView[] }) {
  const [state, formAction, pending] = useActionState(createMateri, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const scheduleRefresh = useScheduleRefresh();
  const [showSuccess, setShowSuccess] = useState(false);
  const [filter, setFilter] = useState<Filter>("Semua");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!state.success) return;

    formRef.current?.reset();
    setShowSuccess(true);
    const cancelRefresh = scheduleRefresh();
    const timer = setTimeout(() => setShowSuccess(false), 4000);

    return () => {
      cancelRefresh();
      clearTimeout(timer);
    };
  }, [state.stamp, state.success, scheduleRefresh]);

  const counts = useMemo<Record<Filter, number>>(
    () => ({
      Semua: materi.length,
      Informatika: materi.filter((item) => item.subject === "Informatika").length,
      KKA: materi.filter((item) => item.subject === "KKA").length,
    }),
    [materi],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return materi.filter((item) => {
      const matchesFilter = filter === "Semua" || item.subject === filter;
      const matchesQuery =
        needle === "" ||
        item.title.toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle);

      return matchesFilter && matchesQuery;
    });
  }, [materi, filter, query]);

  return (
    <section
      id="materi"
      className="mt-6 grid scroll-mt-36 gap-6 xl:scroll-mt-24 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)] xl:items-start"
    >
      <form
        ref={formRef}
        id="tambah-materi"
        action={formAction}
        className="scroll-mt-36 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] sm:p-6 xl:sticky xl:top-24 xl:scroll-mt-24"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <Plus className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              Tambah Materi
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Buat bahan ajar baru untuk siswa.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="title" className="block text-xs font-bold text-slate-600">
              Judul Materi
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

          <fieldset className="space-y-2">
            <legend className="mb-1.5 block text-xs font-bold text-slate-600">
              Mata Pelajaran
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {SUBJECTS.map((subject, index) => (
                <label
                  key={subject}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-700"
                >
                  <input
                    type="radio"
                    name="subject"
                    value={subject}
                    defaultChecked={index === 0}
                    className="sr-only"
                  />
                  <span className={`h-2 w-2 rounded-full ${subjectDot[subject]}`} />
                  {subject}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="flex items-center justify-between text-xs font-bold text-slate-600"
            >
              Deskripsi
              <span className="text-[10px] font-medium text-slate-400">Opsional</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              maxLength={2000}
              placeholder="Ringkasan singkat isi materi…"
              className={inputClass}
            />
          </div>

          {state.error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {state.error}
            </p>
          ) : null}

          {showSuccess ? (
            <p
              role="status"
              className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              Materi berhasil ditambahkan.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Menyimpan…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Tambah Materi
              </>
            )}
          </button>
        </div>
      </form>

      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,12,40,0.04)]">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                  Koleksi Materi
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  {materi.length}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                Kelola bahan ajar Informatika &amp; KKA.
              </p>
            </div>

            <label className="relative flex w-full items-center sm:w-64">
              <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
              <span className="sr-only">Cari materi</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari materi…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Bersihkan pencarian"
                  className="absolute right-2 flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((item) => {
              const active = filter === item;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={
                    active
                      ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20"
                      : "inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
                  }
                >
                  {item}
                  <span
                    className={
                      active
                        ? "rounded-full bg-white/20 px-1.5 text-[10px] font-bold text-white"
                        : "rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500"
                    }
                  >
                    {counts[item]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-14 text-center sm:px-6">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
              <BookOpen className="h-6 w-6" />
            </span>
            <p className="mt-4 text-sm font-bold text-slate-600">
              {materi.length === 0 ? "Belum ada materi" : "Tidak ada materi yang cocok"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {materi.length === 0
                ? "Tambahkan bahan ajar pertama lewat form di samping."
                : "Coba ubah kata kunci atau pilih filter lain."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3 p-4 sm:p-5">
            {filtered.map((item) => (
              <MateriRow key={item.id} materi={item} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
