"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Link2 } from "@/components/icons";
import { submitTugasLink } from "@/lib/tugas/actions";
import type { TugasLinkReviewStatus } from "@/lib/db/schema";

export function TugasLinkForm({
  tugasId,
  initialUrl,
  reviewStatus,
  reviewNote,
  disabled,
  taskMaxScore,
  totalQuestions,
}: {
  tugasId: number;
  initialUrl: string | null;
  reviewStatus: TugasLinkReviewStatus | null;
  reviewNote: string | null;
  disabled: boolean;
  taskMaxScore: number;
  totalQuestions: number;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUrl(initialUrl ?? "");
  }, [initialUrl]);

  const approved = reviewStatus === "disetujui";
  const revision = reviewStatus === "perbaikan";
  const waiting = reviewStatus === "menunggu";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || disabled || approved) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    const result = await submitTugasLink({ tugasId, url });
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setUrl(result.url);
    setNotice("Video berhasil dikirim. Menunggu pemeriksaan guru.");
    router.refresh();
  }

  return (
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
            (tidak dikunci) dan tautan wajib diisi. Video tidak menambah nilai;
            nilai total tetap {taskMaxScore}.
          </p>
        </div>
      </div>

      {waiting ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
          Video sudah dikirim. Menunggu pemeriksaan guru. Kamu masih bisa
          mengganti link selama belum diperiksa.
        </p>
      ) : null}

      {revision ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-800">
          Video perlu diperbaiki.
          {reviewNote ? (
            <span className="mt-1 block font-medium text-rose-700">
              Catatan guru: {reviewNote}
            </span>
          ) : null}
        </p>
      ) : null}

      {approved ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
          <p className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Video sudah disetujui guru.
          </p>
          {initialUrl ? (
            <a
              href={initialUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all font-medium text-emerald-700 underline underline-offset-2"
            >
              {initialUrl}
            </a>
          ) : null}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2">
          <label className="block text-[11px] font-bold text-slate-600">
            Link video (TikTok/Instagram)
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              disabled={disabled || saving}
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
            disabled={disabled || saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-4 py-2 text-[11px] font-bold text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Link2 className="h-3.5 w-3.5" />
            {saving
              ? "Menyimpan…"
              : revision
                ? "Kirim ulang video"
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
      )}

      {approved ? (
        <p className="mt-2 text-[10px] font-medium text-slate-500">
          Tugas dinyatakan selesai setelah seluruh {totalQuestions} soal juga
          selesai.
        </p>
      ) : null}
    </div>
  );
}
