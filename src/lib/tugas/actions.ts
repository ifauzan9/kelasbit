"use server";

import { and, desc, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  kelas,
  tugas,
  tugasGpsPasses,
  tugasLinks,
  tugasLocations,
  tugasQuestions,
  tugasSubmissions,
  tugasTargets,
  users,
  type LabRunStatus,
  type TugasJenis,
  type TugasTargetType,
} from "@/lib/db/schema";
import { computeAutoGrade } from "@/lib/tugas/grading";
import { listTugasStudentAnswers } from "@/lib/tugas/queries";
import type { TugasStudentAnswers } from "@/lib/tugas/types";
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
const GPS_VALIDITY_MS = 60 * 60 * 1000;
const GPS_MAX_ACCURACY_METERS = 500;
const GPS_PASS_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateGpsPassCode(length = 8): string {
  const bytes = randomBytes(length);
  let result = "";
  for (let index = 0; index < length; index += 1) {
    result += GPS_PASS_ALPHABET[bytes[index] % GPS_PASS_ALPHABET.length];
  }
  return result;
}
const JENIS: TugasJenis[] = ["tugas", "ulangan", "remedial"];
const TARGET_TYPES: TugasTargetType[] = ["semua", "kelas", "siswa"];
const STATUSES: LabRunStatus[] = ["success", "error", "timeout", "stopped"];

function isAllowedVideoHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "tiktok.com" ||
    host.endsWith(".tiktok.com") ||
    host === "instagram.com" ||
    host.endsWith(".instagram.com")
  );
}

async function hasTugasLink(tugasId: number, userId: number): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: tugasLinks.id })
    .from(tugasLinks)
    .where(
      and(eq(tugasLinks.tugasId, tugasId), eq(tugasLinks.userId, userId)),
    )
    .limit(1);
  return Boolean(row);
}

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
  const blockCopyPaste = formData.get("blockCopyPaste") === "true";
  const requireGps = formData.get("requireGps") === "true";
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
          blockCopyPaste,
          requireGps,
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
  questionId?: number | null;
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
      questionId: number | null;
      score: number | null;
      passed: boolean | null;
      attemptsLeft: number | null;
      cooldownUntil: string | null;
      feedback: string | null;
      mandatoryFailed: boolean;
      criticalFailed: boolean;
      variableUsed: number;
      variableTotal: number;
      taskCompleted: boolean;
      finalScore: number | null;
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

  if (assignment.manuallyClosed) {
    return {
      ok: false,
      error: "Tugas sudah ditutup oleh guru.",
    };
  }

  if (assignment.requireGps) {
    const [location] = await getDb()
      .select({ id: tugasLocations.id })
      .from(tugasLocations)
      .where(
        and(
          eq(tugasLocations.tugasId, assignment.id),
          eq(tugasLocations.userId, user.id),
          eq(tugasLocations.status, "tersedia"),
          lte(tugasLocations.accuracy, GPS_MAX_ACCURACY_METERS),
          gte(
            tugasLocations.capturedAt,
            new Date(Date.now() - GPS_VALIDITY_MS),
          ),
        ),
      )
      .orderBy(desc(tugasLocations.capturedAt))
      .limit(1);

    let hasPass = false;
    if (!location) {
      const [pass] = await getDb()
        .select({ id: tugasGpsPasses.id })
        .from(tugasGpsPasses)
        .where(
          and(
            eq(tugasGpsPasses.tugasId, assignment.id),
            eq(tugasGpsPasses.userId, user.id),
            eq(tugasGpsPasses.active, true),
            isNotNull(tugasGpsPasses.usedAt),
          ),
        )
        .limit(1);
      hasPass = Boolean(pass);
    }

    if (!location && !hasPass) {
      return {
        ok: false,
        error:
          "Lokasi GPS tidak valid. Aktifkan GPS presisi atau gunakan kode pass dari guru.",
      };
    }
  }

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

  let question: typeof tugasQuestions.$inferSelect | null = null;
  if (input.questionId !== undefined && input.questionId !== null) {
    if (!Number.isInteger(input.questionId) || input.questionId <= 0) {
      return { ok: false, error: "Soal tidak valid." };
    }
    const [row] = await getDb()
      .select()
      .from(tugasQuestions)
      .where(
        and(
          eq(tugasQuestions.id, input.questionId),
          eq(tugasQuestions.tugasId, assignment.id),
        ),
      )
      .limit(1);
    if (!row) return { ok: false, error: "Soal tidak ditemukan." };
    question = row;
  } else {
    const [row] = await getDb()
      .select({ id: tugasQuestions.id })
      .from(tugasQuestions)
      .where(eq(tugasQuestions.tugasId, assignment.id))
      .limit(1);
    if (row) {
      return { ok: false, error: "Pilih soal yang ingin dikerjakan." };
    }
  }

  const isMultiQuestion = question !== null;
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
        isMultiQuestion
          ? eq(tugasSubmissions.questionId, question!.id)
          : undefined,
      ),
    )
    .orderBy(desc(tugasSubmissions.submittedAt), desc(tugasSubmissions.id));

  const attemptsUsed = attempts.length;
  const repeatUntilPass =
    !isMultiQuestion &&
    assignment.repeatUntilPass &&
    assignment.minScore !== null;
  const alreadyPassed = attempts.some((item) => item.passed === true);

  if (isMultiQuestion && alreadyPassed) {
    return {
      ok: false,
      error: "Soal ini sudah selesai dengan nilai penuh.",
    };
  }

  if (repeatUntilPass && alreadyPassed) {
    return {
      ok: false,
      error: "Kamu sudah lulus tugas ini. Tidak perlu mengulang.",
    };
  }

  const cooldownEvery = isMultiQuestion ? 10 : RETRY_COOLDOWN_EVERY;
  const hasCooldown = isMultiQuestion || repeatUntilPass;

  // Jeda per soal: setelah percobaan ke-10, 20, 30, ...
  if (
    hasCooldown &&
    attemptsUsed > 0 &&
    attemptsUsed % cooldownEvery === 0
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

  if (!repeatUntilPass && !isMultiQuestion && attemptsUsed >= assignment.maxAttempts) {
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
    expectedOutput: question?.expectedOutput ?? assignment.expectedOutput,
    status: input.status,
    maxScore: question?.maxScore ?? assignment.maxScore,
    structureRules: question?.structureRules ?? assignment.structureRules,
    structureWeight: question?.structureWeight ?? assignment.structureWeight,
    metrics,
  });

  const passed = isMultiQuestion
    ? grade.totalScore !== null
      ? grade.totalScore >= question!.maxScore && !grade.mandatoryFailed
      : null
    : assignment.minScore !== null && grade.totalScore !== null
      ? grade.totalScore >= assignment.minScore && !grade.mandatoryFailed
      : null;

  try {
    const [row] = await getDb()
      .insert(tugasSubmissions)
      .values({
        tugasId: assignment.id,
        questionId: question?.id ?? null,
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
      hasCooldown &&
      passed === false &&
      grade.totalScore !== null &&
      (attemptsUsed + 1) % cooldownEvery === 0
    ) {
      cooldownUntil = new Date(
        Date.now() + RETRY_COOLDOWN_MINUTES * 60_000,
      ).toISOString();
    }

    let taskCompleted = false;
    let finalScore: number | null = null;
    if (isMultiQuestion) {
      const [questions, allSubmissions] = await Promise.all([
        getDb()
          .select({
            id: tugasQuestions.id,
            maxScore: tugasQuestions.maxScore,
          })
          .from(tugasQuestions)
          .where(eq(tugasQuestions.tugasId, assignment.id)),
        getDb()
          .select({
            questionId: tugasSubmissions.questionId,
            score: tugasSubmissions.score,
          })
          .from(tugasSubmissions)
          .where(
            and(
              eq(tugasSubmissions.tugasId, assignment.id),
              eq(tugasSubmissions.userId, user.id),
            ),
          ),
      ]);
      const bestByQuestion = new Map<number, number>();
      for (const submission of allSubmissions) {
        if (submission.questionId === null || submission.score === null) {
          continue;
        }
        const current = bestByQuestion.get(submission.questionId);
        if (current === undefined || submission.score > current) {
          bestByQuestion.set(submission.questionId, submission.score);
        }
      }
      finalScore = Math.min(
        assignment.maxScore,
        questions.reduce(
          (total, item) => total + (bestByQuestion.get(item.id) ?? 0),
          0,
        ),
      );
      taskCompleted =
        questions.length > 0 &&
        questions.every(
          (item) => (bestByQuestion.get(item.id) ?? 0) >= item.maxScore,
        ) &&
        (!assignment.linkRequired ||
          (await hasTugasLink(assignment.id, user.id)));
    }

    return {
      ok: true,
      submissionId: row.id,
      questionId: question?.id ?? null,
      score: grade.totalScore,
      passed,
      attemptsLeft:
        isMultiQuestion || repeatUntilPass
          ? null
          : Math.max(0, assignment.maxAttempts - attemptsUsed - 1),
      cooldownUntil,
      feedback: null,
      mandatoryFailed: grade.mandatoryFailed,
      criticalFailed: grade.criticalFailed,
      variableUsed: grade.variableUsed,
      variableTotal: grade.variableTotal,
      taskCompleted,
      finalScore,
    };
  } catch (error) {
    console.error("tugas: gagal menyimpan submission", error);
    return { ok: false, error: "Gagal mengumpulkan tugas. Coba lagi." };
  }
}

export type SubmitTugasLinkResult =
  | {
      ok: true;
      url: string;
      reviewStatus: "menunggu";
    }
  | { ok: false; error: string };

export async function submitTugasLink(input: {
  tugasId: number;
  url: string;
}): Promise<SubmitTugasLinkResult> {
  const user = await requireUser("siswa");

  if (!Number.isInteger(input.tugasId) || input.tugasId <= 0) {
    return { ok: false, error: "Tugas tidak valid." };
  }

  let rawUrl = input.url.trim().slice(0, 2_000);
  if (!rawUrl) return { ok: false, error: "Tautan video wajib diisi." };
  if (!/^https?:\/\//i.test(rawUrl)) rawUrl = `https://${rawUrl}`;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return {
        ok: false,
        error: "Tautan video harus diawali http:// atau https://.",
      };
    }
    if (!isAllowedVideoHost(url.hostname)) {
      return {
        ok: false,
        error: "Tautan video harus dari TikTok atau Instagram.",
      };
    }
    rawUrl = url.toString();
  } catch {
    return { ok: false, error: "Format tautan video tidak valid." };
  }

  const [assignment] = await getDb()
    .select()
    .from(tugas)
    .where(eq(tugas.id, input.tugasId))
    .limit(1);

  if (!assignment) return { ok: false, error: "Tugas tidak ditemukan." };
  if (assignment.manuallyClosed) {
    return { ok: false, error: "Tugas sudah ditutup oleh guru." };
  }
  if (!assignment.linkRequired) {
    return { ok: false, error: "Tugas ini tidak meminta tautan." };
  }
  if (assignment.dueAt && assignment.dueAt.getTime() <= Date.now()) {
    return { ok: false, error: "Batas waktu pengumpulan sudah lewat." };
  }

  const [student] = await getDb()
    .select({ kelasId: users.kelasId })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const targetType = assignment.targetType as TugasTargetType;
  let allowed = false;

  if (targetType === "semua") {
    allowed = true;
  } else if (targetType === "kelas") {
    allowed =
      assignment.kelasId !== null &&
      assignment.kelasId === (student?.kelasId ?? null);
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

  if (!allowed) return { ok: false, error: "Tugas ini bukan untukmu." };

  const [existingLink] = await getDb()
    .select({ reviewStatus: tugasLinks.reviewStatus })
    .from(tugasLinks)
    .where(
      and(
        eq(tugasLinks.tugasId, assignment.id),
        eq(tugasLinks.userId, user.id),
      ),
    )
    .limit(1);

  if (existingLink?.reviewStatus === "disetujui") {
    return {
      ok: false,
      error: "Video sudah disetujui guru dan tidak dapat diubah.",
    };
  }

  await getDb()
    .insert(tugasLinks)
    .values({
      tugasId: assignment.id,
      userId: user.id,
      url: rawUrl,
      reviewStatus: "menunggu",
    })
    .onConflictDoUpdate({
      target: [tugasLinks.tugasId, tugasLinks.userId],
      set: {
        url: rawUrl,
        reviewStatus: "menunggu",
        reviewNote: null,
        reviewedAt: null,
        reviewedBy: null,
        updatedAt: new Date(),
      },
    });

  return {
    ok: true,
    url: rawUrl,
    reviewStatus: "menunggu",
  };
}

export type ReviewTugasLinkResult =
  | { ok: true }
  | { ok: false; error: string };

export async function reviewTugasLink(input: {
  tugasId: number;
  userId: number;
  decision: "selesai" | "perbaiki";
  note?: string;
}): Promise<ReviewTugasLinkResult> {
  const guru = await requireUser("guru");

  if (
    !Number.isInteger(input.tugasId) ||
    input.tugasId <= 0 ||
    !Number.isInteger(input.userId) ||
    input.userId <= 0
  ) {
    return { ok: false, error: "Data review tidak valid." };
  }

  if (input.decision !== "selesai" && input.decision !== "perbaiki") {
    return { ok: false, error: "Keputusan review tidak valid." };
  }

  const note = (input.note ?? "").trim().slice(0, 1_000);
  if (input.decision === "perbaiki" && !note) {
    return { ok: false, error: "Alasan perbaikan wajib diisi." };
  }

  const [assignment] = await getDb()
    .select({ id: tugas.id, linkRequired: tugas.linkRequired })
    .from(tugas)
    .where(eq(tugas.id, input.tugasId))
    .limit(1);

  if (!assignment) return { ok: false, error: "Tugas tidak ditemukan." };
  if (!assignment.linkRequired) {
    return { ok: false, error: "Tugas ini tidak meminta video." };
  }

  const [link] = await getDb()
    .select({ id: tugasLinks.id })
    .from(tugasLinks)
    .where(
      and(
        eq(tugasLinks.tugasId, input.tugasId),
        eq(tugasLinks.userId, input.userId),
      ),
    )
    .limit(1);

  if (!link) {
    return { ok: false, error: "Siswa belum mengumpulkan video." };
  }

  try {
    await getDb()
      .update(tugasLinks)
      .set({
        reviewStatus: input.decision === "selesai" ? "disetujui" : "perbaikan",
        reviewNote: input.decision === "perbaiki" ? note : null,
        reviewedAt: new Date(),
        reviewedBy: guru.id,
        updatedAt: new Date(),
      })
      .where(eq(tugasLinks.id, link.id));

    return { ok: true };
  } catch (error) {
    console.error("tugas: gagal menyimpan review video", error);
    return { ok: false, error: "Gagal menyimpan review video. Coba lagi." };
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

export type TugasStudentAnswersResult =
  | { ok: true; data: TugasStudentAnswers }
  | { ok: false; error: string };

export async function getTugasStudentAnswers(input: {
  tugasId: number;
  userId: number;
}): Promise<TugasStudentAnswersResult> {
  await requireUser("guru");

  if (
    !Number.isInteger(input.tugasId) ||
    input.tugasId <= 0 ||
    !Number.isInteger(input.userId) ||
    input.userId <= 0
  ) {
    return { ok: false, error: "Data siswa tidak valid." };
  }

  const data = await listTugasStudentAnswers(input.tugasId, input.userId);
  if (!data) return { ok: false, error: "Data jawaban siswa tidak ditemukan." };

  return { ok: true, data };
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
}): Promise<ResetTugasSubmissionResult> {  await requireUser("guru");

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

    const deletedLinks = await getDb()
      .delete(tugasLinks)
      .where(
        and(
          eq(tugasLinks.tugasId, input.tugasId),
          eq(tugasLinks.userId, input.userId),
        ),
      )
      .returning({ id: tugasLinks.id });

    if (deleted.length === 0 && deletedLinks.length === 0) {
      return { ok: false, error: "Belum ada pekerjaan untuk direset." };
    }

    await getDb()
      .delete(tugasLocations)
      .where(
        and(
          eq(tugasLocations.tugasId, input.tugasId),
          eq(tugasLocations.userId, input.userId),
        ),
      );

    await getDb()
      .delete(tugasGpsPasses)
      .where(
        and(
          eq(tugasGpsPasses.tugasId, input.tugasId),
          eq(tugasGpsPasses.userId, input.userId),
        ),
      );

    return { ok: true, deleted: deleted.length + deletedLinks.length };
  } catch (error) {
    console.error("tugas: gagal mereset pekerjaan siswa", error);
    return { ok: false, error: "Gagal mereset pekerjaan. Coba lagi." };
  }
}

export type TugasCopyPasteResult = {
  ok: boolean;
  error?: string;
};

/** Aktif/nonaktifkan penguncian copy/paste untuk satu tugas. */
export async function setTugasBlockCopyPaste(input: {
  tugasId: number;
  enabled: boolean;
}): Promise<TugasCopyPasteResult> {
  await requireUser("guru");

  if (!Number.isInteger(input.tugasId) || input.tugasId <= 0) {
    return { ok: false, error: "Tugas tidak valid." };
  }

  try {
    const updated = await getDb()
      .update(tugas)
      .set({
        blockCopyPaste: input.enabled === true,
        updatedAt: new Date(),
      })
      .where(eq(tugas.id, input.tugasId))
      .returning({ id: tugas.id });

    if (updated.length === 0) {
      return { ok: false, error: "Tugas tidak ditemukan." };
    }

    return { ok: true };
  } catch (error) {
    console.error("tugas: gagal mengubah kunci copy/paste", error);
    return { ok: false, error: "Gagal menyimpan pengaturan. Coba lagi." };
  }
}

export type TugasClosedResult = {
  ok: boolean;
  error?: string;
};

/** Tutup/buka akses tugas secara manual untuk semua siswa. */
export async function setTugasManuallyClosed(input: {
  tugasId: number;
  closed: boolean;
}): Promise<TugasClosedResult> {
  await requireUser("guru");

  if (!Number.isInteger(input.tugasId) || input.tugasId <= 0) {
    return { ok: false, error: "Tugas tidak valid." };
  }

  try {
    const updated = await getDb()
      .update(tugas)
      .set({
        manuallyClosed: input.closed === true,
        updatedAt: new Date(),
      })
      .where(eq(tugas.id, input.tugasId))
      .returning({ id: tugas.id });

    if (updated.length === 0) {
      return { ok: false, error: "Tugas tidak ditemukan." };
    }

    return { ok: true };
  } catch (error) {
    console.error("tugas: gagal mengubah status tutup", error);
    return { ok: false, error: "Gagal menyimpan pengaturan. Coba lagi." };
  }
}

export type TugasDeadlineResult = {
  ok: boolean;
  error?: string;
};

/** Atur ulang atau hapus deadline tugas yang sudah dibuat. */
export async function setTugasDeadline(input: {
  tugasId: number;
  dueAt: string;
}): Promise<TugasDeadlineResult> {
  await requireUser("guru");

  if (!Number.isInteger(input.tugasId) || input.tugasId <= 0) {
    return { ok: false, error: "Tugas tidak valid." };
  }

  const raw = input.dueAt.trim();
  let dueAt: Date | null = null;

  if (raw) {
    dueAt = parseJakartaDateTime(raw);
    if (!dueAt) {
      return { ok: false, error: "Format batas waktu tidak valid." };
    }
    if (dueAt.getTime() <= Date.now()) {
      return {
        ok: false,
        error: "Batas waktu harus setelah waktu sekarang (WIB).",
      };
    }
  }

  try {
    const updated = await getDb()
      .update(tugas)
      .set({ dueAt, updatedAt: new Date() })
      .where(eq(tugas.id, input.tugasId))
      .returning({ id: tugas.id });

    if (updated.length === 0) {
      return { ok: false, error: "Tugas tidak ditemukan." };
    }

    return { ok: true };
  } catch (error) {
    console.error("tugas: gagal mengubah deadline", error);
    return { ok: false, error: "Gagal menyimpan deadline. Coba lagi." };
  }
}

export type TugasGpsResult = {
  ok: boolean;
  error?: string;
};

/** Wajibkan/tidak wajibkan GPS untuk masuk dan mengerjakan tugas. */
export async function setTugasRequireGps(input: {
  tugasId: number;
  enabled: boolean;
}): Promise<TugasGpsResult> {
  await requireUser("guru");

  if (!Number.isInteger(input.tugasId) || input.tugasId <= 0) {
    return { ok: false, error: "Tugas tidak valid." };
  }

  try {
    const updated = await getDb()
      .update(tugas)
      .set({
        requireGps: input.enabled === true,
        updatedAt: new Date(),
      })
      .where(eq(tugas.id, input.tugasId))
      .returning({ id: tugas.id });

    if (updated.length === 0) {
      return { ok: false, error: "Tugas tidak ditemukan." };
    }

    return { ok: true };
  } catch (error) {
    console.error("tugas: gagal mengubah kewajiban GPS", error);
    return { ok: false, error: "Gagal menyimpan pengaturan. Coba lagi." };
  }
}

export type RemoveTugasTargetResult = {
  ok: boolean;
  error?: string;
};

/** Hapus satu siswa dari target tugas. Submission/nilai tidak dihapus. */
export async function removeTugasTarget(input: {
  tugasId: number;
  userId: number;
}): Promise<RemoveTugasTargetResult> {
  await requireUser("guru");

  if (
    !Number.isInteger(input.tugasId) ||
    input.tugasId <= 0 ||
    !Number.isInteger(input.userId) ||
    input.userId <= 0
  ) {
    return { ok: false, error: "Data target tidak valid." };
  }

  const [assignment] = await getDb()
    .select({ id: tugas.id, targetType: tugas.targetType })
    .from(tugas)
    .where(eq(tugas.id, input.tugasId))
    .limit(1);

  if (!assignment) return { ok: false, error: "Tugas tidak ditemukan." };
  if (assignment.targetType !== "siswa") {
    return { ok: false, error: "Tugas ini bukan bertarget siswa tertentu." };
  }

  try {
    const deleted = await getDb()
      .delete(tugasTargets)
      .where(
        and(
          eq(tugasTargets.tugasId, input.tugasId),
          eq(tugasTargets.userId, input.userId),
        ),
      )
      .returning({ id: tugasTargets.id });

    if (deleted.length === 0) {
      return { ok: false, error: "Siswa bukan target tugas ini." };
    }

    await getDb()
      .update(tugas)
      .set({ updatedAt: new Date() })
      .where(eq(tugas.id, input.tugasId));

    return { ok: true };
  } catch (error) {
    console.error("tugas: gagal menghapus target siswa", error);
    return { ok: false, error: "Gagal menghapus siswa. Coba lagi." };
  }
}

export type AddTugasTargetsResult = {
  ok: boolean;
  error?: string;
  added?: number;
};

/** Tambahkan siswa ke tugas yang sudah bertarget siswa tertentu. */
export async function addTugasTargets(input: {
  tugasId: number;
  userIds: number[];
}): Promise<AddTugasTargetsResult> {
  await requireUser("guru");

  if (!Number.isInteger(input.tugasId) || input.tugasId <= 0) {
    return { ok: false, error: "Tugas tidak valid." };
  }

  const userIds = Array.from(
    new Set(input.userIds.filter((id) => Number.isInteger(id) && id > 0)),
  ).slice(0, 500);

  if (userIds.length === 0) {
    return { ok: false, error: "Pilih minimal satu siswa." };
  }

  const [assignment] = await getDb()
    .select({ id: tugas.id, targetType: tugas.targetType })
    .from(tugas)
    .where(eq(tugas.id, input.tugasId))
    .limit(1);

  if (!assignment) return { ok: false, error: "Tugas tidak ditemukan." };
  if (assignment.targetType !== "siswa") {
    return {
      ok: false,
      error: "Siswa hanya bisa ditambahkan pada tugas bertarget siswa tertentu.",
    };
  }

  const found = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        inArray(users.id, userIds),
        eq(users.role, "siswa"),
        eq(users.isActive, true),
      ),
    );

  if (found.length !== userIds.length) {
    return { ok: false, error: "Ada siswa yang tidak ditemukan/nonaktif." };
  }

  try {
    const inserted = await getDb()
      .insert(tugasTargets)
      .values(
        userIds.map((userId) => ({
          tugasId: input.tugasId,
          userId,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: tugasTargets.id });

    await getDb()
      .update(tugas)
      .set({ updatedAt: new Date() })
      .where(eq(tugas.id, input.tugasId));

    return { ok: true, added: inserted.length };
  } catch (error) {
    console.error("tugas: gagal menambah target siswa", error);
    return { ok: false, error: "Gagal menambah siswa. Coba lagi." };
  }
}

export type TugasGpsPassResult = {
  ok: boolean;
  error?: string;
  pass?: {
    id: number;
    code: string;
    active: boolean;
    usedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

/** Buat kode pass GPS baru untuk satu siswa; kode lama dinonaktifkan. */
export async function createTugasGpsPass(input: {
  tugasId: number;
  userId: number;
}): Promise<TugasGpsPassResult> {
  await requireUser("guru");

  if (
    !Number.isInteger(input.tugasId) ||
    input.tugasId <= 0 ||
    !Number.isInteger(input.userId) ||
    input.userId <= 0
  ) {
    return { ok: false, error: "Data kode pass tidak valid." };
  }

  const [student] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, input.userId), eq(users.role, "siswa")))
    .limit(1);

  if (!student) return { ok: false, error: "Siswa tidak ditemukan." };

  try {
    await getDb()
      .update(tugasGpsPasses)
      .set({ active: false, updatedAt: new Date() })
      .where(
        and(
          eq(tugasGpsPasses.tugasId, input.tugasId),
          eq(tugasGpsPasses.userId, input.userId),
        ),
      );

    const [created] = await getDb()
      .insert(tugasGpsPasses)
      .values({
        tugasId: input.tugasId,
        userId: input.userId,
        code: generateGpsPassCode(),
        active: true,
      })
      .returning();

    return {
      ok: true,
      pass: {
        id: created.id,
        code: created.code,
        active: created.active,
        usedAt: created.usedAt ? created.usedAt.toISOString() : null,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("tugas: gagal membuat kode pass GPS", error);
    return { ok: false, error: "Gagal membuat kode pass. Coba lagi." };
  }
}

export type TugasGpsPassToggleResult = {
  ok: boolean;
  error?: string;
};

export async function setTugasGpsPassActive(input: {
  passId: number;
  active: boolean;
}): Promise<TugasGpsPassToggleResult> {
  await requireUser("guru");

  if (!Number.isInteger(input.passId) || input.passId <= 0) {
    return { ok: false, error: "Kode pass tidak valid." };
  }

  try {
    const updated = await getDb()
      .update(tugasGpsPasses)
      .set({ active: input.active === true, updatedAt: new Date() })
      .where(eq(tugasGpsPasses.id, input.passId))
      .returning({ id: tugasGpsPasses.id });

    if (updated.length === 0) {
      return { ok: false, error: "Kode pass tidak ditemukan." };
    }

    return { ok: true };
  } catch (error) {
    console.error("tugas: gagal mengubah status kode pass", error);
    return { ok: false, error: "Gagal menyimpan status kode pass." };
  }
}
