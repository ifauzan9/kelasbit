"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Copy } from "@/components/icons";

export function MaintenanceBanner({ loginPath }: { loginPath: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = origin ? `${origin}${loginPath}` : loginPath;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wide text-amber-700">
              Mode maintenance aktif
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-700/80">
              Halaman publik dan area siswa ditutup. Simpan URL login guru ini:
            </p>
            <p className="mt-1.5 break-all font-mono text-[11px] text-amber-900">
              {url}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={copyUrl}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-amber-700"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Tersalin" : "Salin URL"}
        </button>
      </div>
    </div>
  );
}
