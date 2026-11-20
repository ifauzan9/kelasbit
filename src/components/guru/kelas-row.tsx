"use client";

import { useActionState, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  GraduationCap,
  KeyRound,
  Pencil,
  Trash2,
  UserRound,
} from "@/components/icons";
import { KelasTokenPanel } from "@/components/guru/kelas-token-panel";
import { useRefreshOnSuccess } from "@/components/guru/use-refresh-on-success";
import {
  deleteKelas,
  setKelasTokenLogin,
  updateKelas,
  type KelasState,
  type KelasTokenState,
} from "@/lib/guru/kelas-actions";
import type { KelasView } from "@/lib/guru/types";

const initialState: KelasState = {};
const initialTokenState: KelasTokenState = {};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

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

export function KelasRow({
  kelas,
  academicYears,
}: {
  kelas: KelasView;
  academicYears: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [state, formAction, pending] = useActionState(updateKelas, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteKelas,
    initialState,
  );
  const [tokenState, tokenAction, tokenPending] = useActionState(
    setKelasTokenLogin,
    initialTokenState,
  );
  const deleteWarning =
    kelas.studentCount > 0
      ? ` ${kelas.studentCount} siswa di kelas ini akan menjadi tanpa kelas (akunnya tidak dihapus).`
      : "";
  const deleteConfirm = `Hapus kelas ${kelas.name} tahun ajaran ${kelas.academicYear}?${deleteWarning}`;

  const yearOptions = academicYears.includes(kelas.academicYear)
    ? academicYears
    : [kelas.academicYear, ...academicYears];

  useRefreshOnSuccess(state);
  useRefreshOnSuccess(deleteState);
  useRefreshOnSuccess(tokenState);

  useEffect(() => {
    if (!state.success) return;

    setEditing(false);
  }, [state.stamp, state.success]);

  if (editing) {
    return (
      <li className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 ring-2 ring-emerald-100">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={kelas.id} />

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,180px)]">
            <div className="space-y-1.5">
              <label
                htmlFor={`kelas-name-${kelas.id}`}
                className="block text-xs font-bold text-slate-600"
              >
                Nama Kelas
              </label>
              <input
                id={`kelas-name-${kelas.id}`}
                name="name"
                required
                maxLength={40}
                autoComplete="off"
                defaultValue={kelas.name}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={`kelas-year-${kelas.id}`}
                className="block text-xs font-bold text-slate-600"
              >
                Tahun Ajaran
              </label>
              <select
                id={`kelas-year-${kelas.id}`}
                name="academicYear"
                defaultValue={kelas.academicYear}
                className={inputClass}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
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
    <li className="group rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] transition hover:border-emerald-200 hover:shadow-[0_16px_36px_-28px_rgba(16,12,40,0.35)]">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <GraduationCap className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-extrabold text-slate-900">{kelas.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
              <CalendarDays className="h-3 w-3" />
              {kelas.academicYear}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
              <UserRound className="h-3 w-3" />
              {kelas.studentCount} siswa
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <form
              action={tokenAction}
              onSubmit={(event) => {
                if (
                  !kelas.tokenLoginEnabled &&
                  !kelas.loginToken &&
                  !window.confirm(
                    `Aktifkan login token untuk kelas ${kelas.name}? Token akan dibuat otomatis.`,
                  )
                ) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={kelas.id} />
              <input
                type="hidden"
                name="enabled"
                value={String(!kelas.tokenLoginEnabled)}
              />
              <button
                type="submit"
                role="switch"
                aria-checked={kelas.tokenLoginEnabled}
                aria-label={
                  kelas.tokenLoginEnabled
                    ? `Nonaktifkan login token kelas ${kelas.name}`
                    : `Aktifkan login token kelas ${kelas.name}`
                }
                disabled={tokenPending}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  kelas.tokenLoginEnabled ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    kelas.tokenLoginEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </form>
            <span className="text-[11px] font-semibold text-slate-500">
              Login token{" "}
              <span
                className={
                  kelas.tokenLoginEnabled
                    ? "font-extrabold text-emerald-700"
                    : "font-extrabold text-slate-400"
                }
              >
                {kelas.tokenLoginEnabled ? "aktif" : "nonaktif"}
              </span>
            </span>
          </div>

          {tokenState.error ? (
            <p
              role="alert"
              className="mt-1.5 flex items-start gap-1.5 text-[11px] font-medium text-rose-600"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {tokenState.error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setShowToken((value) => !value)}
            aria-expanded={showToken}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <KeyRound className="h-4 w-4" />
            <span className="hidden sm:inline">Token</span>
          </button>

          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <Pencil className="h-4 w-4" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          <form action={deleteAction}>
            <input type="hidden" name="id" value={kelas.id} />
            <DeleteButton pending={deletePending} confirm={deleteConfirm} />
          </form>
        </div>
      </div>

      {showToken ? (
        <KelasTokenPanel
          kelasId={kelas.id}
          kelasName={kelas.name}
          token={kelas.loginToken}
          enabled={kelas.tokenLoginEnabled}
        />
      ) : null}
    </li>
  );
}
