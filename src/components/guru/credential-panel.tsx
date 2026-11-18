"use client";

import { useState } from "react";
import { CheckCircle2, Copy, KeyRound } from "@/components/icons";
import type { Credential } from "@/lib/guru/siswa-actions";

export function CredentialPanel({
  credential,
  title = "Akun berhasil dibuat",
}: {
  credential: Credential;
  title?: string;
}) {
  const [copied, setCopied] = useState<"username" | "password" | "all" | null>(null);

  async function copy(value: string, kind: "username" | "password" | "all") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-emerald-800">{title}</p>
          <p className="mt-0.5 text-xs text-emerald-700/80">
            Catat sekarang — password tidak bisa dilihat lagi.
          </p>
          {credential.kelas ? (
            <p className="mt-1 text-xs font-semibold text-emerald-700">
              Kelas: {credential.kelas}
            </p>
          ) : null}
        </div>
      </div>

      <dl className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
          <div className="min-w-0">
            <dt className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Username
            </dt>
            <dd className="truncate font-mono text-sm font-bold text-slate-900">
              {credential.username}
            </dd>
          </div>
          <button
            type="button"
            onClick={() => copy(credential.username, "username")}
            aria-label="Salin username"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            {copied === "username" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
          <div className="min-w-0">
            <dt className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Password
            </dt>
            <dd className="truncate font-mono text-sm font-bold text-slate-900">
              {credential.password}
            </dd>
          </div>
          <button
            type="button"
            onClick={() => copy(credential.password, "password")}
            aria-label="Salin password"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            {copied === "password" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </dl>

      <button
        type="button"
        onClick={() =>
          copy(
            `${credential.name}\n${credential.kelas ? `Kelas: ${credential.kelas}\n` : ""}Username: ${credential.username}\nPassword: ${credential.password}`,
            "all",
          )
        }
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
      >
        {copied === "all" ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Tersalin
          </>
        ) : (
          <>
            <KeyRound className="h-3.5 w-3.5" />
            Salin semuanya
          </>
        )}
      </button>
    </div>
  );
}
