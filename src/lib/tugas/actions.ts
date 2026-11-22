"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  kelas,
  tugas,
  tugasSubmissions,
  tugasTargets,
  users,
  type LabRunStatus,
  type TugasJenis,
  type TugasTargetType,
} from "@/lib/db/schema";
import { computeAutoGrade } from "@/lib/tugas/grading";
import {
  DEFAULT_STRUCTURE_WEIGHT,
  RETRY_COOLDOWN_EVERY,
  RETRY_COOLDOWN_MINUTES,
  parseVariableInput,
  type TugasMetrics,
  type TugasStructureRules,
} from "@/lib/tugas/rules";
import { parseJakartaDateTime } from "@/lib/settings/maintenance";

const MAX_CODE = 50_000;
const MAX_OUTPUT = 20_000;
const JENIS: TugasJenis[] = ["tugas", "ulangan", "remedial"];
const TARGET_TYPES: TugasTargetType[] = ["semua", "kelas", "siswa"];
const STATUSES: LabRunStatus[] = ["success", "error", "timeout", "stopped"];

export type TugasFormState = {
  error?: string;
  success?: boolean;
  stamp?: number;
};

function parseId(value: FormDataEntryValue | null): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function clampText(value: FormDataEntryValue | null, max: number): string {
  return String(value ?? "").slice(0, max);
}

function sanitizeMetrics(value: unknown): TugasMetrics | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const number = (key: string) => {
    const parsed = Number(raw[key]);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(Math.round(parsed), 100_000)) : 0;
  };
  const list = (key: string) =>
    Array.isArray(raw[key])
      ? (raw[key] as unknown[])
          .filter((item): item is string => typeof item === "string")
          .slice(0, 200)
      : [];

  return {
    syntaxOk: raw.syntaxOk === true,
    inputCount: number("inputCount"),
    printCount: number("printCount"),
    outputLines: number("outputLines"),
    assignedVariables: list("assignedVariables"),
    inputVariables: list("inputVariables"),
    printedVariables: list("printedVariables"),
    literalVariables: list("literalVariables"),
    hasFor: raw.hasFor === true,
    hasWhile: raw.hasWhile === true,
    hasIf: raw.hasIf === true,
  };
}

function validateJenis(value: string): value is TugasJenis {
  return JENIS.includes(value as TugasJenis);
}

export async function createTugas(
  _prevState: TugasFormState,
  formData: FormData,
): Promise<TugasFormState> {
  await requireUser("guru");

  const title = String(formData.get("title") ?? "").trim();
  const description = clampText(formData.get("description"), 5_000);
  const jenisRaw = String(formData.get("jenis") ?? "tugas");
  const targetTypeRaw = String(formData.get("targetType") ?? "semua");
  const kelasIdInput = parseId(formData.get("kelasId"));
  const targetUserIds = Array.from(
    new Set(
      formData
        .getAll("targetUserIds")
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  );
  const starterCode = clampText(formData.get("starterCode"), MAX_CODE);
  const expectedOutput = clampText(formData.get("expectedOutput"), MAX_OUTPUT);
  const solutionCode = clampText(formData.get("solutionCode"), MAX_CODE);
  const maxScore = Number(formData.get("maxScore") ?? 100);
  const maxAttempts = Number(formData.get("maxAttempts") ?? 3);
  const minScoreRaw = String(formData.get("minScore") ?? "").trim();
  const repeatUntilPass = formData.get("repeatUntilPass") === "true";
  const structureEnabled = formData.get("structureEnabled") === "true";
  const structureWeight = Number(
    formData.get("structureWeight") ?? DEFAULT_STRUCTURE_WEIGHT,
  );
  const exactInputsRaw = String(formData.get("exactInputs") ?? "").trim();
  const minPrintsRaw = String(formData.get("minPrints") ?? "").trim();
  const minOutputLinesRaw = String(
    formData.get("minOutputLines") ?? "",
  ).trim();
  const exactInputs = exactInputsRaw ? Number(exactInputsRaw) : null;
  const minPrints = minPrintsRaw ? Number(minPrintsRaw) : null;
  const minOutputLines = minOutputLinesRaw ? Number(minOutputLinesRaw) : null;
  const requiredVariables = parseVariableInput(
    String(formData.get("requiredVariables") ?? ""),
  );
  const inputVariables = parseVariableInput(
    String(formData.get("inputVariables") ?? ""),
  );
  const literalVariables = parseVariableInput(
    String(formData.get("literalVariables") ?? ""),
  );
  const forbidLoops = formData.get("forbidLoops") === "true";
  const forbidConditionals =
    formData.get("forbidConditionals") === "true";
  const dueRaw = String(formData.get("dueAt") ?? "").trim();

  if (!title) return { error: "Judul tugas wajib diisi." };
  if (title.length > 160) return { error: "Judul maksimal 160 karakter." };
  if (!validateJenis(jenisRaw)) return { error: "Jenis tugas tidak valid." };
  if (!TARGET_TYPES.includes(targetTypeRaw as TugasTargetType)) {
    return { error: "Target tugas tidak valid." };
  }
  if (!Number.isInteger(maxScore) || maxScore < 1 || maxScore > 1000) {
    return { error: "Nilai maksimal harus 1–1000." };
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
    return { error: "Jumlah percobaan harus 1–10." };
  }
  if (
    !Number.isInteger(structureWeight) ||
    structureWeight < 0 ||
    structureWeight > 100
  ) {
    return { error: "Bobot struktur harus 0–100." };
  }

  let minScore: number | null = null;
  if (minScoreRaw) {
    minScore = Number(minScoreRaw);
    if (
      !Number.isInteger(minScore) ||
      minScore < 0 ||
      minScore > maxScore
    ) {
      return { error: `KKM harus 0–${maxScore}.` };
    }
  }

  if (repeatUntilPass && minScore === null) {
    return { error: "Isi KKM jika memilih ulangi sampai lulus." };
  }

  for (const [label, value] of [
    ["Jumlah input", exactInputs],
    ["Minimal print", minPrints],
    ["Minimal baris output", minOutputLines],
  ] as const) {
    if (
      value !== null &&
      (!Number.isInteger(value) || value < 0 || value > 100_000)
    ) {
      return { error: `${label} tidak valid.` };
    }
  }

  const variableConflict = inputVariables.filter((name) =>
    literalVariables.includes(name),
  );
  if (variableConflict.length > 0) {
    return {
      error: `Variabel tidak boleh sekaligus dari input dan nilai tetap: ${variableConflict.join(", ")}.`,
    };
  }

  const structureRules: TugasStructureRules | null = structureEnabled
    ? {
        enabled: true,
        exactInputs,
        minPrints,
        minOutputLines,
        requiredVariables,
        inputVariables,
        literalVariables,
        forbidLoops,
        forbidConditionals,
      }
    : null;

  if (
    structureEnabled &&
    exactInputs === null &&
    minPrints === null &&
    minOutputLines === null &&
    requiredVariables.length === 0 &&
    inputVariables.length === 0 &&
    literalVariables.length === 0 &&
    !forbidLoops &&
    !forbidConditionals
  ) {
    return { error: "Pilih minimal satu aturan struktur." };
  }

  const targetType = targetTypeRaw as TugasTargetType;
  let kelasId: number | null = null;
  let targets: number[] = [];

  if (targetType === "kelas") {
    if (kelasIdInput === null) {
      return { error: "Pilih kelas untuk target tugas." };
    }

    const [row] = await getDb()
      .select({ id: kelas.id })
      .from(kelas)
      .where(eq(kelas.id, kelasIdInput))
      .limit(1);

    if (!row) return { error: "Kelas yang dipilih tidak ditemukan." };

    kelasId = kelasIdInput;
  }

  if (targetType === "siswa") {
    if (targetUserIds.length === 0) {
      return { error: "Pilih minimal satu siswa." };
    }

    const found = await getDb()
      .select({ id: users.id })
      .from(users)
      .where(
        and(inArray(users.id, targetUserIds), eq(users.role, "siswa")),
      );

    if (found.length !== targetUserIds.length) {
      return { error: "Ada siswa yang tidak ditemukan." };
    }

    targets = targetUserIds;
  }

  let dueAt: Date | null = null;
  if (dueRaw) {
    dueAt = parseJakartaDateTime(dueRaw);
    if (!dueAt) return { error: "Format batas waktu tidak valid." };
    if (dueAt.getTime() <= Date.now()) {
      return { error: "Batas waktu harus setelah waktu sekarang (WIB)." };
    }
  }

  try {
    await getDb().transaction(async (tx) => {
      const [created] = await tx
        .insert(tugas)
        .values({
          title,
          description,
          jenis: jenisRaw,
          targetType,
          kelasId,
          starterCode,
          expectedOutput,
          solutionCode,
          maxScore,
          maxAttempts,
          minScore,
          repeatUntilPass,
          structureRules,
          structureWeight,
          dueAt,
        })
        .returning({ id: tugas.id });

      if (targets.length > 0) {
        await tx.insert(tugasTargets).values(
          targets.map((userId) => ({
            tugasId: created.id,
            userId,
          })),
        );
      }
    });
  } catch (error) {
    console.error("tugas: gagal membuat tugas", error);
    return { error: "Gagal menyimpan tugas. Coba lagi." };
  }

  return { success: true, stamp: Date.now() };
}

export async function deleteTugas(
  _prevState: TugasFormState,
  formData: FormData,
): Promise<TugasFormState> {
  await requireUser("guru");

  const id = parseId(formData.get("id"));
  if (!id) return { error: "Tugas tidak valid." };

  try {
    await getDb().delete(tugas).where(eq(tugas.id, id));
  } catch (error) {
    console.error("tugas: gagal menghapus tugas", error);
    return { error: "Gagal menghapus tugas. Coba lagi." };
  }

  return { success: true, stamp: Date.now() };
}

export type SubmitTugasInput = {
  tugasId: number;
  code: string;
  stdin: string;
  stdout: string;
  stderr: string;
  status: LabRunStatus;
  metrics: TugasMetrics | null;
};

export type SubmitTugasResult =
  | {
      ok: true;
      submissionId: number;
      score: number | null;
      passed: boolean | null;
      attemptsLeft: number | null;
      cooldownUntil: string | null;
      feedback: string | null;
      mandatoryFailed: boolean;
      criticalFailed: boolean;
      variableUsed: number;
      variableTotal: number;
    }
  | { ok: false; error: string; cooldownUntil?: string };

export async function submitTugas(
  input: SubmitTugasInput,
): Promise<SubmitTugasResult> {
  const user = await requireUser("siswa");

  if (!Number.isInteger(input.tugasId) || input.tugasId <= 0) {
    return { ok: false, error: "Tugas tidak valid." };
  }
  if (!STATUSES.includes(input.status)) {
    return { ok: false, error: "Status eksekusi tidak valid." };
  }

  const code = clampText(input.code, MAX_CODE);
  if (!code.trim()) {
    return { ok: false, error: "Kode masih kosong." };
  }

  const [assignment] = await getDb()
    .select()
    .from(tugas)
    .where(eq(tugas.id, input.tugasId))
    .limit(1);

  if (!assignment) return { ok: false, error: "Tugas tidak ditemukan." };

  const [student] = await getDb()
    .select({ kelasId: users.kelasId })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const studentKelasId = student?.kelasId ?? null;

  const targetType = assignment.targetType as TugasTargetType;
  let allowed = false;

  if (targetType === "semua") {
    allowed = true;
  } else if (targetType === "kelas") {
    allowed =
      assignment.kelasId !== null && assignment.kelasId === studentKelasId;
  } else if (targetType === "siswa") {
    const [target] = await getDb()
      .select({ id: tugasTargets.id })
      .from(tugasTargets)
      .where(
        and(
          eq(tugasTargets.tugasId, assignment.id),
          eq(tugasTargets.userId, user.id),
        ),
      )
      .limit(1);

    allowed = Boolean(target);
  }

  if (!allowed) {
    return { ok: false, error: "Tugas ini bukan untukmu." };
  }

  // Deadline selalu didahulukan, termasuk saat masa jeda.
  if (assignment.dueAt && assignment.dueAt.getTime() <= Date.now()) {
    return { ok: false, error: "Batas waktu pengumpulan sudah lewat." };
  }

  const attempts = await getDb()
    .select({
      score: tugasSubmissions.score,
      passed: tugasSubmissions.passed,
      submittedAt: tugasSubmissions.submittedAt,
    })
    .from(tugasSubmissions)
    .where(
      and(
        eq(tugasSubmissions.tugasId, assignment.id),
        eq(tugasSubmissions.userId, user.id),
      ),
    )
    .orderBy(desc(tugasSubmissions.submittedAt), desc(tugasSubmissions.id));

  const attemptsUsed = attempts.length;
  const repeatUntilPass =
    assignment.repeatUntilPass && assignment.minScore !== null;
  const alreadyPassed = attempts.some((item) => item.passed === true);

  if (repeatUntilPass && alreadyPassed) {
    return {
      ok: false,
      error: "Kamu sudah lulus tugas ini. Tidak perlu mengulang.",
    };
  }

  // Jeda setelah percobaan ke-5, 10, 15, ...
  if (
    repeatUntilPass &&
    attemptsUsed > 0 &&
    attemptsUsed % RETRY_COOLDOWN_EVERY === 0
  ) {
    const lastSubmittedAt = attempts[0]?.submittedAt;
    if (lastSubmittedAt) {
      const until = new Date(
        lastSubmittedAt.getTime() + RETRY_COOLDOWN_MINUTES * 60_000,
      );
      if (Date.now() < until.getTime()) {
        return {
          ok: false,
          error: `Istirahat dulu ${RETRY_COOLDOWN_MINUTES} menit sebelum mencoba lagi.`,
          cooldownUntil: until.toISOString(),
        };
      }
    }
  }

  if (!repeatUntilPass && attemptsUsed >= assignment.maxAttempts) {
    return {
      ok: false,
      error: "Percobaan sudah habis. Hubungi guru untuk remedial.",
    };
  }

  const stdout = clampText(input.stdout, MAX_OUTPUT);
  const stderr = clampText(input.stderr, MAX_OUTPUT);
  const metrics = sanitizeMetrics(input.metrics);

  const grade = computeAutoGrade({
    stdout,
    expectedOutput: assignment.expectedOutput,
    status: input.status,
    maxScore: assignment.maxScore,
    structureRules: assignment.structureRules,
    structureWeight: assignment.structureWeight,
    metrics,
  });

  const passed =
    assignment.minScore !== null && grade.totalScore !== null
      ? grade.totalScore >= assignment.minScore && !grade.mandatoryFailed
      : null;

  try {
    const [row] = await getDb()
      .insert(tugasSubmissions)
      .values({
        tugasId: assignment.id,
        userId: user.id,
        attemptNo: attemptsUsed + 1,
        code,
        stdin: clampText(input.stdin, 10_000),
        stdout,
        stderr,
        status: input.status,
        score: grade.totalScore,
        outputScore: grade.outputScore,
        structureScore: grade.structureScore,
        passed,
        metrics,
        checks: grade.checks,
      })
      .returning({ id: tugasSubmissions.id });

    let cooldownUntil: string | null = null;
    if (
      repeatUntilPass &&
      passed === false &&
      grade.totalScore !== null &&
      (attemptsUsed + 1) % RETRY_COOLDOWN_EVERY === 0
    ) {
      cooldownUntil = new Date(
        Date.now() + RETRY_COOLDOWN_MINUTES * 60_000,
      ).toISOString();
    }

    return {
      ok: true,
      submissionId: row.id,
      score: grade.totalScore,
      passed,
      attemptsLeft: repeatUntilPass
        ? null
        : Math.max(0, assignment.maxAttempts - attemptsUsed - 1),
      cooldownUntil,
      feedback: null,
      mandatoryFailed: grade.mandatoryFailed,
      criticalFailed: grade.criticalFailed,
      variableUsed: grade.variableUsed,
      variableTotal: grade.variableTotal,
    };
  } catch (error) {
    console.error("tugas: gagal menyimpan submission", error);
    return { ok: false, error: "Gagal mengumpulkan tugas. Coba lagi." };
  }
}

export type GradeSubmissionResult = {
  ok: boolean;
  error?: string;
};

export type GradeFormState = {
  error?: string;
  success?: boolean;
  stamp?: number;
};

export async function gradeSubmissionForm(
  _prevState: GradeFormState,
  formData: FormData,
): Promise<GradeFormState> {
  const submissionId = Number(formData.get("submissionId"));
  const score = Number(formData.get("score"));
  const feedback = String(formData.get("feedback") ?? "");

  const result = await gradeSubmission({ submissionId, score, feedback });

  if (!result.ok) return { error: result.error };

  return { success: true, stamp: Date.now() };
}

export async function gradeSubmission(input: {
  submissionId: number;
  score: number;
  feedback: string;
}): Promise<GradeSubmissionResult> {  await requireUser("guru");

  if (!Number.isInteger(input.submissionId) || input.submissionId <= 0) {
    return { ok: false, error: "Submission tidak valid." };
  }

  const [row] = await getDb()
    .select({
      id: tugasSubmissions.id,
      maxScore: tugas.maxScore,
      minScore: tugas.minScore,
    })
    .from(tugasSubmissions)
    .innerJoin(tugas, eq(tugas.id, tugasSubmissions.tugasId))
    .where(eq(tugasSubmissions.id, input.submissionId))
    .limit(1);

  if (!row) return { ok: false, error: "Submission tidak ditemukan." };

  if (
    !Number.isInteger(input.score) ||
    input.score < 0 ||
    input.score > row.maxScore
  ) {
    return {
      ok: false,
      error: `Nilai harus 0–${row.maxScore}.`,
    };
  }

  try {
    await getDb()
      .update(tugasSubmissions)
      .set({
        score: input.score,
        passed:
          row.minScore !== null ? input.score >= row.minScore : null,
        feedback: String(input.feedback ?? "").slice(0, 2_000) || null,
        gradedAt: new Date(),
      })
      .where(eq(tugasSubmissions.id, row.id));
  } catch (error) {
    console.error("tugas: gagal menyimpan nilai", error);
    return { ok: false, error: "Gagal menyimpan nilai. Coba lagi." };
  }

  return { ok: true };
}

export type ResetTugasSubmissionResult = {
  ok: boolean;
  error?: string;
  deleted?: number;
};

/**
 * Hapus seluruh submission satu siswa pada satu tugas. Ini mereset attempt,
 * nilai, status lulus, riwayat, dan jeda percobaan karena semuanya diturunkan
 * dari baris tugas_submissions.
 */
export async function resetTugasSubmission(input: {
  tugasId: number;
  userId: number;
}): Promise<ResetTugasSubmissionResult> {
  await requireUser("guru");

  if (
    !Number.isInteger(input.tugasId) ||
    input.tugasId <= 0 ||
    !Number.isInteger(input.userId) ||
    input.userId <= 0
  ) {
    return { ok: false, error: "Data reset tidak valid." };
  }

  const [assignment] = await getDb()
    .select({ id: tugas.id })
    .from(tugas)
    .where(eq(tugas.id, input.tugasId))
    .limit(1);

  if (!assignment) return { ok: false, error: "Tugas tidak ditemukan." };

  const [student] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, input.userId), eq(users.role, "siswa")))
    .limit(1);

  if (!student) return { ok: false, error: "Siswa tidak ditemukan." };

  try {
    const deleted = await getDb()
      .delete(tugasSubmissions)
      .where(
        and(
          eq(tugasSubmissions.tugasId, input.tugasId),
          eq(tugasSubmissions.userId, input.userId),
        ),
      )
      .returning({ id: tugasSubmissions.id });

    if (deleted.length === 0) {
      return { ok: false, error: "Belum ada pekerjaan untuk direset." };
    }

    return { ok: true, deleted: deleted.length };
  } catch (error) {
    console.error("tugas: gagal mereset pekerjaan siswa", error);
    return { ok: false, error: "Gagal mereset pekerjaan. Coba lagi." };
  }
}
