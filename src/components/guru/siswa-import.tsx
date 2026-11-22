"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useState, type ChangeEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Download,
  Info,
  Upload,
  Users,
  X,
} from "@/components/icons";
import {
  importSiswa,
  previewImportSiswa,
  type Credential,
  type ImportPreviewState,
  type ImportState,
} from "@/lib/guru/siswa-actions";
import { useScheduleRefresh } from "@/components/guru/use-refresh-on-success";
import { MAX_IMPORT_ROWS } from "@/lib/guru/siswa-utils";

const initialPreview: ImportPreviewState = {};
const initialImport: ImportState = {};

function downloadCsv(rows: Credential[]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const lines = [
    ["nama", "kelas", "username", "password"].map(escape).join(","),
    ...rows.map((row) =>
      [row.name, row.kelas ?? "", row.username, row.password].map(escape).join(","),
    ),
  ];

  const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `akun-siswa-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function SiswaImport() {
  const [preview, previewAction, previewPending] = useActionState(
    previewImportSiswa,
    initialPreview,
  );
  const [result, importAction, importPending] = useActionState(
    importSiswa,
    initialImport,
  );
  const scheduleRefresh = useScheduleRefresh();

  const [file, setFile] = useState<File | null>(null);
  const [view, setView] = useState<"pick" | "preview" | "done">("pick");
  const [checked, setChecked] = useState<ImportPreviewState | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [done, setDone] = useState<ImportState | null>(null);
  // React mengosongkan form setelah aksi selesai; key dipakai untuk me-remount
  // form saat perlu supaya input file kembali sinkron dengan state `file`.
  const [pickKey, setPickKey] = useState(0);
  const [importKey, setImportKey] = useState(0);

  useEffect(() => {
    if (!preview.stamp) return;

    if (preview.error) {
      setPreviewError(preview.error);
      setChecked(null);
      setFile(null);
      setPickKey((value) => value + 1);
      setView("pick");
      return;
    }

    setPreviewError(null);
    setChecked(preview);
    setView("preview");
  }, [preview]);

  useEffect(() => {
    if (!result.stamp) return;

    if (result.error) {
      setImportError(result.error);
      setImportKey((value) => value + 1);
      return;
    }

    setImportError(null);
    setDone(result);
    setView("done");
    setFile(null);

    if (result.imported && result.imported.length > 0) return scheduleRefresh();
  }, [result, scheduleRefresh]);

  /**
   * Setelah pratinjau, file asli kita simpan di state lalu ditempel ke input
   * file tersembunyi di form import (input file tidak bisa di-set lewat value).
   */
  const attachFile = useCallback(
    (node: HTMLInputElement | null) => {
      if (!node || !file) return;

      try {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        node.files = transfer.files;
      } catch {
        // Biarkan kosong; guru tinggal pilih ulang file lewat tombol Ganti file.
      }
    },
    [file],
  );

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setView("pick");
    setChecked(null);
    setPreviewError(null);
    setImportError(null);
    setDone(null);
  }

  function resetAll() {
    setFile(null);
    setView("pick");
    setChecked(null);
    setPreviewError(null);
    setImportError(null);
    setDone(null);
    setPickKey((value) => value + 1);
  }

  const previewRows = checked?.rows ?? [];
  const readyCount = checked?.readyCount ?? 0;
  const failedCount = checked?.failedCount ?? 0;
  const imported = done?.imported ?? [];
  const failed = done?.failed ?? [];
  const error = previewError ?? importError;

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
            <Upload className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              Import Massal
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Unggah file Excel <span className="font-semibold">.xlsx</span> (atau CSV)
              berisi <span className="font-semibold">nama</span>, kelas, tahun ajaran,
              dan email (opsional). Username dan password dibuat otomatis.
            </p>
          </div>
        </div>

        <Link
          href="/guru/siswa/template"
          prefetch={false}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" />
          Template Excel
        </Link>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {view !== "preview" ? (
        <form key={pickKey} action={previewAction} className="mt-5 space-y-3">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50/40">
            <Users className="h-6 w-6 text-slate-300" />
            <span className="mt-2 text-xs font-bold text-slate-600">
              {file?.name || "Pilih file .xlsx atau .csv"}
            </span>
            <span className="mt-0.5 text-[11px] text-slate-400">
              Maks {MAX_IMPORT_ROWS} baris · 2 MB
            </span>
            <input
              type="file"
              name="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              required
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>

          <button
            type="submit"
            disabled={previewPending || !file}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {previewPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Memeriksa file…
              </>
            ) : (
              <>
                <ClipboardList className="h-4 w-4" />
                Periksa File
              </>
            )}
          </button>
        </form>
      ) : null}

      {view === "preview" && checked ? (
        <div className="mt-5 rounded-2xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <ClipboardList className="h-4 w-4 text-violet-600" />
              Hasil pembacaan file
            </p>
            <p className="max-w-full truncate text-xs font-semibold text-slate-500">
              {checked.fileName} · {previewRows.length} baris
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              {readyCount} siap diimport
            </span>
            {failedCount > 0 ? (
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">
                {failedCount} bermasalah
              </span>
            ) : null}
            <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <Info className="h-3.5 w-3.5" />
              Belum ada akun yang dibuat sebelum kamu menekan Import.
            </span>
          </div>

          <div className="max-h-80 overflow-auto border-t border-slate-100">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-extrabold">Baris</th>
                  <th className="px-3 py-2 font-extrabold">Nama</th>
                  <th className="px-3 py-2 font-extrabold">Kelas</th>
                  <th className="px-3 py-2 font-extrabold">Tahun</th>
                  <th className="px-3 py-2 font-extrabold">Email</th>
                  <th className="px-3 py-2 font-extrabold">Username</th>
                  <th className="px-3 py-2 font-extrabold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((row) => (
                  <tr
                    key={row.row}
                    className={row.status === "gagal" ? "bg-rose-50/50" : undefined}
                  >
                    <td className="px-3 py-2 align-top font-mono text-[11px] text-slate-400">
                      {row.row}
                    </td>
                    <td className="px-3 py-2 align-top font-semibold text-slate-800">
                      {row.name || "—"}
                    </td>
                    <td className="px-3 py-2 align-top text-slate-600">
                      {row.kelasLabel ?? (row.kelasName || "—")}
                    </td>
                    <td className="px-3 py-2 align-top text-slate-500">
                      {row.tahunAjaran || "—"}
                    </td>
                    <td className="px-3 py-2 align-top text-slate-500">
                      {row.email || "—"}
                    </td>
                    <td className="px-3 py-2 align-top font-mono text-slate-700">
                      {row.username || "—"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {row.status === "siap" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Siap
                        </span>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            <X className="h-3 w-3" />
                            Gagal
                          </span>
                          <p className="mt-1 max-w-[18rem] text-[10px] font-medium leading-snug text-rose-600">
                            {row.reason}
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form
            key={importKey}
            action={importAction}
            className="flex flex-col gap-2 border-t border-slate-100 p-4 sm:flex-row"
          >
            <input
              ref={attachFile}
              type="file"
              name="file"
              tabIndex={-1}
              aria-hidden="true"
              className="hidden"
            />

            <button
              type="submit"
              disabled={importPending || readyCount === 0}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Mengimpor…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {readyCount > 0
                    ? `Import ${readyCount} Akun`
                    : "Tidak ada baris yang siap"}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetAll}
              disabled={importPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Ganti file
            </button>
          </form>
        </div>
      ) : null}

      {view === "done" && done && (imported.length > 0 || failed.length > 0) ? (
        <div className="mt-5 space-y-3">
          {imported.length > 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  {imported.length} akun berhasil dibuat
                </p>
                <button
                  type="button"
                  onClick={() => downloadCsv(imported)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  Unduh CSV
                </button>
              </div>

              <div className="mt-3 max-h-56 overflow-auto rounded-lg bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-extrabold">Nama</th>
                      <th className="px-3 py-2 font-extrabold">Kelas</th>
                      <th className="px-3 py-2 font-extrabold">Username</th>
                      <th className="px-3 py-2 font-extrabold">Password</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {imported.map((row) => (
                      <tr key={row.username}>
                        <td className="px-3 py-2 text-slate-600">{row.name}</td>
                        <td className="px-3 py-2 text-slate-500">
                          {row.kelas ?? "—"}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">
                          {row.username}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-700">
                          {row.password}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-2 text-[11px] font-medium text-emerald-700/80">
                Password hanya tampil sekarang. Unduh CSV sebelum menutup halaman.
              </p>
            </div>
          ) : null}

          {failed.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
                <X className="h-4 w-4" />
                {failed.length} baris dilewati
              </p>
              <ul className="mt-2 space-y-1 text-xs text-amber-800/90">
                {failed.map((row) => (
                  <li key={`${row.row}-${row.name}`}>
                    Baris {row.row}
                    {row.name ? ` (${row.name})` : ""}: {row.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
