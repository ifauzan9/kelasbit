"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Link2,
  MapPin,
  Search,
  Users,
  X,
} from "@/components/icons";
import { SubmissionDetailContent } from "@/components/tugas/submission-detail";
import { GpsPassControl } from "@/components/tugas/gps-pass-control";
import { locationMapUrl } from "@/lib/auth/geolocation";
import {
  formatAccuracyMeters,
  GPS_PRECISION_LABEL,
  gpsPrecisionTier,
  type GpsPrecisionTier,
} from "@/lib/tugas/location";
import { getTugasStudentAnswers, resetTugasSubmission } from "@/lib/tugas/actions";
import type {
  TugasLocationView,
  TugasRoster,
  TugasRosterRow,
  TugasRosterStatus,
  TugasStudentAnswers,
  TugasSubmissionView,
} from "@/lib/tugas/types";

const PAGE_SIZE = 15;

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS_LABEL: Record<TugasRosterStatus, string> = {
  lulus: "Lulus",
  belum_lulus: "Belum lulus",
  mengerjakan: "Sudah mengerjakan",
  belum_mengerjakan: "Belum mengerjakan",
};

const STATUS_CLASS: Record<TugasRosterStatus, string> = {
  lulus: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  belum_lulus: "bg-amber-50 text-amber-700 ring-amber-100",
  mengerjakan: "bg-sky-50 text-sky-700 ring-sky-100",
  belum_mengerjakan: "bg-slate-100 text-slate-600 ring-slate-200",
};

const LOCATION_LABEL: Record<string, string> = {
  tersedia: "Tersedia",
  ditolak: "Izin ditolak",
  timeout: "Timeout",
  tidak_didukung: "Tidak didukung",
  error: "Error",
  tidak_dicatat: "Tidak dicatat",
  dimatikan: "Dimatikan",
};

const PRECISION_CLASS: Record<GpsPrecisionTier, string> = {
  sangat_presisi: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  presisi: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  cukup_presisi: "bg-amber-50 text-amber-700 ring-amber-100",
  kurang_presisi: "bg-orange-50 text-orange-700 ring-orange-100",
  di_luar_batas: "bg-rose-50 text-rose-700 ring-rose-100",
};

function LocationCell({
  location,
}: {
  location: TugasLocationView | null;
}) {
  if (!location) {
    return <span className="text-[10px] text-slate-300">—</span>;
  }

  if (
    location.status === "tersedia" &&
    location.latitude !== null &&
    location.longitude !== null
  ) {
    const tier = gpsPrecisionTier(location.accuracy);
    const accuracy = formatAccuracyMeters(location.accuracy);

    return (
      <div className="flex flex-col items-start gap-0.5">
        {tier ? (
          <span
            className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ring-1 ${PRECISION_CLASS[tier]}`}
          >
            {GPS_PRECISION_LABEL[tier]}
          </span>
        ) : null}
        <a
          href={locationMapUrl(location.latitude, location.longitude)}
          target="_blank"
          rel="noreferrer"
          title={
            location.accuracy !== null
              ? `Akurasi ${accuracy ?? "tidak diketahui"}`
              : undefined
          }
          className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
        >
          <MapPin className="h-3 w-3" />
          Lihat peta
        </a>
        {accuracy ? (
          <span className="px-1.5 text-[9px] font-medium text-slate-400">
            {accuracy}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
      <MapPin className="h-3 w-3 text-slate-300" />
      {LOCATION_LABEL[location.status] ?? location.status}
    </span>
  );
}

function StudentAnswersPanel({ data }: { data: TugasStudentAnswers }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
        <p className="text-[11px] font-semibold text-slate-600">
          Soal selesai:{" "}
          <span className="font-extrabold text-slate-900">
            {data.solvedCount}/{data.questionCount}
          </span>
        </p>
        <p className="text-[11px] font-semibold text-slate-600">
          Nilai total:{" "}
          <span className="font-extrabold text-slate-900">
            {data.totalScore}/{data.maxScore}
          </span>
        </p>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50/50 px-3.5 py-3">
        <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-sky-700">
          <Link2 className="h-3.5 w-3.5" />
          Tautan pengumpulan
        </p>
        {data.link ? (
          <a
            href={data.link.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 block break-all text-[11px] font-semibold text-sky-800 underline underline-offset-2 hover:text-sky-950"
          >
            {data.link.url}
          </a>
        ) : (
          <p className="mt-1 text-[11px] font-medium text-slate-500">
            Belum dikumpulkan.
          </p>
        )}
      </div>

      <ul className="space-y-2">
        {data.answers.map((answer) => (
          <li key={answer.questionId}>
            <details className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3.5 py-3 text-xs [&::-webkit-details-marker]:hidden">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold ring-1 ${
                    answer.passed
                      ? "bg-emerald-600 text-white ring-emerald-600"
                      : "bg-slate-100 text-slate-600 ring-slate-200"
                  }`}
                >
                  {answer.orderNo}
                </span>
                <span className="min-w-0 flex-1 font-bold text-slate-800">
                  {answer.title}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
                  {answer.bestScore ?? 0}/{answer.maxScore}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ring-1 ${
                    answer.passed
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                      : answer.attempts > 0
                        ? "bg-amber-50 text-amber-700 ring-amber-100"
                        : "bg-slate-100 text-slate-500 ring-slate-200"
                  }`}
                >
                  {answer.passed
                    ? "Selesai"
                    : answer.attempts > 0
                      ? "Belum benar"
                      : "Belum dikerjakan"}
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  {answer.attempts} percobaan
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </summary>
              <div className="border-t border-slate-100 p-3.5">
                {answer.latestSubmission ? (
                  <SubmissionDetailContent
                    submission={answer.latestSubmission}
                    maxScore={answer.maxScore}
                    expectedOutput={answer.expectedOutput}
                  />
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-[11px] font-medium text-slate-400">
                    Belum ada jawaban untuk soal ini.
                  </p>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Filter =
  | "semua"
  | "lulus"
  | "belum"
  | "sudah"
  | "belum_mengerjakan";

function matchesFilter(row: TugasRosterRow, filter: Filter): boolean {
  if (filter === "semua") return true;
  if (filter === "lulus") return row.passed === true;
  if (filter === "belum") {
    return row.attempts > 0 && row.passed === false;
  }
  if (filter === "sudah") return row.attempts > 0;
  return row.attempts === 0;
}

export function TugasRosterTable({
  tugasId,
  roster,
  submissions,
  maxScore,
  expectedOutput,
  requireGps,
  isMultiQuestion,
}: {
  tugasId: number;
  roster: TugasRoster;
  submissions: TugasSubmissionView[];
  maxScore: number;
  expectedOutput: string;
  requireGps: boolean;
  isMultiQuestion: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("semua");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [compareUserIds, setCompareUserIds] = useState<[number, number] | null>(
    null,
  );
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [studentAnswers, setStudentAnswers] =
    useState<TugasStudentAnswers | null>(null);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answersError, setAnswersError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    if (selectedUserId === null || !isMultiQuestion) {
      setStudentAnswers(null);
      setAnswersError(null);
      setAnswersLoading(false);
      return;
    }

    setStudentAnswers(null);
    setAnswersError(null);
    setAnswersLoading(true);

    getTugasStudentAnswers({ tugasId, userId: selectedUserId })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setStudentAnswers(result.data);
        else setAnswersError(result.error);
      })
      .catch(() => {
        if (!cancelled) {
          setAnswersError("Gagal memuat jawaban siswa.");
        }
      })
      .finally(() => {
        if (!cancelled) setAnswersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isMultiQuestion, selectedUserId, tugasId]);

  const filters: { id: Filter; label: string; count: number }[] = roster.hasKkm
    ? [
        { id: "semua", label: "Semua", count: roster.rows.length },
        { id: "lulus", label: "Lulus", count: roster.passedCount },
        { id: "belum", label: "Belum lulus", count: roster.failedCount },
        {
          id: "belum_mengerjakan",
          label: "Belum mengerjakan",
          count: roster.notStartedCount,
        },
      ]
    : [
        { id: "semua", label: "Semua", count: roster.rows.length },
        { id: "sudah", label: "Sudah mengerjakan", count: roster.workedCount },
        {
          id: "belum_mengerjakan",
          label: "Belum mengerjakan",
          count: roster.notStartedCount,
        },
      ];

  const submissionsByUser = useMemo(
    () => new Map(submissions.map((submission) => [submission.userId, submission])),
    [submissions],
  );
  const selectedSubmission =
    selectedUserId !== null
      ? (submissionsByUser.get(selectedUserId) ?? null)
      : null;
  const compareSubmissions = compareUserIds
    ? compareUserIds.map((userId) => submissionsByUser.get(userId) ?? null)
    : null;
  const compareReady =
    compareSubmissions &&
    compareSubmissions[0] !== null &&
    compareSubmissions[1] !== null
      ? ([compareSubmissions[0], compareSubmissions[1]] as const)
      : null;
  const selectedRows = selectedUserIds.map((userId) =>
    roster.rows.find((row) => row.userId === userId),
  );
  const selectedRow =
    selectedUserId !== null
      ? roster.rows.find((row) => row.userId === selectedUserId)
      : undefined;
  const modalOpen = selectedUserId !== null || compareUserIds !== null;

  function toggleSelection(userId: number) {
    setSelectedUserIds((current) => {
      if (current.includes(userId)) {
        return current.filter((id) => id !== userId);
      }
      if (current.length >= 2) return current;
      return [...current, userId];
    });
  }

  async function handleReset(userId: number, userName: string) {
    const confirmed = window.confirm(
      `Reset seluruh pekerjaan ${userName} pada tugas ini?\n\nSemua percobaan, nilai, feedback, status lulus, tautan pengumpulan, dan riwayat akan dihapus. Tindakan ini tidak bisa dibatalkan.`,
    );
    if (!confirmed) return;

    setResetting(true);
    setResetError(null);

    const result = await resetTugasSubmission({
      tugasId,
      userId,
    });

    setResetting(false);

    if (!result.ok) {
      setResetError(result.error ?? "Gagal mereset pekerjaan.");
      return;
    }

    setSelectedUserId(null);
    setSelectedUserIds((current) => current.filter((id) => id !== userId));
    router.refresh();
  }

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return roster.rows.filter((row) => {
      if (!matchesFilter(row, filter)) return false;
      if (!needle) return true;

      return (
        row.name.toLowerCase().includes(needle) ||
        (row.username ?? "").toLowerCase().includes(needle) ||
        (row.kelasLabel ?? "").toLowerCase().includes(needle)
      );
    });
  }, [filter, query, roster.rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const rangeStart = filteredRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredRows.length);

  useEffect(() => {
    if (!modalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedUserId(null);
        setCompareUserIds(null);
        setResetError(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modalOpen]);

  return (
    <>
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
              Siswa ditugaskan
            </p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              {roster.assignedCount}
            </p>
            {roster.inactiveCount > 0 ? (
              <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                {roster.inactiveCount} akun nonaktif
              </p>
            ) : null}
          </div>

          {roster.hasKkm ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-600">
                Lulus KKM
              </p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-800">
                {roster.passedCount}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-sky-600">
                Sudah mengerjakan
              </p>
              <p className="mt-1 text-2xl font-extrabold text-sky-800">
                {roster.workedCount}
              </p>
            </div>
          )}

          {roster.hasKkm ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-amber-600">
                Belum lulus
              </p>
              <p className="mt-1 text-2xl font-extrabold text-amber-800">
                {roster.failedCount}
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
              Belum mengerjakan
            </p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              {roster.notStartedCount}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-1.5">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setFilter(item.id);
                  setPage(1);
                }}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  filter === item.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.label}{" "}
                <span
                  className={
                    filter === item.id ? "text-white/60" : "text-slate-400"
                  }
                >
                  {item.count}
                </span>
              </button>
            ))}
          </div>

          <label className="relative block w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <span className="sr-only">Cari siswa</span>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Cari nama, username, atau kelas…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          {selectedUserIds.length > 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">
                    Dipilih {selectedUserIds.length}/2
                  </span>
                  {selectedRows.map((row, index) =>
                    row ? (
                      <span
                        key={row.userId}
                        className="max-w-[180px] truncate rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 ring-1 ring-emerald-100"
                      >
                        {row.name}
                      </span>
                    ) : (
                      <span
                        key={`selected-${index}`}
                        className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-emerald-100"
                      >
                        Siswa
                      </span>
                    ),
                  )}
                  {selectedUserIds.length < 2 ? (
                    <span className="text-[10px] font-medium text-emerald-700/70">
                      Pilih {2 - selectedUserIds.length} siswa lagi untuk
                      dibandingkan.
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={selectedUserIds.length !== 2}
                    onClick={() => {
                      if (selectedUserIds.length !== 2) return;
                      setSelectedUserId(null);
                      setCompareUserIds([
                        selectedUserIds[0],
                        selectedUserIds[1],
                      ]);
                    }}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Bandingkan jawaban
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds([])}
                    className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
                  >
                    Bersihkan
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
                <th className="w-8 px-2 py-2">
                  <span className="sr-only">Pilih</span>
                </th>
                <th className="px-2 py-2 font-extrabold">Siswa</th>
                <th className="px-2 py-2 font-extrabold">Kelas</th>
                <th className="px-2 py-2 font-extrabold">Tautan</th>
                <th className="px-2 py-2 text-center font-extrabold">
                  Percobaan
                </th>
                <th className="px-2 py-2 text-center font-extrabold">
                  Nilai terakhir
                </th>
                <th className="px-2 py-2 font-extrabold">Lokasi</th>
                <th className="px-2 py-2 font-extrabold">Status</th>
                <th className="px-2 py-2 font-extrabold">Terakhir</th>
                <th className="px-2 py-2 text-right font-extrabold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-2 py-6 text-center text-slate-400"
                  >
                    Tidak ada siswa yang cocok.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const submission = submissionsByUser.get(row.userId);
                  const isSelected = selectedUserIds.includes(row.userId);
                  const selectionDisabled =
                    !submission ||
                    (!isSelected && selectedUserIds.length >= 2);

                  return (
                    <tr key={row.userId} className="hover:bg-slate-50/70">
                      <td className="px-2 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={selectionDisabled}
                          onChange={() => toggleSelection(row.userId)}
                          aria-label={`Pilih ${row.name} untuk dibandingkan`}
                          title={
                            submission
                              ? "Pilih untuk dibandingkan"
                              : "Belum ada jawaban"
                          }
                          className="h-3.5 w-3.5 cursor-pointer accent-emerald-600 disabled:cursor-not-allowed disabled:opacity-30"
                        />
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                            <Users className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-800">
                              {row.name}
                            </p>
                            <p className="truncate text-[10px] text-slate-400">
                              {row.username ?? "—"}
                            </p>
                          </div>
                          {!row.isActive ? (
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 ring-1 ring-slate-200">
                              Nonaktif
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-[11px] font-medium text-slate-500">
                        {row.kelasLabel ?? "Tanpa kelas"}
                      </td>
                      <td className="px-2 py-2.5">
                        {row.link ? (
                          <a
                            href={row.link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-bold text-sky-700 transition-colors hover:bg-sky-50"
                          >
                            Buka
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-center font-bold text-slate-700">
                        {row.attempts}
                      </td>
                      <td className="px-2 py-2.5 text-center font-bold text-slate-700">
                        {row.attempts === 0
                          ? "—"
                          : row.lastScore === null
                            ? "Belum dinilai"
                            : row.lastScore}
                      </td>
                      <td className="px-2 py-2.5">
                        <LocationCell location={row.latestLocation} />
                        {row.gpsPass ? (
                          <span
                            className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide ring-1 ${
                              row.gpsPass.active
                                ? row.gpsPass.usedAt
                                  ? "bg-amber-50 text-amber-700 ring-amber-100"
                                  : "bg-sky-50 text-sky-700 ring-sky-100"
                                : "bg-slate-100 text-slate-500 ring-slate-200"
                            }`}
                          >
                            {row.gpsPass.active
                              ? row.gpsPass.usedAt
                                ? "Bypass dipakai"
                                : "Kode aktif"
                              : "Kode nonaktif"}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ring-1 ${STATUS_CLASS[row.status]}`}
                        >
                          {row.status === "lulus" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : row.status === "belum_lulus" ? (
                            <AlertCircle className="h-3 w-3" />
                          ) : null}
                          {STATUS_LABEL[row.status]}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-[10px] font-medium text-slate-400">
                        {row.lastSubmittedAt
                          ? `${dateFormatter.format(new Date(row.lastSubmittedAt))} WIB`
                          : "—"}
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {isMultiQuestion || submission ? (
                            <button
                              type="button"
                              onClick={() => {
                                setCompareUserIds(null);
                                setResetError(null);
                                setSelectedUserId(row.userId);
                              }}
                              className="rounded-lg px-2 py-1 text-[10px] font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
                            >
                              Lihat jawaban
                            </button>
                          ) : null}
                          {requireGps ? (
                            <button
                              type="button"
                              onClick={() => {
                                setCompareUserIds(null);
                                setResetError(null);
                                setSelectedUserId(row.userId);
                              }}
                              className="rounded-lg px-2 py-1 text-[10px] font-bold text-amber-700 transition-colors hover:bg-amber-50"
                            >
                              Kode GPS
                            </button>
                          ) : null}
                          {!submission && !requireGps && !isMultiQuestion ? (
                            <span className="text-[10px] text-slate-300">—</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredRows.length > PAGE_SIZE ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-[10px] font-medium text-slate-400">
              Menampilkan {rangeStart}–{rangeEnd} dari {filteredRows.length}{" "}
              siswa
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-3 w-3 rotate-180" />
                Sebelumnya
              </button>
              <span className="px-1 text-[10px] font-bold text-slate-500">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Berikutnya
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {selectedRow ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedUserId(null);
              setResetError(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="roster-submission-title"
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_80px_-20px_rgba(2,6,23,0.55)]"
          >
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  <Users className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2
                    id="roster-submission-title"
                    className="truncate text-base font-extrabold text-slate-900"
                  >
                    {selectedSubmission?.userName ?? selectedRow.name}
                  </h2>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                    {isMultiQuestion
                      ? answersLoading
                        ? "Memuat semua jawaban soal…"
                        : studentAnswers
                          ? `${studentAnswers.solvedCount}/${studentAnswers.questionCount} soal selesai · Nilai ${studentAnswers.totalScore}/${studentAnswers.maxScore}`
                          : "Semua soal dan tautan pengumpulan"
                      : selectedSubmission
                        ? `Percobaan ke-${selectedSubmission.attemptNo} · ${dateFormatter.format(
                            new Date(selectedSubmission.submittedAt),
                          )} WIB`
                        : "Belum ada pengumpulan · kode GPS tetap bisa dibuat"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {isMultiQuestion && studentAnswers ? (
                      <>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
                          Nilai {studentAnswers.totalScore}/{studentAnswers.maxScore}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ring-1 ${
                            studentAnswers.link
                              ? "bg-sky-50 text-sky-700 ring-sky-100"
                              : "bg-amber-50 text-amber-700 ring-amber-100"
                          }`}
                        >
                          {studentAnswers.link
                            ? "Tautan terkumpul"
                            : "Tautan belum"}
                        </span>
                      </>
                    ) : null}
                    {!isMultiQuestion && selectedSubmission ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
                        Nilai {selectedSubmission.score ?? "—"} / {maxScore}
                      </span>
                    ) : null}
                    {!isMultiQuestion &&
                    selectedSubmission?.passed !== null &&
                    selectedSubmission?.passed !== undefined ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ring-1 ${
                          selectedSubmission.passed
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                            : "bg-rose-50 text-rose-700 ring-rose-100"
                        }`}
                      >
                        {selectedSubmission.passed ? "Lulus" : "Belum lulus"}
                      </span>
                    ) : null}
                    {selectedRow.latestLocation ? (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 ring-1 ring-sky-100">
                        <LocationCell location={selectedRow.latestLocation} />
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-start gap-1.5">
                {(isMultiQuestion
                  ? selectedRow.attempts > 0 || Boolean(selectedRow.link)
                  : Boolean(selectedSubmission)) ? (
                  <button
                    type="button"
                    onClick={() => handleReset(selectedRow.userId, selectedRow.name)}
                    disabled={resetting}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {resetting ? "Mereset…" : "Reset pekerjaan"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserId(null);
                    setResetError(null);
                  }}
                  aria-label="Tutup detail jawaban"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            {selectedUserId !== null && selectedRow ? (
              <GpsPassControl
                tugasId={tugasId}
                userId={selectedUserId}
                initialPass={selectedRow.gpsPass}
              />
            ) : null}

            {resetError ? (
              <p
                role="alert"
                className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-[11px] font-semibold text-rose-700 sm:px-5"
              >
                {resetError}
              </p>
            ) : null}

            <div className="overflow-y-auto p-4 sm:p-5">
              {isMultiQuestion ? (
                answersLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-slate-500">
                      Memuat semua soal dan jawaban…
                    </p>
                  </div>
                ) : answersError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-center">
                    <p className="text-sm font-semibold text-rose-700">
                      {answersError}
                    </p>
                    <p className="mt-1 text-[11px] text-rose-600/80">
                      Tutup modal lalu coba buka kembali.
                    </p>
                  </div>
                ) : studentAnswers ? (
                  <StudentAnswersPanel data={studentAnswers} />
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center">
                    <Users className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      Data jawaban belum tersedia.
                    </p>
                  </div>
                )
              ) : selectedSubmission ? (
                <SubmissionDetailContent
                  submission={selectedSubmission}
                  maxScore={maxScore}
                  expectedOutput={expectedOutput}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Belum ada jawaban yang dikumpulkan.
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Guru tetap bisa membuat kode pass GPS dari panel di atas.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {compareReady ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCompareUserIds(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="roster-compare-title"
            className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_80px_-20px_rgba(2,6,23,0.55)]"
          >
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-600">
                  Perbandingan jawaban
                </p>
                <h2
                  id="roster-compare-title"
                  className="mt-0.5 truncate text-base font-extrabold text-slate-900"
                >
                  {compareReady[0].userName} vs {compareReady[1].userName}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                  <span
                    className={`rounded-full px-2 py-0.5 ring-1 ${
                      compareReady[0].code === compareReady[1].code
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                        : "bg-amber-50 text-amber-700 ring-amber-100"
                    }`}
                  >
                    Kode:{" "}
                    {compareReady[0].code === compareReady[1].code
                      ? "sama"
                      : "berbeda"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 ring-1 ${
                      compareReady[0].stdout === compareReady[1].stdout
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                        : "bg-amber-50 text-amber-700 ring-amber-100"
                    }`}
                  >
                    Output:{" "}
                    {compareReady[0].stdout === compareReady[1].stdout
                      ? "sama"
                      : "berbeda"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                    Nilai: {compareReady[0].score ?? "—"} vs{" "}
                    {compareReady[1].score ?? "—"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCompareUserIds(null)}
                aria-label="Tutup perbandingan jawaban"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="overflow-y-auto p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                {compareReady.map((submission) => (
                  <article
                    key={submission.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/40 p-3"
                  >
                    <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-900">
                          {submission.userName}
                        </p>
                        <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                          Percobaan ke-{submission.attemptNo} ·{" "}
                          {dateFormatter.format(
                            new Date(submission.submittedAt),
                          )}{" "}
                          WIB
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-slate-700 ring-1 ring-slate-200">
                          Nilai {submission.score ?? "—"} / {maxScore}
                        </span>
                        {submission.passed !== null ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ring-1 ${
                              submission.passed
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                : "bg-rose-50 text-rose-700 ring-rose-100"
                            }`}
                          >
                            {submission.passed ? "Lulus" : "Belum lulus"}
                          </span>
                        ) : null}
                        {roster.rows.find(
                          (row) => row.userId === submission.userId,
                        )?.latestLocation ? (
                          <span className="rounded-full bg-sky-50 px-2 py-0.5 ring-1 ring-sky-100">
                            <LocationCell
                              location={
                                roster.rows.find(
                                  (row) => row.userId === submission.userId,
                                )?.latestLocation ?? null
                              }
                            />
                          </span>
                        ) : null}
                      </div>
                    </header>

                    <div className="pt-3">
                      <SubmissionDetailContent
                        submission={submission}
                        maxScore={maxScore}
                        expectedOutput={expectedOutput}
                        showGradeForm={false}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
