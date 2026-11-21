"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Terminal } from "@/components/icons";

export function InputPromptDialog({
  prompt,
  count,
  onSubmit,
  onCancel,
}: {
  prompt: string;
  count: number;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue("");
    inputRef.current?.focus();
  }, [count]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-input-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_30px_80px_-20px_rgba(2,6,23,0.55)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <Terminal className="h-5 w-5" />
            </span>
            <div>
              <p
                id="lab-input-title"
                className="text-sm font-extrabold text-slate-900"
              >
                Program meminta input
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                Kode sedang berhenti menunggu jawabanmu.
              </p>
            </div>
          </div>

          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
            Input ke-{count}
          </span>
        </div>

        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 font-mono text-sm leading-relaxed text-slate-800">
          {prompt || "(program tidak menampilkan teks prompt)"}
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(value);
          }}
        >
          <label htmlFor="lab-input-answer" className="sr-only">
            Jawaban input
          </label>
          <input
            ref={inputRef}
            id="lab-input-answer"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            autoFocus
            placeholder="Ketik jawaban lalu tekan Enter…"
            className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm text-slate-900 shadow-sm outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Batalkan program
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              Kirim
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>

        <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
          Jawaban kosong diperbolehkan. Setelah dikirim, program dijalankan ulang
          dengan jawaban ini sampai selesai.
        </p>
      </div>
    </div>
  );
}
