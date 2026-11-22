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

const METRICS_SCRIPT = `
import ast as __kelasbit_ast
import json as __kelasbit_json

__kelasbit_result = {
    "syntaxOk": False,
    "inputCount": 0,
    "printCount": 0,
    "outputLines": len([
        __line for __line in __kelasbit_stdout.splitlines() if __line.strip()
    ]),
    "assignedVariables": [],
    "inputVariables": [],
    "printedVariables": [],
    "literalVariables": [],
    "hasFor": False,
    "hasWhile": False,
    "hasIf": False,
}

try:
    __kelasbit_tree = __kelasbit_ast.parse(__kelasbit_code)
except SyntaxError:
    __kelasbit_json.dumps(__kelasbit_result)
else:
    __kelasbit_result["syntaxOk"] = True
    __kelasbit_assigned = set()
    __kelasbit_literals = set()
    __kelasbit_input_vars = set()
    __kelasbit_printed = set()

    def __kelasbit_target_names(target):
        if isinstance(target, __kelasbit_ast.Name):
            return [target.id]
        if isinstance(target, (__kelasbit_ast.Tuple, __kelasbit_ast.List)):
            names = []
            for item in target.elts:
                names.extend(__kelasbit_target_names(item))
            return names
        return []

    def __kelasbit_uses_input(value):
        if value is None:
            return False
        for item in __kelasbit_ast.walk(value):
            if (
                isinstance(item, __kelasbit_ast.Call)
                and isinstance(item.func, __kelasbit_ast.Name)
                and item.func.id == "input"
            ):
                return True
        return False

    def __kelasbit_is_string_literal(value):
        return (
            value is not None
            and isinstance(value, __kelasbit_ast.Constant)
            and isinstance(value.value, str)
        )

    def __kelasbit_collect_printed(node):
        if any(keyword.arg == "file" for keyword in node.keywords):
            return
        for arg in node.args:
            if arg is None:
                continue
            for part in __kelasbit_ast.walk(arg):
                if isinstance(part, __kelasbit_ast.Name):
                    __kelasbit_printed.add(part.id)
        for keyword in node.keywords:
            if keyword.value is None:
                continue
            for part in __kelasbit_ast.walk(keyword.value):
                if isinstance(part, __kelasbit_ast.Name):
                    __kelasbit_printed.add(part.id)

    for __node in __kelasbit_ast.walk(__kelasbit_tree):
        if isinstance(__node, __kelasbit_ast.Call) and isinstance(
            __node.func, __kelasbit_ast.Name
        ):
            if __node.func.id == "input":
                __kelasbit_result["inputCount"] += 1
            elif __node.func.id == "print":
                __kelasbit_result["printCount"] += 1
                __kelasbit_collect_printed(__node)

        if isinstance(__node, __kelasbit_ast.Assign):
            names = []
            for target in __node.targets:
                names.extend(__kelasbit_target_names(target))
            for name in names:
                __kelasbit_assigned.add(name)
                if __kelasbit_uses_input(__node.value):
                    __kelasbit_input_vars.add(name)
                if __kelasbit_is_string_literal(__node.value):
                    __kelasbit_literals.add(name)
        elif isinstance(__node, __kelasbit_ast.AnnAssign):
            names = __kelasbit_target_names(__node.target)
            for name in names:
                __kelasbit_assigned.add(name)
                if __kelasbit_uses_input(__node.value):
                    __kelasbit_input_vars.add(name)
                if __kelasbit_is_string_literal(__node.value):
                    __kelasbit_literals.add(name)

        if isinstance(__node, (__kelasbit_ast.For, __kelasbit_ast.AsyncFor)):
            __kelasbit_result["hasFor"] = True
        if isinstance(__node, __kelasbit_ast.While):
            __kelasbit_result["hasWhile"] = True
        if isinstance(__node, (__kelasbit_ast.If, __kelasbit_ast.IfExp)):
            __kelasbit_result["hasIf"] = True

    __kelasbit_result["assignedVariables"] = sorted(__kelasbit_assigned)
    __kelasbit_result["inputVariables"] = sorted(__kelasbit_input_vars)
    __kelasbit_result["printedVariables"] = sorted(__kelasbit_printed)
    __kelasbit_result["literalVariables"] = sorted(__kelasbit_literals)

__kelasbit_json.dumps(__kelasbit_result)
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

async function collectMetrics(pyodide, code, stdout) {
  try {
    pyodide.globals.set("__kelasbit_code", String(code ?? ""));
    pyodide.globals.set("__kelasbit_stdout", String(stdout ?? ""));
    const raw = await pyodide.runPythonAsync(METRICS_SCRIPT);
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
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

  const metrics = await collectMetrics(
    await getPyodide(),
    message.code,
    stdoutBuffer,
  );

  post("done", {
    id,
    status,
    durationMs: Math.round(performance.now() - startedAt),
    stdout: stdoutBuffer,
    stderr: stderrBuffer,
    metrics,
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
