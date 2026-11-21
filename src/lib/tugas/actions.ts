"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
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
import { autoScore } from "@/lib/tugas/grading";
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
  const maxScore = Number(formData.get("maxScore") ?? 100);
  const maxAttempts = Number(formData.get("maxAttempts") ?? 3);
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
          maxScore,
          maxAttempts,
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
};

export type SubmitTugasResult =
  | {
      ok: true;
      submissionId: number;
      score: number | null;
      attemptsLeft: number;
      feedback: string | null;
    }
  | { ok: false; error: string };

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

  if (assignment.dueAt && assignment.dueAt.getTime() <= Date.now()) {
    return { ok: false, error: "Batas waktu pengumpulan sudah lewat." };
  }

  const [attemptRow] = await getDb()
    .select({ total: sql<number>`count(*)::int` })
    .from(tugasSubmissions)
    .where(
      and(
        eq(tugasSubmissions.tugasId, assignment.id),
        eq(tugasSubmissions.userId, user.id),
      ),
    );

  const attemptsUsed = attemptRow?.total ?? 0;

  if (attemptsUsed >= assignment.maxAttempts) {
    return {
      ok: false,
      error: "Percobaan sudah habis. Hubungi guru untuk remedial.",
    };
  }

  const stdout = clampText(input.stdout, MAX_OUTPUT);
  const stderr = clampText(input.stderr, MAX_OUTPUT);
  const score = autoScore(stdout, assignment.expectedOutput, assignment.maxScore);

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
        score,
      })
      .returning({ id: tugasSubmissions.id });

    return {
      ok: true,
      submissionId: row.id,
      score,
      attemptsLeft: Math.max(0, assignment.maxAttempts - attemptsUsed - 1),
      feedback: null,
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
}): Promise<GradeSubmissionResult> {
  await requireUser("guru");

  if (!Number.isInteger(input.submissionId) || input.submissionId <= 0) {
    return { ok: false, error: "Submission tidak valid." };
  }

  const [row] = await getDb()
    .select({
      id: tugasSubmissions.id,
      maxScore: tugas.maxScore,
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
