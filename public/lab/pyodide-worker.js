/**
 * Web Worker Pyodide untuk Lab Coding Python KelasBit.
 * Kode siswa tidak pernah dikirim ke server; semuanya berjalan di browser.
 *
 * Alur input interaktif:
 * - `input()` mengambil jawaban dari `answers` yang dikirim UI.
 * - Jika jawaban habis, worker mengirim `needInput` lalu berhenti.
 * - UI menampilkan modal, lalu mengirim ulang kode dengan jawaban baru.
 * - Output hanya dikirim saat percobaan terakhir selesai (yang tidak
 *   membutuhkan input lagi).
 */

const PYODIDE_VERSION = "0.27.2";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const MAX_OUTPUT = 20_000;
const MAX_INPUTS = 50;

const INPUT_PREAMBLE = `
import builtins as __kelasbit_builtins

__kelasbit_answer_index = 0
__kelasbit_pending_prompt = None

class __KelasbitNeedInput(BaseException):
    pass

def __kelasbit_input(prompt=""):
    global __kelasbit_answer_index, __kelasbit_pending_prompt
    if __kelasbit_answer_index >= len(__kelasbit_answers):
        __kelasbit_pending_prompt = "" if prompt is None else str(prompt)
        raise __KelasbitNeedInput()
    value = __kelasbit_answers[__kelasbit_answer_index]
    __kelasbit_answer_index += 1
    return value

__kelasbit_builtins.input = __kelasbit_input
`;

let pyodidePromise = null;
let stdoutDecoder = new TextDecoder();
let stderrDecoder = new TextDecoder();
let stdoutBuffer = "";
let stderrBuffer = "";

function post(type, payload = {}) {
  self.postMessage({ type, ...payload });
}

function appendOutput(kind, text) {
  if (!text) return;

  if (kind === "stdout") {
    stdoutBuffer = (stdoutBuffer + text).slice(0, MAX_OUTPUT);
  } else {
    stderrBuffer = (stderrBuffer + text).slice(0, MAX_OUTPUT);
  }
}

function writeStream(kind, buffer) {
  const decoder = kind === "stdout" ? stdoutDecoder : stderrDecoder;
  const text = decoder.decode(buffer, { stream: true });
  appendOutput(kind, text);
  return buffer.length;
}

async function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      importScripts(`${PYODIDE_BASE}pyodide.js`);
      const pyodide = await loadPyodide({ indexURL: PYODIDE_BASE });

      // Write handler mempertahankan newline & teks parsial (prompt input).
      pyodide.setStdout({
        write: (buffer) => writeStream("stdout", buffer),
      });
      pyodide.setStderr({
        write: (buffer) => writeStream("stderr", buffer),
      });

      return pyodide;
    })();
  }

  return pyodidePromise;
}

async function runAttempt(message) {
  const startedAt = performance.now();
  let status = "success";

  stdoutBuffer = "";
  stderrBuffer = "";
  stdoutDecoder = new TextDecoder();
  stderrDecoder = new TextDecoder();

  const answers = Array.isArray(message.answers)
    ? message.answers.map((value) => String(value))
    : [];

  const id = message.id;

  try {
    const pyodide = await getPyodide();

    pyodide.globals.set("__kelasbit_answers", pyodide.toPy(answers));
    await pyodide.runPythonAsync(INPUT_PREAMBLE);

    try {
      await pyodide.runPythonAsync(String(message.code ?? ""));
    } catch (error) {
      const pending = pyodide.globals.get("__kelasbit_pending_prompt");
      const needsInput = pending !== undefined && pending !== null;

      if (needsInput && answers.length < MAX_INPUTS) {
        pyodide.globals.set("__kelasbit_pending_prompt", null);
        post("needInput", {
          id,
          prompt: String(pending),
          count: answers.length + 1,
        });
        return;
      }

      if (needsInput) {
        appendOutput(
          "stderr",
          `Terlalu banyak input (maksimal ${MAX_INPUTS} per run).\n`,
        );
      } else {
        const messageText =
          error && typeof error.message === "string"
            ? error.message
            : String(error);
        appendOutput("stderr", `${messageText}\n`);
      }

      status = "error";
    }
  } catch (error) {
    status = "error";
    const messageText =
      error && typeof error.message === "string"
        ? error.message
        : String(error);
    appendOutput("stderr", `${messageText}\n`);
  }

  const stdoutRest = stdoutDecoder.decode();
  if (stdoutRest) appendOutput("stdout", stdoutRest);
  const stderrRest = stderrDecoder.decode();
  if (stderrRest) appendOutput("stderr", stderrRest);

  post("done", {
    id,
    status,
    durationMs: Math.round(performance.now() - startedAt),
    stdout: stdoutBuffer,
    stderr: stderrBuffer,
  });
}

self.onmessage = async (event) => {
  const message = event.data;

  if (!message || message.type !== "run") return;

  try {
    await runAttempt(message);
  } catch (error) {
    post("fatal", {
      id: message.id,
      message: error && error.message ? String(error.message) : String(error),
    });
  }
};

getPyodide()
  .then(() => post("ready"))
  .catch((error) => {
    post("fatal", {
      message:
        error && error.message
          ? String(error.message)
          : "Gagal memuat Python (Pyodide).",
    });
  });
