"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CodeXml,
  Eye,
  Info,
  Play,
  RotateCcw,
  Square,
} from "@/components/icons";
import { ConsolePanel } from "@/components/lab/console-panel";
import { InputPromptDialog } from "@/components/lab/input-prompt-dialog";
import type { LabRunStatus } from "@/lib/db/schema";
import { submitTugas } from "@/lib/tugas/actions";
import type { TugasMetrics } from "@/lib/tugas/rules";

const PythonEditor = dynamic(
  () => import("@/components/lab/python-editor").then((mod) => mod.PythonEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] items-center justify-center bg-[#282c34] text-xs font-semibold text-slate-400">
        Memuat editor…
      </div>
    ),
  },
);

const RUN_TIMEOUT_MS = 5000;
const MAX_OUTPUT = 20_000;

type RuntimeState = "booting" | "ready" | "error";
type OutputKind = "stdout" | "stderr";

type WorkerMessage =
  | { type: "ready" }
  | { type: "needInput"; id: number; prompt: string; count: number }
  | {
      type: "done";
      id: number;
      status: LabRunStatus;
      durationMs: number;
      stdout: string;
      stderr: string;
      metrics: TugasMetrics | null;
    }
  | { type: "fatal"; message: string };

type LastRun = {
  code: string;
  answers: string[];
  stdout: string;
  stderr: string;
  status: LabRunStatus;
  metrics: TugasMetrics | null;
};

const RUNTIME_LABEL: Record<RuntimeState, string> = {
  booting: "Memuat Python…",
  ready: "Python siap",
  error: "Python gagal dimuat",
};

const RUNTIME_CLASS: Record<RuntimeState, string> = {
  booting: "bg-amber-50 text-amber-700 ring-amber-200",
  ready: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  error: "bg-rose-50 text-rose-700 ring-rose-200",
};

const DEFAULT_CODE = `# Tulis kodemu di sini
print("Halo, dunia!")
`;

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function TugasWorkspace({
  tugasId,
  starterCode,
  maxScore,
  minScore,
  repeatUntilPass,
  attemptsLeft,
  attemptsUsed,
  closed,
  initialCooldownUntil,
  expectedOutput,
  blockCopyPaste,
}: {
  tugasId: number;
  starterCode: string;
  maxScore: number;
  minScore: number | null;
  repeatUntilPass: boolean;
  attemptsLeft: number;
  attemptsUsed: number;
  closed: boolean;
  initialCooldownUntil: string | null;
  expectedOutput: string;
  blockCopyPaste: boolean;
}) {
  const router = useRouter();
  const draftKey = `kelasbit:tugas:${tugasId}:draft`;

  const [code, setCode] = useState(starterCode.trim() || DEFAULT_CODE);
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [runStatus, setRunStatus] = useState<LabRunStatus | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [runtime, setRuntime] = useState<RuntimeState>("booting");
  const [notice, setNotice] = useState<string | null>(null);
  const [copyBlocked, setCopyBlocked] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<{
    prompt: string;
    count: number;
  } | null>(null);
  const [lastRun, setLastRun] = useState<LastRun | null>(null);
  const [attempts, setAttempts] = useState(attemptsLeft);
  const [used, setUsed] = useState(attemptsUsed);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(
    initialCooldownUntil ? new Date(initialCooldownUntil).getTime() : null,
  );
  const [now, setNow] = useState(() => Date.now());
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [result, setResult] = useState<{
    score: number | null;
    passed: boolean | null;
    mandatoryFailed: boolean;
    criticalFailed: boolean;
    variableUsed: number;
    variableTotal: number;
  } | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef(0);
  const runningRef = useRef(false);
  const outputRef = useRef<{ stdout: string; stderr: string }>({
    stdout: "",
    stderr: "",
  });
  const answersRef = useRef<string[]>([]);
  const runCodeRef = useRef("");
  const draftLoadedRef = useRef(false);

  const appendOutput = useCallback((kind: OutputKind, text: string) => {
    const next = (outputRef.current[kind] + text).slice(0, MAX_OUTPUT);
    outputRef.current[kind] = next;
    if (kind === "stdout") setStdout(next);
    else setStderr(next);
  }, []);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const createWorker = useCallback(() => {
    workerRef.current?.terminate();
    setRuntime("booting");
    setPendingPrompt(null);

    const worker = new Worker("/lab/pyodide-worker.js");

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const data = event.data;

      if (data.type === "ready") {
        setRuntime("ready");
        return;
      }

      if (data.type === "needInput") {
        clearTimer();
        setPendingPrompt({ prompt: data.prompt, count: data.count });
        return;
      }

      if (data.type === "done") {
        clearTimer();
        runningRef.current = false;
        setRunning(false);
        setPendingPrompt(null);
        setRuntime("ready");
        setRunStatus(data.status);
        setDurationMs(data.durationMs);
        outputRef.current = { stdout: data.stdout, stderr: data.stderr };
        setStdout(data.stdout);
        setStderr(data.stderr);
        setLastRun({
          code: runCodeRef.current,
          answers: [...answersRef.current],
          stdout: data.stdout,
          stderr: data.stderr,
          status: data.status,
          metrics: data.metrics ?? null,
        });
        return;
      }

      if (data.type === "fatal") {
        clearTimer();
        runningRef.current = false;
        setRunning(false);
        setPendingPrompt(null);
        setRuntime("error");
        setNotice(`Python gagal dimuat: ${data.message}`);
      }
    };

    worker.onerror = () => {
      clearTimer();
      runningRef.current = false;
      setRunning(false);
      setPendingPrompt(null);
      setRuntime("error");
      setNotice("Terjadi masalah saat memuat Python. Coba muat ulang.");
    };

    workerRef.current = worker;
  }, [clearTimer]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as { code?: unknown };
        if (typeof draft.code === "string" && draft.code.trim()) {
          setCode(draft.code);
        }
      }
    } catch {
      // abaikan draft rusak
    }
    draftLoadedRef.current = true;
  }, [draftKey]);

  useEffect(() => {
    if (!draftLoadedRef.current) return;
    try {
      window.localStorage.setItem(draftKey, JSON.stringify({ code }));
    } catch {
      // localStorage penuh/diblokir
    }
  }, [code, draftKey]);

  useEffect(() => {
    createWorker();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [createWorker]);

  const startTimeout = useCallback(() => {
    clearTimer();
    startedAtRef.current = performance.now();
    timeoutRef.current = setTimeout(() => {
      runningRef.current = false;
      setRunning(false);
      setPendingPrompt(null);
      setRunStatus("timeout");
      setDurationMs(RUN_TIMEOUT_MS);
      appendOutput(
        "stderr",
        "\nWaktu eksekusi melebihi 5 detik. Program dihentikan.\n",
      );
      setLastRun({
        code: runCodeRef.current,
        answers: [...answersRef.current],
        stdout: "",
        stderr: "Waktu eksekusi melebihi 5 detik. Program dihentikan.",
        status: "timeout",
        metrics: null,
      });
      createWorker();
    }, RUN_TIMEOUT_MS);
  }, [appendOutput, clearTimer, createWorker]);

  function handleRun() {
    if (runningRef.current || runtime !== "ready" || !workerRef.current) return;
    if (closed || completed) return;
    if (cooldownUntil && cooldownUntil > Date.now()) return;
    if (!repeatUntilPass && attempts <= 0) return;

    answersRef.current = [];
    outputRef.current = { stdout: "", stderr: "" };
    runCodeRef.current = code;
    setStdout("");
    setStderr("");
    setRunStatus(null);
    setDurationMs(null);
    setNotice(null);
    setResult(null);
    setLastRun(null);
    setPendingPrompt(null);
    runningRef.current = true;
    setRunning(true);

    workerRef.current.postMessage({ type: "run", code, answers: [] });
    startTimeout();
  }

  function handleSubmitInput(value: string) {
    if (!workerRef.current) return;
    answersRef.current = [...answersRef.current, value];
    setPendingPrompt(null);
    workerRef.current.postMessage({
      type: "run",
      code: runCodeRef.current,
      answers: answersRef.current,
    });
    startTimeout();
  }

  function stopWith(status: "stopped", message: string) {
    if (!runningRef.current) return;
    clearTimer();
    runningRef.current = false;
    setRunning(false);
    setPendingPrompt(null);
    setRunStatus(status);
    appendOutput("stderr", `\n${message}\n`);
    setLastRun({
      code: runCodeRef.current,
      answers: [...answersRef.current],
      stdout: outputRef.current.stdout,
      stderr: outputRef.current.stderr,
      status,
      metrics: null,
    });
    workerRef.current?.terminate();
    createWorker();
  }

  function handleCancelPrompt() {
    stopWith("stopped", "Program dibatalkan saat meminta input.");
  }

  function handleStop() {
    stopWith("stopped", "Eksekusi dihentikan oleh pengguna.");
  }

  useEffect(() => {
    if (!cooldownUntil) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  const cooldownLeft = cooldownUntil
    ? Math.max(0, cooldownUntil - now)
    : 0;
  const cooldownActive = cooldownLeft > 0;
  const canAttempt =
    !closed &&
    !completed &&
    (repeatUntilPass || attempts > 0);
  const canRun = canAttempt && !cooldownActive;
  const codeFresh = lastRun !== null && lastRun.code === code;
  const canSubmit =
    canAttempt &&
    !cooldownActive &&
    !running &&
    !submitting &&
    codeFresh &&
    lastRun?.status === "success";

  async function handleSubmit() {
    if (!canSubmit || !lastRun) return;

    if (!window.confirm("Kumpulkan jawaban ini sekarang?")) return;

    setSubmitting(true);
    const response = await submitTugas({
      tugasId,
      code: lastRun.code,
      stdin: lastRun.answers.join("\n"),
      stdout: lastRun.stdout,
      stderr: lastRun.stderr,
      status: lastRun.status,
      metrics: lastRun.metrics,
    });
    setSubmitting(false);

    if (!response.ok) {
      setNotice(response.error);
      if (response.cooldownUntil) {
        setCooldownUntil(new Date(response.cooldownUntil).getTime());
      }
      return;
    }

    setUsed((value) => value + 1);
    if (response.attemptsLeft !== null) setAttempts(response.attemptsLeft);
    setCooldownUntil(
      response.cooldownUntil
        ? new Date(response.cooldownUntil).getTime()
        : null,
    );
    setResult({
      score: response.score,
      passed: response.passed,
      mandatoryFailed: response.mandatoryFailed,
      criticalFailed: response.criticalFailed,
      variableUsed: response.variableUsed,
      variableTotal: response.variableTotal,
    });
    if (response.passed === true) setCompleted(true);
    setLastRun(null);
    setShowResultModal(true);
  }

  function closeResultModal() {
    setShowResultModal(false);
    setResult(null);
    router.refresh();
  }

  function handleCopyBlocked() {
    setCopyBlocked(true);
    window.setTimeout(() => setCopyBlocked(false), 2000);
  }

  const submitHint = closed
    ? "Batas waktu sudah lewat."
    : completed
      ? "Kamu sudah lulus tugas ini."
      : cooldownActive
        ? `Istirahat dulu — coba lagi dalam ${formatRemaining(cooldownLeft)}.`
        : !repeatUntilPass && attempts <= 0
          ? "Percobaan sudah habis."
          : running
            ? "Tunggu program selesai."
            : !lastRun
              ? "Klik Run dulu sebelum mengumpulkan."
              : lastRun.status !== "success"
                ? "Perbaiki error/timeout dulu sebelum mengumpulkan."
                : lastRun.code !== code
                  ? "Kode berubah — klik Run lagi agar hasilnya sesuai."
                  : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(16,12,40,0.04)]">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ring-1 ${RUNTIME_CLASS[runtime]}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              runtime === "ready"
                ? "bg-emerald-500"
                : runtime === "booting"
                  ? "animate-pulse bg-amber-500"
                  : "bg-rose-500"
            }`}
          />
          {RUNTIME_LABEL[runtime]}
        </span>

        <span className="text-[11px] font-semibold text-slate-500">
          {repeatUntilPass ? (
            <>
              Percobaan ke-
              <span className="font-extrabold text-slate-700">
                {used + 1}
              </span>
            </>
          ) : (
            <>
              Sisa percobaan:{" "}
              <span className="font-extrabold text-slate-700">{attempts}</span>
            </>
          )}
        </span>
        {minScore !== null ? (
          <span className="text-[11px] font-semibold text-slate-500">
            KKM: <span className="font-extrabold text-slate-700">{minScore}</span>
          </span>
        ) : null}
        <span className="text-[11px] font-semibold text-slate-500">
          Nilai maks: <span className="font-extrabold text-slate-700">{maxScore}</span>
        </span>
        {cooldownActive ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold text-amber-800 ring-1 ring-amber-200">
            Istirahat {formatRemaining(cooldownLeft)}
          </span>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRun}
            disabled={running || runtime !== "ready" || !canRun}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </button>
          {running ? (
            <button
              type="button"
              onClick={handleStop}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-rose-700"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setCode(starterCode.trim() || DEFAULT_CODE);
              setLastRun(null);
              setResult(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[11px] font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {submitting ? "Mengumpulkan…" : "Kumpulkan"}
          </button>
        </div>
      </div>

      {notice ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </p>
      ) : null}

      {submitHint && (!result || cooldownActive) ? (
        <p className="text-[11px] font-medium text-slate-400">{submitHint}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
        <div className="overflow-hidden rounded-2xl border border-slate-800 shadow-[0_18px_40px_-30px_rgba(2,6,23,0.8)]">
          <header className="flex items-center justify-between border-b border-white/10 bg-[#21252b] px-3.5 py-2">
            <span className="flex items-center gap-2 font-mono text-[11px] font-semibold text-slate-300">
              <CodeXml className="h-3.5 w-3.5 text-emerald-300" />
              jawaban.py
            </span>
            <div className="flex items-center gap-1.5">
              {blockCopyPaste ? (
                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-rose-300 ring-1 ring-rose-400/20">
                  Copy/paste dikunci
                </span>
              ) : null}
              <span className="text-[10px] text-slate-500">
                Python 3 · Pyodide
              </span>
            </div>
          </header>
          {blockCopyPaste ? (
            <p className="border-b border-rose-200 bg-rose-50 px-3.5 py-2 text-[11px] font-bold text-rose-900">
              {copyBlocked
                ? "Aksi copy/paste diblokir untuk tugas ini."
                : "Copy, cut, paste, dan drag-drop dinonaktifkan untuk tugas ini."}
            </p>
          ) : null}
          <PythonEditor
            value={code}
            onChange={setCode}
            onRun={handleRun}
            blockCopyPaste={blockCopyPaste}
            onBlocked={handleCopyBlocked}
          />
        </div>

        <div className="space-y-4">
          <ConsolePanel
            stdout={stdout}
            stderr={stderr}
            status={runStatus}
            durationMs={durationMs}
            running={running}
            waitingForInput={pendingPrompt !== null}
            onClear={() => {
              outputRef.current = { stdout: "", stderr: "" };
              setStdout("");
              setStderr("");
              setRunStatus(null);
              setDurationMs(null);
            }}
          />

          {expectedOutput.trim() ? (
            <details
              open
              className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-[0_1px_2px_rgba(16,12,40,0.04)]"
            >
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 border-b border-emerald-100 bg-emerald-50 px-3.5 py-2.5">
                <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-emerald-800">
                  <Eye className="h-3.5 w-3.5" />
                  Output yang diharapkan
                </span>
                <span className="text-[10px] font-medium text-emerald-700/60">
                  Bandingkan dengan console
                </span>
              </summary>
              <pre className="max-h-72 overflow-auto whitespace-pre bg-white px-3.5 py-3 font-mono text-[11px] leading-relaxed text-slate-800">
                {expectedOutput}
              </pre>
            </details>
          ) : null}

          <p className="text-[11px] leading-relaxed text-slate-400">
            Kode dijalankan di browser. Hasil Run terakhir yang akan dikumpulkan
            harus berasal dari kode saat ini.
          </p>
        </div>
      </div>

      {result && showResultModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tugas-result-title"
            className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-[0_30px_80px_-20px_rgba(2,6,23,0.55)]"
          >
            <span
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ${
                result.passed === true
                  ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
                  : result.score === null
                    ? "bg-sky-50 text-sky-600 ring-sky-100"
                    : "bg-amber-50 text-amber-600 ring-amber-100"
              }`}
            >
              {result.passed === true ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : result.score === null ? (
                <Info className="h-7 w-7" />
              ) : (
                <AlertCircle className="h-7 w-7" />
              )}
            </span>

            <h2
              id="tugas-result-title"
              className="mt-4 text-xl font-extrabold tracking-tight text-slate-900"
            >
              {result.passed === true
                ? "Selamat, kamu lulus!"
                : result.criticalFailed
                  ? "Output belum bisa dinilai"
                  : result.mandatoryFailed
                    ? "Struktur wajib belum lengkap"
                    : result.score === null
                      ? "Jawaban terkumpul"
                      : "Belum lulus"}
            </h2>

            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              {result.score === null ? "—" : result.score}
              <span className="ml-1 text-sm font-bold text-slate-400">
                / {maxScore}
              </span>
            </p>

            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              {result.passed === true
                ? `Nilai kamu sudah mencapai KKM ${
                    minScore ?? 0
                  }. Tugas selesai.`
                : result.criticalFailed
                  ? "Variabel input belum dibuat dari input(). Nilai output belum dihitung."
                  : result.mandatoryFailed
                    ? result.variableTotal > 0 &&
                      result.variableUsed < result.variableTotal
                      ? `Variabel yang dipakai di print(): ${result.variableUsed} dari ${result.variableTotal}. Lengkapi semua variabel wajib.`
                      : "Nama variabel, jumlah input/print, atau aturan struktur lain belum sesuai. Periksa ketentuan tugas."
                    : result.score === null
                      ? "Jawabanmu sudah tersimpan. Menunggu penilaian guru."
                      : minScore !== null
                        ? `Nilai minimal lulus adalah ${minScore}. Silakan kerjakan ulang.`
                        : "Silakan kerjakan ulang jika ingin memperbaiki nilai."}
            </p>

            {cooldownActive && result.passed !== true ? (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
                Istirahat dulu {formatRemaining(cooldownLeft)} sebelum mencoba
                lagi.
              </p>
            ) : null}

            <button
              type="button"
              autoFocus
              onClick={closeResultModal}
              className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
            >
              Tutup
            </button>
          </div>
        </div>
      ) : null}

      {pendingPrompt ? (
        <InputPromptDialog
          prompt={pendingPrompt.prompt}
          count={pendingPrompt.count}
          onSubmit={handleSubmitInput}
          onCancel={handleCancelPrompt}
        />
      ) : null}
    </div>
  );
}
