"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Search,
  UserPlus,
  Users,
  X,
} from "@/components/icons";
import { CredentialPanel } from "@/components/guru/credential-panel";
import { SiswaRow } from "@/components/guru/siswa-row";
import { useScheduleRefresh } from "@/components/guru/use-refresh-on-success";
import { createSiswa, type SiswaState } from "@/lib/guru/siswa-actions";
import type { KelasOption, SiswaView } from "@/lib/guru/types";

const initialState: SiswaState = {};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

type StatusFilter = "Semua" | "Aktif" | "Nonaktif";

const statusFilters: StatusFilter[] = ["Semua", "Aktif", "Nonaktif"];

export function SiswaManager({
  siswa,
  kelasOptions,
}: {
  siswa: SiswaView[];
  kelasOptions: KelasOption[];
}) {
  const [state, formAction, pending] = useActionState(createSiswa, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const scheduleRefresh = useScheduleRefresh();
  const [showSuccess, setShowSuccess] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("Semua");
  const [kelasFilter, setKelasFilter] = useState("semua");

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

  const counts = useMemo(
    () => ({
      Semua: siswa.length,
      Aktif: siswa.filter((item) => item.isActive).length,
      Nonaktif: siswa.filter((item) => !item.isActive).length,
    }),
    [siswa],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return siswa.filter((item) => {
      const matchesStatus =
        status === "Semua" || (status === "Aktif" ? item.isActive : !item.isActive);
      const matchesKelas =
        kelasFilter === "semua" ||
        (kelasFilter === "tanpa" ? item.kelasId === null : String(item.kelasId) === kelasFilter);
      const matchesQuery =
        needle === "" ||
        item.name.toLowerCase().includes(needle) ||
        (item.username ?? "").toLowerCase().includes(needle) ||
        (item.email ?? "").toLowerCase().includes(needle) ||
        (item.kelasName ?? "").toLowerCase().includes(needle);

      return matchesStatus && matchesKelas && matchesQuery;
    });
  }, [siswa, query, status, kelasFilter]);

  return (
    <section
      id="siswa"
      className="mt-6 grid scroll-mt-36 gap-6 xl:scroll-mt-24 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)] xl:items-start"
    >
      <form
        ref={formRef}
        id="tambah-siswa"
        action={formAction}
        className="scroll-mt-36 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] sm:p-6 xl:sticky xl:top-24 xl:scroll-mt-24"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <UserPlus className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              Tambah Siswa
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Username dan password dibuat otomatis.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-xs font-bold text-slate-600">
              Nama Lengkap
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={120}
              autoComplete="off"
              placeholder="Contoh: Budi Santoso"
              className={inputClass}
            />
            <p className="text-[11px] font-medium text-slate-400">
              Username mengikuti nama, mis. <span className="font-mono">budi.santoso</span>.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="flex items-center justify-between text-xs font-bold text-slate-600"
            >
              Email
              <span className="text-[10px] font-medium text-slate-400">Opsional</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="off"
              placeholder="nama@sekolah.sch.id"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="kelasId"
              className="flex items-center justify-between text-xs font-bold text-slate-600"
            >
              Kelas
              <span className="text-[10px] font-medium text-slate-400">Opsional</span>
            </label>
            <select
              id="kelasId"
              name="kelasId"
              defaultValue=""
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Tanpa kelas</option>
              {kelasOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.academicYear}
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
              Akun siswa berhasil dibuat.
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
                Membuat akun…
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Buat Akun Siswa
              </>
            )}
          </button>
        </div>

        {state.created ? (
          <div className="mt-4">
            <CredentialPanel credential={state.created} />
          </div>
        ) : null}
      </form>

      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,12,40,0.04)]">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                  Daftar Siswa
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  {siswa.length}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                Akun ini langsung bisa dipakai login siswa.
              </p>
            </div>

            <label className="relative flex w-full items-center sm:w-64">
              <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
              <span className="sr-only">Cari siswa</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama, username, email…"
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

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {statusFilters.map((item) => {
              const active = status === item;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatus(item)}
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

            <label className="ml-auto flex items-center gap-2">
              <span className="sr-only">Filter kelas</span>
              <select
                value={kelasFilter}
                onChange={(event) => setKelasFilter(event.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="semua">Semua kelas</option>
                <option value="tanpa">Tanpa kelas</option>
                {kelasOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.academicYear}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-14 text-center sm:px-6">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
              <Users className="h-6 w-6" />
            </span>
            <p className="mt-4 text-sm font-bold text-slate-600">
              {siswa.length === 0 ? "Belum ada siswa" : "Tidak ada siswa yang cocok"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {siswa.length === 0
                ? "Buat akun pertama lewat form di samping atau import Excel."
                : "Coba ubah kata kunci, filter status, atau filter kelas."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5 p-4 sm:p-5">
            {filtered.map((item) => (
              <SiswaRow key={item.id} siswa={item} kelasOptions={kelasOptions} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
