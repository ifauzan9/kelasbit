"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CodeXml,
  Play,
  RotateCcw,
  Square,
} from "@/components/icons";
import { ConsolePanel } from "@/components/lab/console-panel";
import { InputPromptDialog } from "@/components/lab/input-prompt-dialog";
import type { LabRunStatus } from "@/lib/db/schema";
import { submitTugas } from "@/lib/tugas/actions";

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
    }
  | { type: "fatal"; message: string };

type LastRun = {
  code: string;
  answers: string[];
  stdout: string;
  stderr: string;
  status: LabRunStatus;
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

export function TugasWorkspace({
  tugasId,
  starterCode,
  maxScore,
  attemptsLeft,
  closed,
}: {
  tugasId: number;
  starterCode: string;
  maxScore: number;
  attemptsLeft: number;
  closed: boolean;
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
  const [pendingPrompt, setPendingPrompt] = useState<{
    prompt: string;
    count: number;
  } | null>(null);
  const [lastRun, setLastRun] = useState<LastRun | null>(null);
  const [attempts, setAttempts] = useState(attemptsLeft);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number | null;
    attemptsLeft: number;
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
      });
      createWorker();
    }, RUN_TIMEOUT_MS);
  }, [appendOutput, clearTimer, createWorker]);

  function handleRun() {
    if (runningRef.current || runtime !== "ready" || !workerRef.current) return;

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

  const canAttempt = attempts > 0 && !closed;
  const codeFresh = lastRun !== null && lastRun.code === code;
  const canSubmit =
    canAttempt &&
    !running &&
    !submitting &&
    codeFresh &&
    lastRun?.status === "success";

  async function handleSubmit() {
    if (!canSubmit || !lastRun) return;

    if (
      !window.confirm(
        `Kumpulkan jawaban ini? Sisa percobaan sebelum submit: ${attempts}.`,
      )
    ) {
      return;
    }

    setSubmitting(true);
    const response = await submitTugas({
      tugasId,
      code: lastRun.code,
      stdin: lastRun.answers.join("\n"),
      stdout: lastRun.stdout,
      stderr: lastRun.stderr,
      status: lastRun.status,
    });
    setSubmitting(false);

    if (!response.ok) {
      setNotice(response.error);
      return;
    }

    setAttempts(response.attemptsLeft);
    setResult({
      score: response.score,
      attemptsLeft: response.attemptsLeft,
    });
    setLastRun(null);
    router.refresh();
  }

  const submitHint = closed
    ? "Batas waktu sudah lewat."
    : attempts <= 0
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
          Sisa percobaan: <span className="font-extrabold text-slate-700">{attempts}</span>
        </span>
        <span className="text-[11px] font-semibold text-slate-500">
          Nilai maks: <span className="font-extrabold text-slate-700">{maxScore}</span>
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRun}
            disabled={running || runtime !== "ready" || !canAttempt}
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

      {result ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {result.score === null
            ? "Jawaban terkumpul. Menunggu penilaian guru."
            : `Jawaban terkumpul. Nilai otomatis: ${result.score} / ${maxScore}.`}
        </p>
      ) : null}

      {submitHint && !result ? (
        <p className="text-[11px] font-medium text-slate-400">{submitHint}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
        <div className="overflow-hidden rounded-2xl border border-slate-800 shadow-[0_18px_40px_-30px_rgba(2,6,23,0.8)]">
          <header className="flex items-center justify-between border-b border-white/10 bg-[#21252b] px-3.5 py-2">
            <span className="flex items-center gap-2 font-mono text-[11px] font-semibold text-slate-300">
              <CodeXml className="h-3.5 w-3.5 text-emerald-300" />
              jawaban.py
            </span>
            <span className="text-[10px] text-slate-500">Python 3 · Pyodide</span>
          </header>
          <PythonEditor value={code} onChange={setCode} onRun={handleRun} />
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
          <p className="text-[11px] leading-relaxed text-slate-400">
            Kode dijalankan di browser. Hasil Run terakhir yang akan dikumpulkan
            harus berasal dari kode saat ini.
          </p>
        </div>
      </div>

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
