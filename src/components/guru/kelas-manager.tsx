"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Plus,
  Search,
  X,
} from "@/components/icons";
import { KelasRow } from "@/components/guru/kelas-row";
import { useScheduleRefresh } from "@/components/guru/use-refresh-on-success";
import { createKelas, type KelasState } from "@/lib/guru/kelas-actions";
import type { KelasView } from "@/lib/guru/types";

const initialState: KelasState = {};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export function KelasManager({
  kelas,
  academicYears,
  defaultAcademicYear,
}: {
  kelas: KelasView[];
  academicYears: string[];
  defaultAcademicYear: string;
}) {
  const [state, formAction, pending] = useActionState(createKelas, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const scheduleRefresh = useScheduleRefresh();
  const [showSuccess, setShowSuccess] = useState(false);
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

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = kelas.filter(
      (item) =>
        needle === "" ||
        item.name.toLowerCase().includes(needle) ||
        item.academicYear.includes(needle),
    );

    const map = new Map<string, KelasView[]>();

    for (const item of filtered) {
      const items = map.get(item.academicYear) ?? [];
      items.push(item);
      map.set(item.academicYear, items);
    }

    return Array.from(map, ([academicYear, items]) => ({ academicYear, items })).sort(
      (a, b) => b.academicYear.localeCompare(a.academicYear),
    );
  }, [kelas, query]);

  return (
    <section
      id="kelas"
      className="mt-6 grid scroll-mt-36 gap-6 xl:scroll-mt-24 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)] xl:items-start"
    >
      <form
        ref={formRef}
        id="tambah-kelas"
        action={formAction}
        className="scroll-mt-36 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] sm:p-6 xl:sticky xl:top-24 xl:scroll-mt-24"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <Plus className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              Tambah Kelas
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Cukup isi nama kelas dan tahun ajarannya.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-xs font-bold text-slate-600">
              Nama Kelas
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={40}
              autoComplete="off"
              placeholder="Contoh: 9A"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="academicYear"
              className="block text-xs font-bold text-slate-600"
            >
              Tahun Ajaran
            </label>
            <select
              id="academicYear"
              name="academicYear"
              defaultValue={defaultAcademicYear}
              className={inputClass}
            >
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
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
              Kelas berhasil ditambahkan.
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
                Tambah Kelas
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
                  Daftar Kelas
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  {kelas.length}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                Dikelompokkan per tahun ajaran, terbaru di atas.
              </p>
            </div>

            <label className="relative flex w-full items-center sm:w-64">
              <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
              <span className="sr-only">Cari kelas</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari kelas atau tahun…"
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
        </div>

        {groups.length === 0 ? (
          <div className="px-5 py-14 text-center sm:px-6">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
              <GraduationCap className="h-6 w-6" />
            </span>
            <p className="mt-4 text-sm font-bold text-slate-600">
              {kelas.length === 0 ? "Belum ada kelas" : "Tidak ada kelas yang cocok"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {kelas.length === 0
                ? "Tambahkan kelas pertama lewat form di samping."
                : "Coba ubah kata kunci pencarian."}
            </p>
          </div>
        ) : (
          <div className="space-y-5 p-4 sm:p-5">
            {groups.map((group) => (
              <section key={group.academicYear}>
                <div className="flex flex-wrap items-center gap-2 px-1">
                  <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
                    Tahun Ajaran {group.academicYear}
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    {group.items.length} kelas
                  </span>
                </div>

                <ul className="mt-2.5 space-y-2.5">
                  {group.items.map((item) => (
                    <KelasRow
                      key={item.id}
                      kelas={item}
                      academicYears={academicYears}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
