"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle, ArrowRight, KeyRound, UserRound } from "@/components/icons";
import type { LoginState } from "@/lib/auth/actions";
import { normalizeKelasToken } from "@/lib/auth/kelas-token-format";
import {
  findKelasByToken,
  loginWithKelasToken,
  type KelasLookupState,
} from "@/lib/auth/token-actions";
import { useLoginFinish } from "@/lib/auth/use-login-finish";
import { emitBusy } from "@/lib/hooks/use-navigation-pending";

const initialLookup: KelasLookupState = {};
const initialLogin: LoginState = {};

export function LoginTokenForm() {
  const [lookup, lookupAction, lookupPending] = useActionState(
    findKelasByToken,
    initialLookup,
  );
  const [loginState, loginAction, loginPending] = useActionState(
    loginWithKelasToken,
    initialLogin,
  );
  const [token, setToken] = useState("");
  const [selected, setSelected] = useState("");
  const { locating, finishing } = useLoginFinish(loginState);

  const busy = lookupPending || loginPending || locating || finishing;

  useEffect(() => {
    if (!loginPending) return;

    emitBusy(true);
    return () => emitBusy(false);
  }, [loginPending]);

  const roster =
    lookup.kelas && lookup.token === normalizeKelasToken(token)
      ? lookup.kelas
      : null;

  return (
    <div className="space-y-5">
      <form action={lookupAction} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="kelas-token"
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-700"
          >
            <KeyRound className="h-4 w-4 text-brand-600" />
            Token Kelas
          </label>
          <input
            id="kelas-token"
            name="token"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={10}
            required
            value={token}
            onChange={(event) => setToken(event.target.value.toUpperCase())}
            placeholder="A7K-2M9"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center font-mono text-lg font-bold uppercase tracking-[0.28em] text-slate-900 shadow-sm outline-none transition placeholder:font-normal placeholder:tracking-[0.2em] placeholder:text-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          <p className="text-[11px] leading-relaxed text-slate-400">
            Minta token terbaru dari guru kelasmu. Setelah token benar, pilih
            namamu dari daftar.
          </p>
        </div>

        {lookup.error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {lookup.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          aria-busy={lookupPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-5 py-3 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {lookupPending ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600 motion-reduce:animate-none"
                aria-hidden
              />
              Memeriksa token…
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" />
              Cek Token
            </>
          )}
        </button>
      </form>

      {roster ? (
        <form
          action={loginAction}
          className="space-y-4 border-t border-slate-100 pt-5"
        >
          <input type="hidden" name="token" value={lookup.token ?? ""} />

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                Pilih namamu
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Kelas {roster.name} · {roster.academicYear}
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
              Token valid
            </span>
          </div>

          <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-2">
            {roster.students.map((student) => (
              <label
                key={student.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg bg-white px-3 py-2.5 ring-1 ring-slate-200 transition has-[:checked]:bg-brand-50 has-[:checked]:ring-brand-300"
              >
                <input
                  type="radio"
                  name="userId"
                  value={student.id}
                  checked={selected === String(student.id)}
                  onChange={(event) => setSelected(event.target.value)}
                  required
                  className="h-4 w-4 accent-brand-600"
                />
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700">
                  <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{student.name}</span>
                </span>
              </label>
            ))}
          </div>

          {loginState.error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {loginState.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || !selected}
            aria-busy={loginPending || finishing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {locating ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
                  aria-hidden
                />
                Menunggu izin lokasi…
              </>
            ) : loginPending || finishing ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
                  aria-hidden
                />
                Memproses…
              </>
            ) : (
              <>
                Masuk sebagai Siswa
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      ) : null}
    </div>
  );
}
