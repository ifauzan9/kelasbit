import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
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
import type {
  TugasSiswaView,
  TugasSubmissionView,
  TugasView,
} from "@/lib/tugas/types";

type TugasRow = {
  id: number;
  title: string;
  description: string;
  jenis: string;
  targetType: string;
  kelasId: number | null;
  starterCode: string;
  expectedOutput: string;
  maxScore: number;
  maxAttempts: number;
  dueAt: Date | null;
  createdAt: Date;
  kelasName: string | null;
  academicYear: string | null;
};

function toView(
  row: TugasRow,
  submissionCount: number,
  targetCount: number,
): TugasView {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    jenis: row.jenis as TugasJenis,
    targetType: row.targetType as TugasTargetType,
    kelasId: row.kelasId,
    kelasLabel: row.kelasName
      ? `${row.kelasName} · ${row.academicYear ?? ""}`.trim()
      : null,
    targetCount,
    starterCode: row.starterCode,
    expectedOutput: row.expectedOutput,
    maxScore: row.maxScore,
    maxAttempts: row.maxAttempts,
    dueAt: row.dueAt ? row.dueAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    submissionCount,
  };
}

const tugasSelect = {
  id: tugas.id,
  title: tugas.title,
  description: tugas.description,
  jenis: tugas.jenis,
  targetType: tugas.targetType,
  kelasId: tugas.kelasId,
  starterCode: tugas.starterCode,
  expectedOutput: tugas.expectedOutput,
  maxScore: tugas.maxScore,
  maxAttempts: tugas.maxAttempts,
  dueAt: tugas.dueAt,
  createdAt: tugas.createdAt,
  kelasName: kelas.name,
  academicYear: kelas.academicYear,
};

async function countMapFor(ids: number[]): Promise<Map<number, number>> {
  if (ids.length === 0) return new Map();

  const rows = await getDb()
    .select({
      tugasId: tugasSubmissions.tugasId,
      total: sql<number>`count(*)::int`,
    })
    .from(tugasSubmissions)
    .where(inArray(tugasSubmissions.tugasId, ids))
    .groupBy(tugasSubmissions.tugasId);

  return new Map(rows.map((row) => [row.tugasId, row.total]));
}

async function targetCountMapFor(ids: number[]): Promise<Map<number, number>> {
  if (ids.length === 0) return new Map();

  const rows = await getDb()
    .select({
      tugasId: tugasTargets.tugasId,
      total: sql<number>`count(*)::int`,
    })
    .from(tugasTargets)
    .where(inArray(tugasTargets.tugasId, ids))
    .groupBy(tugasTargets.tugasId);

  return new Map(rows.map((row) => [row.tugasId, row.total]));
}

export async function listTugasForGuru(): Promise<TugasView[]> {
  await requireUser("guru");

  const rows = await getDb()
    .select(tugasSelect)
    .from(tugas)
    .leftJoin(kelas, eq(kelas.id, tugas.kelasId))
    .orderBy(desc(tugas.createdAt), desc(tugas.id));

  const counts = await countMapFor(rows.map((row) => row.id));
  const targetCounts = await targetCountMapFor(rows.map((row) => row.id));

  return rows.map((row) =>
    toView(row, counts.get(row.id) ?? 0, targetCounts.get(row.id) ?? 0),
  );
}

export async function getTugasForGuru(id: number): Promise<TugasView | null> {
  await requireUser("guru");

  const [row] = await getDb()
    .select(tugasSelect)
    .from(tugas)
    .leftJoin(kelas, eq(kelas.id, tugas.kelasId))
    .where(eq(tugas.id, id))
    .limit(1);

  if (!row) return null;

  const counts = await countMapFor([row.id]);
  const targetCounts = await targetCountMapFor([row.id]);
  return toView(row, counts.get(row.id) ?? 0, targetCounts.get(row.id) ?? 0);
}

function toSubmissionView(
  row: typeof tugasSubmissions.$inferSelect & { userName: string | null },
): TugasSubmissionView {
  return {
    id: row.id,
    tugasId: row.tugasId,
    userId: row.userId,
    userName: row.userName ?? "Siswa",
    attemptNo: row.attemptNo,
    code: row.code,
    stdin: row.stdin,
    stdout: row.stdout,
    stderr: row.stderr,
    status: row.status as LabRunStatus,
    score: row.score,
    feedback: row.feedback,
    submittedAt: row.submittedAt.toISOString(),
  };
}

export async function listSubmissionsForTugas(
  tugasId: number,
): Promise<TugasSubmissionView[]> {
  await requireUser("guru");

  const rows = await getDb()
    .select({
      submission: tugasSubmissions,
      userName: users.name,
    })
    .from(tugasSubmissions)
    .innerJoin(users, eq(users.id, tugasSubmissions.userId))
    .where(eq(tugasSubmissions.tugasId, tugasId))
    .orderBy(desc(tugasSubmissions.submittedAt), desc(tugasSubmissions.id));

  return rows.map((row) =>
    toSubmissionView({ ...row.submission, userName: row.userName }),
  );
}

async function siswaKelasId(userId: number): Promise<number | null> {
  const [row] = await getDb()
    .select({ kelasId: users.kelasId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row?.kelasId ?? null;
}

export async function listTugasForSiswa(): Promise<TugasSiswaView[]> {
  const user = await requireUser("siswa");
  const kelasId = await siswaKelasId(user.id);

  const targetSubquery = getDb()
    .select({ tugasId: tugasTargets.tugasId })
    .from(tugasTargets)
    .where(eq(tugasTargets.userId, user.id));

  const targetConditions = [
    eq(tugas.targetType, "semua"),
    and(eq(tugas.targetType, "kelas"), eq(tugas.kelasId, kelasId ?? -1)),
    and(eq(tugas.targetType, "siswa"), inArray(tugas.id, targetSubquery)),
  ];

  const rows = await getDb()
    .select(tugasSelect)
    .from(tugas)
    .leftJoin(kelas, eq(kelas.id, tugas.kelasId))
    .where(or(...targetConditions))
    .orderBy(desc(tugas.createdAt), desc(tugas.id));

  const ids = rows.map((row) => row.id);
  const submissions =
    ids.length > 0
      ? await getDb()
          .select()
          .from(tugasSubmissions)
          .where(
            and(
              eq(tugasSubmissions.userId, user.id),
              inArray(tugasSubmissions.tugasId, ids),
            ),
          )
      : [];

  const byTugas = new Map<number, typeof submissions>();
  for (const submission of submissions) {
    const list = byTugas.get(submission.tugasId) ?? [];
    list.push(submission);
    byTugas.set(submission.tugasId, list);
  }

  const now = Date.now();

  return rows.map((row) => {
    const mine = byTugas.get(row.id) ?? [];
    const scores = mine
      .map((item) => item.score)
      .filter((value): value is number => typeof value === "number");
    const bestScore = scores.length > 0 ? Math.max(...scores) : null;
    const lastSubmittedAt =
      mine.length > 0
        ? mine
            .map((item) => item.submittedAt)
            .sort((a, b) => b.getTime() - a.getTime())[0]
            .toISOString()
        : null;

    return {
      ...toView(row, mine.length, 0),
      attemptsUsed: mine.length,
      attemptsLeft: Math.max(0, row.maxAttempts - mine.length),
      bestScore,
      lastSubmittedAt,
      closed:
        row.dueAt !== null && row.dueAt.getTime() <= now,
    };
  });
}

export async function getTugasForSiswa(tugasId: number): Promise<{
  tugas: TugasView;
  submissions: TugasSubmissionView[];
} | null> {
  const user = await requireUser("siswa");
  const kelasId = await siswaKelasId(user.id);

  const [row] = await getDb()
    .select(tugasSelect)
    .from(tugas)
    .leftJoin(kelas, eq(kelas.id, tugas.kelasId))
    .where(eq(tugas.id, tugasId))
    .limit(1);

  if (!row) return null;

  const targetType = row.targetType as TugasTargetType;
  let allowed = false;

  if (targetType === "semua") {
    allowed = true;
  } else if (targetType === "kelas") {
    allowed = row.kelasId !== null && row.kelasId === kelasId;
  } else if (targetType === "siswa") {
    const [target] = await getDb()
      .select({ id: tugasTargets.id })
      .from(tugasTargets)
      .where(
        and(
          eq(tugasTargets.tugasId, tugasId),
          eq(tugasTargets.userId, user.id),
        ),
      )
      .limit(1);
    allowed = Boolean(target);
  }

  if (!allowed) return null;

  const rows = await getDb()
    .select()
    .from(tugasSubmissions)
    .where(
      and(
        eq(tugasSubmissions.tugasId, tugasId),
        eq(tugasSubmissions.userId, user.id),
      ),
    )
    .orderBy(desc(tugasSubmissions.submittedAt), desc(tugasSubmissions.id));

  return {
    tugas: toView(row, rows.length, 0),
    submissions: rows.map((item) =>
      toSubmissionView({ ...item, userName: user.name }),
    ),
  };
}

export type TugasTargetView = {
  id: number;
  name: string;
  username: string | null;
  kelasLabel: string | null;
};

export async function listTugasTargets(
  tugasId: number,
): Promise<TugasTargetView[]> {
  await requireUser("guru");

  const rows = await getDb()
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      kelasName: kelas.name,
      academicYear: kelas.academicYear,
    })
    .from(tugasTargets)
    .innerJoin(users, eq(users.id, tugasTargets.userId))
    .leftJoin(kelas, eq(kelas.id, users.kelasId))
    .where(eq(tugasTargets.tugasId, tugasId))
    .orderBy(users.name);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    kelasLabel: row.kelasName
      ? `${row.kelasName} · ${row.academicYear ?? ""}`.trim()
      : null,
  }));
}
