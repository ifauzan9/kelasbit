"use client";

import { History, Trash2 } from "@/components/icons";
import type { LabRunStatus } from "@/lib/db/schema";
import type { LabRunView } from "@/lib/lab/types";

const STATUS_LABEL: Record<LabRunStatus, string> = {
  success: "Berhasil",
  error: "Error",
  timeout: "Timeout",
  stopped: "Dihentikan",
};

const STATUS_CLASS: Record<LabRunStatus, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  error: "bg-rose-50 text-rose-700 ring-rose-100",
  timeout: "bg-amber-50 text-amber-700 ring-amber-100",
  stopped: "bg-slate-100 text-slate-600 ring-slate-200",
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function previewOf(code: string): string {
  const line = code
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item && !item.startsWith("#"));
  return line ?? "(kode kosong)";
}

export function RunHistory({
  runs,
  activeId,
  onSelect,
  onDelete,
  deletingId,
}: {
  runs: LabRunView[];
  activeId: number | null;
  onSelect: (run: LabRunView) => void;
  onDelete: (id: number) => void;
  deletingId: number | null;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,12,40,0.04)]">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
          <History className="h-4 w-4 text-emerald-600" />
          Riwayat Run
        </span>
        <span className="text-[10px] font-bold text-slate-400">
          {runs.length} tersimpan
        </span>
      </header>

      {runs.length === 0 ? (
        <p className="px-4 py-5 text-xs leading-relaxed text-slate-400">
          Belum ada riwayat. Setelah Run selesai, klik <span className="font-bold text-slate-500">Simpan Riwayat</span>{" "}
          untuk menyimpan kode dan hasilnya di sini.
        </p>
      ) : (
        <ul className="max-h-[320px] divide-y divide-slate-100 overflow-y-auto">
          {runs.map((run) => {
            const active = activeId === run.id;

            return (
              <li
                key={run.id}
                className={`flex items-start gap-2 px-3 py-2.5 transition-colors ${
                  active ? "bg-emerald-50/70" : "hover:bg-slate-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(run)}
                  className="min-w-0 flex-1 text-left"
                  title="Muat kode dan output ini"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ring-1 ${STATUS_CLASS[run.status]}`}
                    >
                      {STATUS_LABEL[run.status]}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {dateFormatter.format(new Date(run.createdAt))} WIB
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-[11px] text-slate-600">
                    {previewOf(run.code)}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Hapus riwayat run ini?")) {
                      onDelete(run.id);
                    }
                  }}
                  disabled={deletingId === run.id}
                  aria-label="Hapus riwayat run"
                  className="mt-0.5 rounded-md p-1 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
