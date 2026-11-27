"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Link2 } from "@/components/icons";
import { submitTugasLink } from "@/lib/tugas/actions";

export function TugasLinkForm({
  tugasId,
  initialUrl,
  disabled,
  taskMaxScore,
  totalQuestions,
}: {
  tugasId: number;
  initialUrl: string | null;
  disabled: boolean;
  taskMaxScore: number;
  totalQuestions: number;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<{
    finalScore: number | null;
  } | null>(null);

  useEffect(() => {
    setUrl(initialUrl ?? "");
  }, [initialUrl]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || disabled) return;

    setPending(true);
    setError(null);
    setNotice(null);

    const result = await submitTugasLink({ tugasId, url });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setUrl(result.url);
    setNotice("Tautan video berhasil disimpan.");
    if (result.taskCompleted) {
      setFinalResult({ finalScore: result.finalScore });
      return;
    }
    router.refresh();
  }

  function closeFinalModal() {
    setFinalResult(null);
    router.refresh();
  }

  return (
    <>
      <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 ring-1 ring-sky-100">
            <Link2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-slate-900">
              Kumpulkan video tugas
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
              Tempel tautan video dari TikTok atau Instagram. Akun harus publik
              (tidak dikunci) dan tautan wajib diisi. Video tidak menambah
              nilai; nilai total tetap {taskMaxScore}.
            </p>
          </div>
        </div>

        {initialUrl ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
            Video sudah dikumpulkan. Kamu masih bisa memperbaruinya.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-3 space-y-2">
          <label className="block text-[11px] font-bold text-slate-600">
            Link video (TikTok/Instagram)
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              disabled={disabled || pending}
              required
              placeholder="https://www.tiktok.com/@akun/video/... atau https://www.instagram.com/reel/..."
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-400"
            />
          </label>

          <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Akun TikTok/Instagram harus publik (jangan private/dikunci).
              Video dari akun private tidak bisa dibuka oleh guru.
            </span>
          </p>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-100">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
              {notice}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={disabled || pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-4 py-2 text-[11px] font-bold text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Link2 className="h-3.5 w-3.5" />
            {pending
              ? "Menyimpan…"
              : initialUrl
                ? "Perbarui video"
                : "Kumpulkan video"}
          </button>
          {disabled ? (
            <p className="text-[11px] font-medium text-amber-700">
              Batas waktu sudah lewat. Video tidak dapat diubah.
            </p>
          ) : null}
        </form>
      </div>

      {finalResult ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tugas-link-final-title"
            className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-[0_30px_80px_-20px_rgba(2,6,23,0.55)]"
          >
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h2
              id="tugas-link-final-title"
              className="mt-4 text-xl font-extrabold tracking-tight text-slate-900"
            >
              Pengganti Uprak selesai!
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              {finalResult.finalScore ?? 0}
              <span className="ml-1 text-sm font-bold text-slate-400">
                / {taskMaxScore}
              </span>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Seluruh {totalQuestions} soal dan video pengumpulan sudah lengkap.
              Nilai akhir kamu {finalResult.finalScore ?? 0} dan tugas dinyatakan
              selesai.
            </p>
            <button
              type="button"
              autoFocus
              onClick={closeFinalModal}
              className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
            >
              Tutup
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
