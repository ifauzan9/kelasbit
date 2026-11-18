"use client";

import { useActionState, useEffect } from "react";
import { login, type LoginState } from "@/lib/auth/actions";
import { emitBusy } from "@/lib/hooks/use-navigation-pending";
import type { Role } from "@/lib/db/schema";

const initialState: LoginState = {};

type LoginFormProps = {
  role: Role;
};

export function LoginForm({ role }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(login, initialState);

  const isGuru = role === "guru";

  useEffect(() => {
    if (!pending) return;

    emitBusy(true);
    return () => emitBusy(false);
  }, [pending]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="role" value={role} />
      <div className="space-y-2">
        <label htmlFor="identifier" className="block text-sm font-semibold text-slate-700">
          {isGuru ? "Email" : "Username"}
        </label>
        <input
          id="identifier"
          name="identifier"
          type={isGuru ? "email" : "text"}
          autoComplete={isGuru ? "email" : "username"}
          autoCapitalize="none"
          spellCheck={false}
          required
          placeholder={isGuru ? "nama@sekolah.sch.id" : "budi.santoso"}
          className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
            isGuru
              ? "focus:border-emerald-500 focus:ring-emerald-200"
              : "focus:border-brand-500 focus:ring-brand-200"
          }`}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
            isGuru
              ? "focus:border-emerald-500 focus:ring-emerald-200"
              : "focus:border-brand-500 focus:ring-brand-200"
          }`}
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
          isGuru
            ? "bg-emerald-600 shadow-emerald-600/30 hover:bg-emerald-700"
            : "bg-brand-600 shadow-brand-600/30 hover:bg-brand-700"
        }`}
      >
        {pending ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
              aria-hidden
            />
            Memproses…
          </>
        ) : isGuru ? (
          "Masuk sebagai Guru"
        ) : (
          "Masuk sebagai Siswa"
        )}
      </button>
    </form>
  );
}
