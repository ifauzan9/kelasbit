export type TugasStructureRules = {
  enabled: boolean;
  exactInputs: number | null;
  minPrints: number | null;
  minOutputLines: number | null;
  requiredVariables: string[];
  inputVariables: string[];
  literalVariables: string[];
  forbidLoops: boolean;
  forbidConditionals: boolean;
};

export type TugasMetrics = {
  syntaxOk: boolean;
  inputCount: number;
  printCount: number;
  outputLines: number;
  assignedVariables: string[];
  inputVariables: string[];
  printedVariables: string[];
  literalVariables: string[];
  hasFor: boolean;
  hasWhile: boolean;
  hasIf: boolean;
};

export type TugasCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  /** Jika gagal, status tidak lulus meskipun nilai total mencukupi. */
  mandatory?: boolean;
  /** Jika gagal, nilai output dianggap 0 (anti-hardcode). */
  critical?: boolean;
  /** 0..1; dipakai untuk check dengan penilaian bertahap. */
  credit?: number;
  /** false = tidak ikut pembagi skor struktur (sudah dihitung terpisah). */
  scored?: boolean;
  used?: number;
  total?: number;
};

export const DEFAULT_STRUCTURE_RULES: TugasStructureRules = {
  enabled: false,
  exactInputs: null,
  minPrints: null,
  minOutputLines: null,
  requiredVariables: [],
  inputVariables: [],
  literalVariables: [],
  forbidLoops: false,
  forbidConditionals: false,
};

export const DEFAULT_STRUCTURE_WEIGHT = 40;

export const RETRY_COOLDOWN_EVERY = 5;
export const RETRY_COOLDOWN_MINUTES = 5;

const VAR_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function normalizeVariableList(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of values) {
    const value = raw.trim();
    if (!value || !VAR_NAME.test(value)) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }

  return result.slice(0, 30);
}

export function parseVariableInput(value: string): string[] {
  return normalizeVariableList(value.split(/[,;\n]/));
}

/**
 * Aturan lama tersimpan sebagai JSONB tanpa field baru. Lengkapi dengan default
 * agar tugas yang sudah ada tetap aman dibaca.
 */
export function normalizeStructureRules(
  value: TugasStructureRules | null | undefined,
): TugasStructureRules | null {
  if (!value || typeof value !== "object") return null;

  return {
    ...DEFAULT_STRUCTURE_RULES,
    ...value,
    requiredVariables: normalizeVariableList(
      Array.isArray(value.requiredVariables) ? value.requiredVariables : [],
    ),
    inputVariables: normalizeVariableList(
      Array.isArray(value.inputVariables) ? value.inputVariables : [],
    ),
    literalVariables: normalizeVariableList(
      Array.isArray(value.literalVariables) ? value.literalVariables : [],
    ),
  };
}

function variableSuggestion(
  name: string,
  assigned: Set<string>,
): string | null {
  const lower = name.toLowerCase();
  for (const candidate of assigned) {
    if (candidate !== name && candidate.toLowerCase() === lower) {
      return candidate;
    }
  }
  return null;
}

function missingVariableNote(
  missing: string[],
  assigned: Set<string>,
): string {
  const suggestions = missing
    .map((name) => {
      const suggestion = variableSuggestion(name, assigned);
      return suggestion ? `${name} → ${suggestion}` : null;
    })
    .filter((value): value is string => value !== null);

  return suggestions.length > 0
    ? ` Mungkin maksudnya: ${suggestions.join(", ")}.`
    : "";
}

/** Ubah metrik AST menjadi checklist yang bisa ditampilkan ke guru. */
export function evaluateStructure(
  rules: TugasStructureRules | null | undefined,
  metrics: TugasMetrics | null | undefined,
): TugasCheck[] {
  if (!rules?.enabled) return [];

  const checks: TugasCheck[] = [];
  const analyzed = metrics?.syntaxOk === true;
  const fallback = analyzed ? "" : "Kode belum bisa dianalisis (syntax error).";
  const requiredVariables = rules.requiredVariables ?? [];
  const inputVariables = rules.inputVariables ?? [];
  const literalVariables = rules.literalVariables ?? [];
  const printVariables = Array.from(
    new Set([...requiredVariables, ...inputVariables, ...literalVariables]),
  );
  const format = (value: number | null) =>
    value === null ? "" : String(value);

  if (rules.exactInputs !== null) {
    const count = metrics?.inputCount ?? 0;
    checks.push({
      id: "inputs",
      label: `Tepat ${format(rules.exactInputs)} input()`,
      mandatory: true,
      passed: analyzed && count === rules.exactInputs,
      detail: analyzed ? `Ditemukan ${count} input()` : fallback,
    });
  }

  if (rules.minPrints !== null) {
    const count = metrics?.printCount ?? 0;
    checks.push({
      id: "prints",
      label: `Minimal ${format(rules.minPrints)} print()`,
      mandatory: true,
      passed: analyzed && count >= rules.minPrints,
      detail: analyzed ? `Ditemukan ${count} print()` : fallback,
    });
  }

  if (rules.minOutputLines !== null) {
    const count = metrics?.outputLines ?? 0;
    checks.push({
      id: "output-lines",
      label: `Minimal ${format(rules.minOutputLines)} baris output`,
      mandatory: true,
      passed: analyzed && count >= rules.minOutputLines,
      detail: analyzed ? `Output berisi ${count} baris` : fallback,
    });
  }

  if (requiredVariables.length > 0) {
    const assigned = new Set(metrics?.assignedVariables ?? []);
    const missing = requiredVariables.filter((name) => !assigned.has(name));
    checks.push({
      id: "required-vars",
      label: "Variabel wajib (nama persis)",
      mandatory: true,
      passed: analyzed && missing.length === 0,
      detail:
        !analyzed
          ? fallback
          : missing.length === 0
            ? requiredVariables.join(", ")
            : `Belum ada: ${missing.join(", ")}. Nama harus sama persis.${missingVariableNote(missing, assigned)}`,
    });
  }

  if (inputVariables.length > 0) {
    const assigned = new Set(metrics?.assignedVariables ?? []);
    const fromInput = new Set(metrics?.inputVariables ?? []);
    const missing = inputVariables.filter((name) => !assigned.has(name));
    const notFromInput = inputVariables.filter(
      (name) => assigned.has(name) && !fromInput.has(name),
    );

    checks.push({
      id: "input-vars",
      label: "Variabel input (nama persis)",
      mandatory: true,
      critical: true,
      passed: analyzed && missing.length === 0 && notFromInput.length === 0,
      detail: !analyzed
        ? fallback
        : missing.length > 0
          ? `Belum dibuat: ${missing.join(", ")}. Nama harus sama persis.${missingVariableNote(missing, assigned)}`
          : notFromInput.length > 0
            ? `Bukan dari input(): ${notFromInput.join(", ")}`
            : inputVariables.join(", "),
    });
  }

  if (literalVariables.length > 0) {
    const assigned = new Set(metrics?.assignedVariables ?? []);
    const literals = new Set(metrics?.literalVariables ?? []);
    const notAssigned = literalVariables.filter((name) => !assigned.has(name));
    const notLiteral = literalVariables.filter(
      (name) => assigned.has(name) && !literals.has(name),
    );

    checks.push({
      id: "literal-vars",
      label: "Variabel nilai tetap (nama persis)",
      mandatory: true,
      passed:
        analyzed && notAssigned.length === 0 && notLiteral.length === 0,
      detail: !analyzed
        ? fallback
        : notAssigned.length > 0
          ? `Belum dibuat: ${notAssigned.join(", ")}. Nama harus sama persis.${missingVariableNote(notAssigned, assigned)}`
          : notLiteral.length > 0
            ? `Bukan string literal: ${notLiteral.join(", ")}`
            : literalVariables.join(", "),
    });
  }

  if (printVariables.length > 0) {
    const printed = new Set(metrics?.printedVariables ?? []);
    const used = printVariables.filter((name) => printed.has(name));
    const missing = printVariables.filter((name) => !printed.has(name));
    const credit = analyzed ? used.length / printVariables.length : 0;

    checks.push({
      id: "print-vars",
      label: "Variabel wajib dipakai di print()",
      mandatory: true,
      scored: false,
      credit,
      used: used.length,
      total: printVariables.length,
      passed: analyzed && missing.length === 0,
      detail: !analyzed
        ? fallback
        : missing.length > 0
          ? `Dipakai ${used.length}/${printVariables.length}: ${used.join(", ") || "—"}. Belum: ${missing.join(", ")}.`
          : `${used.length}/${printVariables.length}: ${used.join(", ")}`,
    });
  }

  if (rules.forbidLoops) {
    const hasLoop = metrics?.hasFor === true || metrics?.hasWhile === true;
    checks.push({
      id: "no-loops",
      label: "Tanpa for/while",
      mandatory: true,
      passed: analyzed && !hasLoop,
      detail: !analyzed ? fallback : hasLoop ? "Ditemukan perulangan" : "Tidak ada perulangan",
    });
  }

  if (rules.forbidConditionals) {
    const hasIf = metrics?.hasIf === true;
    checks.push({
      id: "no-conditionals",
      label: "Tanpa if/else",
      mandatory: true,
      passed: analyzed && !hasIf,
      detail: !analyzed ? fallback : hasIf ? "Ditemukan percabangan" : "Tidak ada percabangan",
    });
  }

  return checks;
}
