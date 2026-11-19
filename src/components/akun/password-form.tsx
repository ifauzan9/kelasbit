"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
} from "@/components/icons";
import { changePassword, logoutAllDevices } from "@/lib/akun/actions";
import type { PasswordState } from "@/lib/akun/types";

const initialState: PasswordState = {};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-11 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-slate-600">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          placeholder={placeholder}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function LogoutAllButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (
          !window.confirm(
            "Keluar dari semua perangkat? Kamu perlu login ulang di semua perangkat, termasuk perangkat ini.",
          )
        ) {
          event.preventDefault();
        }
      }}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
          Mengeluarkan…
        </>
      ) : (
        <>
          <LogOut className="h-4 w-4" />
          Keluar dari semua perangkat
        </>
      )}
    </button>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!state.success) return;

    formRef.current?.reset();
    setShowSuccess(true);
    const timer = setTimeout(() => setShowSuccess(false), 5000);

    return () => clearTimeout(timer);
  }, [state.stamp, state.success]);

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <KeyRound className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            Keamanan Akun
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            Ganti password atau keluarkan semua sesi yang aktif.
          </p>
        </div>
      </div>

      <form ref={formRef} action={formAction} className="mt-6 space-y-4">
        <PasswordField
          id="current-password"
          name="currentPassword"
          label="Password Saat Ini"
          autoComplete="current-password"
          placeholder="••••••••"
        />
        <PasswordField
          id="new-password"
          name="newPassword"
          label="Password Baru"
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
        />
        <PasswordField
          id="confirm-password"
          name="confirmPassword"
          label="Konfirmasi Password Baru"
          autoComplete="new-password"
          placeholder="Ulangi password baru"
        />

        <p className="text-[11px] font-medium leading-relaxed text-slate-400">
          Setelah password diganti, semua perangkat lain otomatis dikeluarkan.
        </p>

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
            Password diperbarui. Perangkat lain telah dikeluarkan.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Memperbarui…
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" />
              Ganti Password
            </>
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <p className="mb-3 text-xs font-bold text-slate-600">Sesi Perangkat</p>
        <form action={logoutAllDevices}>
          <LogoutAllButton />
        </form>
      </div>
    </section>
  );
}
