"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  GraduationCap,
  KeyRound,
  Mail,
  Pencil,
  Trash2,
  UserRound,
} from "@/components/icons";
import { CredentialPanel } from "@/components/guru/credential-panel";
import { useRefreshOnSuccess } from "@/components/guru/use-refresh-on-success";
import {
  deleteSiswa,
  resetSiswaPassword,
  toggleSiswaActive,
  updateSiswa,
  type ResetState,
  type SiswaState,
} from "@/lib/guru/siswa-actions";
import type { KelasOption, SiswaView } from "@/lib/guru/types";

const initialSiswaState: SiswaState = {};
const initialResetState: ResetState = {};

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

function ActiveToggle({ aktif, pending }: { aktif: boolean; pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      title={aktif ? "Nonaktifkan akun" : "Aktifkan akun"}
      className={
        aktif
          ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200 transition-colors hover:bg-emerald-100 disabled:opacity-60"
          : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200 transition-colors hover:bg-slate-200 disabled:opacity-60"
      }
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${aktif ? "bg-emerald-500" : "bg-slate-400"}`}
      />
      {pending ? "…" : aktif ? "Aktif" : "Nonaktif"}
    </button>
  );
}

export function SiswaRow({
  siswa,
  kelasOptions,
}: {
  siswa: SiswaView;
  kelasOptions: KelasOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [state, formAction, pending] = useActionState(updateSiswa, initialSiswaState);
  const [resetState, resetAction, resetPending] = useActionState(
    resetSiswaPassword,
    initialResetState,
  );
  const [toggleState, toggleAction, togglePending] = useActionState(
    toggleSiswaActive,
    initialSiswaState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteSiswa,
    initialSiswaState,
  );

  useRefreshOnSuccess(state);
  useRefreshOnSuccess(toggleState);
  useRefreshOnSuccess(deleteState);

  useEffect(() => {
    if (!state.success) return;

    setEditing(false);
  }, [state.stamp, state.success]);

  useEffect(() => {
    if (!resetState.credential) return;

    setConfirmReset(false);
  }, [resetState.stamp, resetState.credential]);

  if (editing) {
    return (
      <li className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 ring-2 ring-emerald-100">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={siswa.id} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor={`siswa-name-${siswa.id}`}
                className="block text-xs font-bold text-slate-600"
              >
                Nama Siswa
              </label>
              <input
                id={`siswa-name-${siswa.id}`}
                name="name"
                required
                maxLength={120}
                autoComplete="off"
                defaultValue={siswa.name}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={`siswa-email-${siswa.id}`}
                className="flex items-center justify-between text-xs font-bold text-slate-600"
              >
                Email
                <span className="text-[10px] font-medium text-slate-400">Opsional</span>
              </label>
              <input
                id={`siswa-email-${siswa.id}`}
                name="email"
                type="email"
                autoComplete="off"
                defaultValue={siswa.email ?? ""}
                placeholder="nama@sekolah.sch.id"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={`siswa-kelas-${siswa.id}`}
                className="flex items-center justify-between text-xs font-bold text-slate-600"
              >
                Kelas
                <span className="text-[10px] font-medium text-slate-400">Opsional</span>
              </label>
              <select
                id={`siswa-kelas-${siswa.id}`}
                name="kelasId"
                defaultValue={siswa.kelasId ? String(siswa.kelasId) : ""}
                className={inputClass}
              >
                <option value="">Tanpa kelas</option>
                {kelasOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.academicYear}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-[11px] font-medium text-slate-500">
            Username{" "}
            <span className="font-mono font-bold text-slate-700">
              {siswa.username ?? "—"}
            </span>{" "}
            tidak berubah saat nama diedit.
          </p>

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
    <li className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,12,40,0.04)] transition hover:border-emerald-200 hover:shadow-[0_16px_36px_-28px_rgba(16,12,40,0.35)]">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
            siswa.isActive
              ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
              : "bg-slate-100 text-slate-400 ring-slate-200"
          }`}
        >
          <UserRound className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-extrabold text-slate-900">
                {siswa.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-600">
                  <UserRound className="h-3 w-3 text-slate-400" />
                  {siswa.username ?? "—"}
                </span>
                {siswa.email ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <Mail className="h-3 w-3" />
                    {siswa.email}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300">
                    <CalendarDays className="h-3 w-3" />
                    tanpa email
                  </span>
                )}
                {siswa.kelasName ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-extrabold text-violet-700 ring-1 ring-violet-100">
                    <GraduationCap className="h-3 w-3" />
                    {siswa.kelasName}
                    {siswa.academicYear ? ` · ${siswa.academicYear}` : ""}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300">
                    <GraduationCap className="h-3 w-3" />
                    tanpa kelas
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 pt-2 sm:justify-end sm:border-t-0 sm:pt-0">
              <form action={toggleAction}>
                <input type="hidden" name="id" value={siswa.id} />
                <ActiveToggle aktif={siswa.isActive} pending={togglePending} />
              </form>

              <Link
                href={`/guru/siswa/${siswa.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              >
                <UserRound className="h-4 w-4" />
                <span className="hidden sm:inline">Detail</span>
              </Link>

              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              >
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                disabled={resetPending}
                aria-label={`Reset password ${siswa.name}`}
                title="Reset password"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-amber-600 transition-colors hover:bg-amber-50 disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {resetPending ? "…" : "Reset"}
                </span>
              </button>

              <form action={deleteAction}>
                <input type="hidden" name="id" value={siswa.id} />
                <DeleteButton
                  pending={deletePending}
                  confirm={`Hapus akun siswa "${siswa.name}"?`}
                />
              </form>
            </div>
          </div>

          {confirmReset ? (
            <div
              role="alertdialog"
              aria-labelledby={`reset-confirm-title-${siswa.id}`}
              aria-describedby={`reset-confirm-desc-${siswa.id}`}
              className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3"
            >
              <p
                id={`reset-confirm-title-${siswa.id}`}
                className="text-xs font-extrabold text-amber-800"
              >
                Reset password untuk &ldquo;{siswa.name}&rdquo;?
              </p>
              <p
                id={`reset-confirm-desc-${siswa.id}`}
                className="mt-1 text-[11px] leading-relaxed text-amber-700/80"
              >
                Password lama langsung tidak berlaku dan semua sesi login
                siswa ini dikeluarkan. Pastikan Anda memilih siswa yang benar.
              </p>
              <form action={resetAction} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={siswa.id} />
                <input type="hidden" name="confirm" value="yes" />
                <button
                  type="submit"
                  disabled={resetPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  {resetPending ? "Mereset…" : "Ya, reset password"}
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setConfirmReset(false)}
                  disabled={resetPending}
                  className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-[11px] font-bold text-amber-800 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Batal
                </button>
              </form>
            </div>
          ) : null}

          {resetState.error ? (
            <p role="alert" className="mt-2 text-xs font-medium text-rose-600">
              {resetState.error}
            </p>
          ) : null}

          {resetState.credential ? (
            <div className="mt-3">
              <CredentialPanel
                credential={resetState.credential}
                title="Password berhasil direset"
              />
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
