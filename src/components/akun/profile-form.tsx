"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Pencil,
  Save,
} from "@/components/icons";
import { useRefreshOnSuccess } from "@/components/guru/use-refresh-on-success";
import { updateProfile } from "@/lib/akun/actions";
import type { ProfileState } from "@/lib/akun/types";
import type { Role } from "@/lib/db/schema";

const initialState: ProfileState = {};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export function ProfileForm({
  name,
  email,
  role,
}: {
  name: string;
  email: string | null;
  role: Role;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  // Form action React 19 mereset input tak-terkontrol. Nilai dibuat terkontrol
  // supaya isian tidak hilang saat validasi server gagal.
  const [nameValue, setNameValue] = useState(name);
  const [emailValue, setEmailValue] = useState(email ?? "");

  useRefreshOnSuccess(state);

  useEffect(() => {
    setNameValue(name);
    setEmailValue(email ?? "");
  }, [name, email]);

  useEffect(() => {
    if (!state.success) return;

    if (passwordRef.current) passwordRef.current.value = "";
    setShowSuccess(true);
    const timer = setTimeout(() => setShowSuccess(false), 4000);

    return () => clearTimeout(timer);
  }, [state.stamp, state.success]);

  const isGuru = role === "guru";

  return (
    <form
      action={formAction}
      className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <Pencil className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            Edit Profil
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            Username dan peran akun tidak bisa diubah.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="profile-name" className="block text-xs font-bold text-slate-600">
            Nama Lengkap
          </label>
          <input
            id="profile-name"
            name="name"
            required
            maxLength={120}
            autoComplete="name"
            value={nameValue}
            onChange={(event) => setNameValue(event.target.value)}
            placeholder="Contoh: Budi Santoso"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="profile-email"
            className="flex items-center justify-between text-xs font-bold text-slate-600"
          >
            Email
            {isGuru ? (
              <span className="text-[10px] font-medium text-slate-400">Wajib</span>
            ) : (
              <span className="text-[10px] font-medium text-slate-400">Opsional</span>
            )}
          </label>
          <input
            id="profile-email"
            name="email"
            type="email"
            autoComplete="email"
            value={emailValue}
            onChange={(event) => setEmailValue(event.target.value)}
            placeholder="nama@sekolah.sch.id"
            className={inputClass}
          />
          {isGuru ? (
            <p className="text-[11px] font-medium text-slate-400">
              Email ini dipakai untuk login guru.
            </p>
          ) : null}
        </div>

        {isGuru ? (
          <div className="space-y-1.5">
            <label
              htmlFor="profile-current-password"
              className="flex items-center justify-between text-xs font-bold text-slate-600"
            >
              Password Saat Ini
              <span className="text-[10px] font-medium text-slate-400">
                Jika email diubah
              </span>
            </label>
            <input
              ref={passwordRef}
              id="profile-current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputClass}
            />
            <p className="text-[11px] font-medium text-slate-400">
              Wajib diisi hanya saat mengganti email.
            </p>
          </div>
        ) : null}

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
            Profil berhasil diperbarui.
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
              <Save className="h-4 w-4" />
              Simpan Perubahan
            </>
          )}
        </button>
      </div>
    </form>
  );
}
