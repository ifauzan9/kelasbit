"use client";

import { useActionState, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  KeyRound,
  ShieldCheck,
} from "@/components/icons";
import { useRefreshOnSuccess } from "@/components/guru/use-refresh-on-success";
import { formatKelasToken } from "@/lib/auth/kelas-token-format";
import {
  removeKelasToken,
  rotateKelasToken,
  setKelasTokenLogin,
  type KelasTokenState,
} from "@/lib/guru/kelas-actions";

const initialState: KelasTokenState = {};

export function KelasTokenPanel({
  kelasId,
  kelasName,
  token,
  enabled,
}: {
  kelasId: number;
  kelasName: string;
  token: string | null;
  enabled: boolean;
}) {
  const [toggleState, toggleAction, togglePending] = useActionState(
    setKelasTokenLogin,
    initialState,
  );
  const [rotateState, rotateAction, rotatePending] = useActionState(
    rotateKelasToken,
    initialState,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeKelasToken,
    initialState,
  );
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [copied, setCopied] = useState(false);

  useRefreshOnSuccess(toggleState);
  useRefreshOnSuccess(rotateState);
  useRefreshOnSuccess(removeState);

  useEffect(() => {
    setIsEnabled(enabled);
  }, [enabled]);

  useEffect(() => {
    if (toggleState.success && typeof toggleState.enabled === "boolean") {
      setIsEnabled(toggleState.enabled);
    }
  }, [toggleState.enabled, toggleState.stamp, toggleState.success]);

  const pending = togglePending || rotatePending || removePending;

  const latest = [
    {
      stamp: toggleState.stamp ?? 0,
      token: toggleState.token,
      enabled: toggleState.enabled,
    },
    {
      stamp: rotateState.stamp ?? 0,
      token: rotateState.token,
      enabled: rotateState.enabled,
    },
    {
      stamp: removeState.stamp ?? 0,
      token: removeState.token,
      enabled: removeState.enabled,
    },
  ].reduce(
    (best, item) => (item.stamp > best.stamp ? item : best),
    { stamp: 0, token, enabled },
  );

  const currentToken = latest.stamp > 0 ? (latest.token ?? null) : token;
  const currentEnabled =
    latest.stamp > 0 ? Boolean(latest.enabled) : isEnabled;
  const error = toggleState.error ?? rotateState.error ?? removeState.error;

  async function copyToken() {
    if (!currentToken) return;

    try {
      await navigator.clipboard.writeText(formatKelasToken(currentToken));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 ring-1 ring-emerald-100">
            <KeyRound className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-700">
              Login Token Kelas
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
              Satu token dipakai semua siswa kelas {kelasName} untuk memilih
              namanya saat login.
            </p>
          </div>
        </div>

        <span
          className={
            currentEnabled
              ? "shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200"
              : "shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200"
          }
        >
          {currentEnabled ? "Aktif" : "Nonaktif"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <form
          action={toggleAction}
          onSubmit={(event) => {
            if (
              !isEnabled &&
              !window.confirm(
                `Aktifkan login token untuk kelas ${kelasName}? Token akan dibuat otomatis bila belum ada.`,
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={kelasId} />
          <input type="hidden" name="enabled" value={String(!isEnabled)} />
          <button
            type="submit"
            role="switch"
            aria-checked={isEnabled}
            aria-label={
              isEnabled
                ? "Nonaktifkan login token kelas"
                : "Aktifkan login token kelas"
            }
            disabled={pending}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              isEnabled ? "bg-emerald-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                isEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </form>

        {currentToken ? (
          <>
            <span className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 font-mono text-base font-extrabold tracking-[0.18em] text-emerald-800">
              {formatKelasToken(currentToken)}
            </span>

            <button
              type="button"
              onClick={copyToken}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Tersalin" : "Salin"}
            </button>

            <form
              action={rotateAction}
              onSubmit={(event) => {
                if (
                  !window.confirm(
                    "Buat token baru? Token lama langsung tidak bisa dipakai.",
                  )
                ) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={kelasId} />
              <input type="hidden" name="intent" value="rotate" />
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {rotatePending ? "Mengganti…" : "Ganti token"}
              </button>
            </form>

            <form
              action={removeAction}
              onSubmit={(event) => {
                if (
                  !window.confirm(
                    `Hapus token kelas ${kelasName}? Login token langsung dinonaktifkan.`,
                  )
                ) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={kelasId} />
              <input type="hidden" name="intent" value="remove" />
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {removePending ? "Menghapus…" : "Hapus token"}
              </button>
            </form>
          </>
        ) : (
          <span className="text-[11px] font-medium text-slate-500">
            Belum ada token — nyalakan switch untuk membuat otomatis.
          </span>
        )}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {latest.stamp > 0 && !error ? (
        <p
          role="status"
          className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-100 bg-white px-3.5 py-2.5 text-sm font-medium text-emerald-700"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Pengaturan token berhasil disimpan.
        </p>
      ) : null}

      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
        Token bersifat bersama: siswa yang tahu token bisa memilih nama
        temannya. Ganti atau hapus token bila bocor.
      </p>
    </div>
  );
}
