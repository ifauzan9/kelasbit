"use client";

import { Terminal } from "@/components/icons";
import type { LabRunStatus } from "@/lib/db/schema";

const STATUS_LABEL: Record<LabRunStatus, string> = {
  success: "Berhasil",
  error: "Error",
  timeout: "Timeout",
  stopped: "Dihentikan",
};

const STATUS_CLASS: Record<LabRunStatus, string> = {
  success: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
  error: "bg-rose-400/15 text-rose-300 ring-rose-400/30",
  timeout: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  stopped: "bg-slate-400/15 text-slate-300 ring-slate-400/30",
};

export function ConsolePanel({
  stdout,
  stderr,
  status,
  durationMs,
  running,
  waitingForInput = false,
  onClear,
}: {
  stdout: string;
  stderr: string;
  status: LabRunStatus | null;
  durationMs: number | null;
  running: boolean;
  waitingForInput?: boolean;
  onClear: () => void;
}) {
  const empty = !stdout && !stderr;

  return (
    <section className="flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#11151f] shadow-[0_18px_40px_-30px_rgba(2,6,23,0.8)]">
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-3.5 py-2.5">
        <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-300">
          <Terminal className="h-4 w-4 text-emerald-300" />
          Console
        </span>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ring-1 ${
              running
                ? "bg-sky-400/15 text-sky-300 ring-sky-400/30"
                : status
                  ? STATUS_CLASS[status]
                  : "bg-white/5 text-slate-400 ring-white/10"
            }`}
          >
            {running
              ? waitingForInput
                ? "Menunggu input…"
                : "Menjalankan…"
              : status
                ? STATUS_LABEL[status]
                : "Siap"}
          </span>
          <button
            type="button"
            onClick={onClear}
            disabled={running || empty}
            className="rounded-md px-2 py-1 text-[10px] font-bold text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Bersihkan
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-3.5 py-3 font-mono text-[12px] leading-relaxed">
        {empty ? (
          <p className="text-slate-500">
            {running
              ? "Menunggu output…"
              : "Tekan Run untuk menjalankan kode Python."}
          </p>
        ) : (
          <>
            {stdout ? (
              <pre className="whitespace-pre-wrap break-words text-slate-100">
                {stdout}
              </pre>
            ) : null}
            {stderr ? (
              <pre className="mt-2 whitespace-pre-wrap break-words text-rose-300">
                {stderr}
              </pre>
            ) : null}
          </>
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-white/10 px-3.5 py-2 text-[10px] font-medium text-slate-500">
        <span>Python · berjalan di browser</span>
        <span>{durationMs !== null ? `${durationMs} ms` : "—"}</span>
      </footer>
    </section>
  );
}
