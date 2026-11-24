"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CodeXml,
  Play,
  RotateCcw,
  Save,
  Square,
} from "@/components/icons";
import { ConsolePanel } from "@/components/lab/console-panel";
import {
  DEFAULT_LAB_CODE,
  LAB_EXAMPLES,
  findLabExample,
} from "@/components/lab/examples";
import { InputPromptDialog } from "@/components/lab/input-prompt-dialog";
import { RunHistory } from "@/components/lab/run-history";
import type { LabRunStatus } from "@/lib/db/schema";
import { deleteLabRun, saveLabRun } from "@/lib/lab/actions";
import type { LabRunView } from "@/lib/lab/types";

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
const LEGACY_DRAFT_KEY = "kelasbit:lab:draft";
const HISTORY_LIMIT = 20;

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

type PendingPrompt = {
  prompt: string;
  count: number;
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

export function LabWorkspace({
  initialRuns,
  draftOwnerId,
}: {
  initialRuns: LabRunView[];
  draftOwnerId: number;
}) {
  const draftKey = `kelasbit:lab:${draftOwnerId}:draft`;
  const [code, setCode] = useState(DEFAULT_LAB_CODE);
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [runStatus, setRunStatus] = useState<LabRunStatus | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [runtime, setRuntime] = useState<RuntimeState>("booting");
  const [notice, setNotice] = useState<string | null>(null);
  const [runs, setRuns] = useState<LabRunView[]>(
    initialRuns.slice(0, HISTORY_LIMIT),
  );
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingRun, setSavingRun] = useState(false);
  const [exampleId, setExampleId] = useState(LAB_EXAMPLES[0].id);
  const [pendingPrompt, setPendingPrompt] = useState<PendingPrompt | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const runCounterRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef(0);
  const runningRef = useRef(false);
  const outputRef = useRef<{ stdout: string; stderr: string }>({
    stdout: "",
    stderr: "",
  });
  const answersRef = useRef<string[]>([]);
  const activeRunRef = useRef<{ id: number; code: string } | null>(null);
  const draftLoadedRef = useRef(false);

  const appendOutput = useCallback((kind: OutputKind, text: string) => {
    const next = (outputRef.current[kind] + text).slice(0, MAX_OUTPUT);
    outputRef.current[kind] = next;

    if (kind === "stdout") setStdout(next);
    else setStderr(next);
  }, []);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const persistRun = useCallback(
    async (
      status: LabRunStatus,
      duration: number | null,
    ): Promise<boolean> => {
      const active = activeRunRef.current;
      if (!active) return false;

      const result = await saveLabRun({
        code: active.code,
        stdin: answersRef.current.join("\n"),
        stdout: outputRef.current.stdout,
        stderr: outputRef.current.stderr,
        status,
        durationMs: duration,
      });

      if (!result.ok) {
        setNotice(result.error);
        return false;
      }

      setRuns((previous) =>
        [
          result.run,
          ...previous.filter((item) => item.id !== result.run.id),
        ].slice(0, HISTORY_LIMIT),
      );
      setActiveRunId(result.run.id);
      return true;
    },
    [],
  );

  async function handleSaveRun() {
    if (
      runningRef.current ||
      savingRun ||
      activeRunId !== null ||
      runStatus === null ||
      !activeRunRef.current
    ) {
      return;
    }

    setSavingRun(true);
    setNotice(null);
    const saved = await persistRun(runStatus, durationMs);
    setSavingRun(false);
    if (saved) setNotice("Riwayat berhasil disimpan.");
  }

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
        clearTimeoutRef();
        setPendingPrompt({ prompt: data.prompt, count: data.count });
        return;
      }

      if (data.type === "done") {
        clearTimeoutRef();
        runningRef.current = false;
        setRunning(false);
        setPendingPrompt(null);
        setRuntime("ready");
        setRunStatus(data.status);
        setDurationMs(data.durationMs);
        outputRef.current = {
          stdout: data.stdout,
          stderr: data.stderr,
        };
        setStdout(data.stdout);
        setStderr(data.stderr);
        return;
      }

      if (data.type === "fatal") {
        clearTimeoutRef();
        runningRef.current = false;
        setRunning(false);
        setPendingPrompt(null);
        setRuntime("error");
        setNotice(`Python gagal dimuat: ${data.message}`);
      }
    };

    worker.onerror = () => {
      clearTimeoutRef();
      runningRef.current = false;
      setRunning(false);
      setPendingPrompt(null);
      setRuntime("error");
      setNotice("Terjadi masalah saat memuat Python. Coba muat ulang.");
    };

    workerRef.current = worker;
  }, [clearTimeoutRef]);

  const startTimeout = useCallback(() => {
    clearTimeoutRef();
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
      createWorker();
    }, RUN_TIMEOUT_MS);
  }, [appendOutput, clearTimeoutRef, createWorker]);

  const finishInterruptedRun = useCallback(
    (status: "timeout" | "stopped", message: string) => {
      if (!runningRef.current) return;

      clearTimeoutRef();
      runningRef.current = false;
      setRunning(false);
      setPendingPrompt(null);
      setRunStatus(status);
      const duration = Math.max(
        0,
        Math.round(performance.now() - startedAtRef.current),
      );
      setDurationMs(duration);
      appendOutput("stderr", `\n${message}\n`);
      createWorker();
    },
    [appendOutput, clearTimeoutRef, createWorker],
  );

  const handleRun = useCallback(() => {
    if (runningRef.current || runtime !== "ready" || !workerRef.current) return;

    const id = runCounterRef.current + 1;
    runCounterRef.current = id;
    activeRunRef.current = { id, code };
    answersRef.current = [];
    outputRef.current = { stdout: "", stderr: "" };
    setStdout("");
    setStderr("");
    setRunStatus(null);
    setDurationMs(null);
    setNotice(null);
    setActiveRunId(null);
    setPendingPrompt(null);
    runningRef.current = true;
    setRunning(true);

    workerRef.current.postMessage({
      type: "run",
      id,
      code,
      answers: [],
    });

    startTimeout();
  }, [code, runtime, startTimeout]);

  const handleSubmitInput = useCallback(
    (value: string) => {
      const active = activeRunRef.current;
      if (!active || !workerRef.current) return;

      answersRef.current = [...answersRef.current, value];
      setPendingPrompt(null);
      workerRef.current.postMessage({
        type: "run",
        id: active.id,
        code: active.code,
        answers: answersRef.current,
      });
      startTimeout();
    },
    [startTimeout],
  );

  const handleCancelPrompt = useCallback(() => {
    if (!runningRef.current) return;

    clearTimeoutRef();
    runningRef.current = false;
    setRunning(false);
    setPendingPrompt(null);
    setRunStatus("stopped");
    const duration = Math.max(
      0,
      Math.round(performance.now() - startedAtRef.current),
    );
    setDurationMs(duration);
    appendOutput("stderr", "\nProgram dibatalkan saat meminta input.\n");

    workerRef.current?.terminate();
    createWorker();
  }, [appendOutput, clearTimeoutRef, createWorker]);

  const handleStop = useCallback(() => {
    finishInterruptedRun("stopped", "Eksekusi dihentikan oleh pengguna.");
  }, [finishInterruptedRun]);

  const handleClear = useCallback(() => {
    outputRef.current = { stdout: "", stderr: "" };
    setStdout("");
    setStderr("");
    setRunStatus(null);
    setDurationMs(null);
  }, []);

  useEffect(() => {
    try {
      // Bersihkan draft lama yang belum dipisah per siswa.
      window.localStorage.removeItem(LEGACY_DRAFT_KEY);
      const raw = window.localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as { code?: unknown };
        if (typeof draft.code === "string" && draft.code.trim()) {
          setCode(draft.code);
        }
      }
    } catch {
      // Draft rusak diabaikan.
    }

    draftLoadedRef.current = true;
  }, [draftKey]);

  useEffect(() => {
    if (!draftLoadedRef.current) return;

    try {
      window.localStorage.setItem(draftKey, JSON.stringify({ code }));
    } catch {
      // localStorage penuh/diblokir: draft tidak disimpan.
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

  function handleExampleChange(id: string) {
    const example = findLabExample(id);
    if (!example) return;

    setExampleId(id);
    setCode(example.code);
    setActiveRunId(null);
    activeRunRef.current = null;
    setRunStatus(null);
    setDurationMs(null);
    setNotice(null);
  }

  function handleReset() {
    const example = findLabExample(exampleId) ?? LAB_EXAMPLES[0];
    setCode(example.code);
    setActiveRunId(null);
    activeRunRef.current = null;
    handleClear();
  }

  function handleSelectRun(run: LabRunView) {
    if (runningRef.current) {
      setNotice("Hentikan run yang sedang berjalan dulu.");
      return;
    }

    setCode(run.code);
    setStdout(run.stdout);
    setStderr(run.stderr);
    outputRef.current = { stdout: run.stdout, stderr: run.stderr };
    answersRef.current = [];
    setRunStatus(run.status);
    setDurationMs(run.durationMs);
    setActiveRunId(run.id);
    setNotice(
      run.stdin
        ? "Riwayat dimuat. Input lama tidak dipakai otomatis — jawab lagi saat Run."
        : null,
    );
  }

  async function handleDeleteRun(id: number) {
    setDeletingId(id);
    const result = await deleteLabRun(id);
    setDeletingId(null);

    if (!result.ok) {
      setNotice(result.error ?? "Gagal menghapus riwayat.");
      return;
    }

    setRuns((previous) => previous.filter((item) => item.id !== id));
    if (activeRunId === id) setActiveRunId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(16,12,40,0.04)]">
        <label
          htmlFor="lab-example"
          className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500"
        >
          Contoh
        </label>
        <select
          id="lab-example"
          value={exampleId}
          onChange={(event) => handleExampleChange(event.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        >
          {LAB_EXAMPLES.map((example) => (
            <option key={example.id} value={example.id}>
              {example.label}
            </option>
          ))}
        </select>

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

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSaveRun}
            disabled={
              running ||
              savingRun ||
              activeRunId !== null ||
              runStatus === null
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {savingRun
              ? "Menyimpan…"
              : activeRunId !== null
                ? "Tersimpan"
                : "Simpan Riwayat"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={running}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>

          {running ? (
            <button
              type="button"
              onClick={handleStop}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-rose-700"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRun}
              disabled={runtime !== "ready"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              Run
            </button>
          )}
        </div>
      </div>

      {notice ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-800 shadow-[0_18px_40px_-30px_rgba(2,6,23,0.8)]">
            <header className="flex items-center justify-between border-b border-white/10 bg-[#21252b] px-3.5 py-2">
              <span className="flex items-center gap-2 font-mono text-[11px] font-semibold text-slate-300">
                <CodeXml className="h-3.5 w-3.5 text-emerald-300" />
                main.py
              </span>
              <span className="text-[10px] text-slate-500">
                Python 3 · Pyodide
              </span>
            </header>

            <PythonEditor value={code} onChange={setCode} onRun={handleRun} />
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(16,12,40,0.04)]">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
              Cara kerja input
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
              Saat kode memanggil <code className="font-mono">input()</code>,
              kotak jawaban akan muncul otomatis. Setiap jawaban dipakai untuk
              melanjutkan program sampai selesai.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <ConsolePanel
            stdout={stdout}
            stderr={stderr}
            status={runStatus}
            durationMs={durationMs}
            running={running}
            waitingForInput={pendingPrompt !== null}
            onClear={handleClear}
          />

          <RunHistory
            runs={runs}
            activeId={activeRunId}
            onSelect={handleSelectRun}
            onDelete={handleDeleteRun}
            deletingId={deletingId}
          />
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
        Run tidak disimpan otomatis. Klik <span className="font-bold text-slate-500">Simpan Riwayat</span>{" "}
        untuk menyimpan hasil Run terakhir. Python berjalan di browser — kode
        tidak dieksekusi di server.
      </p>

      {runtime === "error" ? (
        <button
          type="button"
          onClick={createWorker}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
        >
          Muat ulang Python
        </button>
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
