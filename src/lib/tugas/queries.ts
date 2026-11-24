import { and, desc, eq, gte, inArray, isNotNull, or, sql } from "drizzle-orm";
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
  type TugasLink,
  type TugasQuestion,
  type LabRunStatus,
  type TugasJenis,
  type TugasTargetType,
} from "@/lib/db/schema";
import type {
  TugasGpsPassView,
  TugasLinkView,
  TugasLocationView,
  TugasQuestionProgress,
  TugasQuestionView,
  TugasRoster,
  TugasRosterRow,
  TugasSiswaView,
  TugasStudentAnswerEntry,
  TugasStudentAnswers,
  TugasSubmissionView,
  TugasView,
} from "@/lib/tugas/types";
import type { TugasStructureRules } from "@/lib/tugas/rules";
import { normalizeStructureRules } from "@/lib/tugas/rules";

type TugasRow = {
  id: number;
  title: string;
  description: string;
  jenis: string;
  targetType: string;
  kelasId: number | null;
  starterCode: string;
  expectedOutput: string;
  solutionCode: string;
  maxScore: number;
  maxAttempts: number;
  minScore: number | null;
  repeatUntilPass: boolean;
  structureRules: TugasStructureRules | null;
  structureWeight: number;
  blockCopyPaste: boolean;
  manuallyClosed: boolean;
  requireGps: boolean;
  linkRequired: boolean;
  dueAt: Date | null;
  createdAt: Date;
  kelasName: string | null;
  academicYear: string | null;
};

function toView(
  row: TugasRow,
  submissionCount: number,
  targetCount: number,
  questionCount = 0,
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
    solutionCode: row.solutionCode,
    maxScore: row.maxScore,
    maxAttempts: row.maxAttempts,
    minScore: row.minScore,
    repeatUntilPass: row.repeatUntilPass,
    structureRules: normalizeStructureRules(row.structureRules),
    structureWeight: row.structureWeight,
    blockCopyPaste: row.blockCopyPaste,
    manuallyClosed: row.manuallyClosed,
    requireGps: row.requireGps,
    linkRequired: row.linkRequired,
    dueAt: row.dueAt ? row.dueAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    submissionCount,
    questionCount,
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
  solutionCode: tugas.solutionCode,
  maxScore: tugas.maxScore,
  maxAttempts: tugas.maxAttempts,
  minScore: tugas.minScore,
  repeatUntilPass: tugas.repeatUntilPass,
  structureRules: tugas.structureRules,
  structureWeight: tugas.structureWeight,
  blockCopyPaste: tugas.blockCopyPaste,
  manuallyClosed: tugas.manuallyClosed,
  requireGps: tugas.requireGps,
  linkRequired: tugas.linkRequired,
  dueAt: tugas.dueAt,
  createdAt: tugas.createdAt,
  kelasName: kelas.name,
  academicYear: kelas.academicYear,
};

function toQuestionView(row: TugasQuestion): TugasQuestionView {
  return {
    id: row.id,
    tugasId: row.tugasId,
    orderNo: row.orderNo,
    title: row.title,
    description: row.description,
    starterCode: row.starterCode,
    expectedOutput: row.expectedOutput,
    solutionCode: row.solutionCode,
    maxScore: row.maxScore,
    structureRules: normalizeStructureRules(row.structureRules),
    structureWeight: row.structureWeight,
  };
}

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

async function questionRowsForTugasIds(
  ids: number[],
): Promise<Map<number, TugasQuestionView[]>> {
  if (ids.length === 0) return new Map();

  const rows = await getDb()
    .select()
    .from(tugasQuestions)
    .where(inArray(tugasQuestions.tugasId, ids))
    .orderBy(tugasQuestions.tugasId, tugasQuestions.orderNo);

  const byTugas = new Map<number, TugasQuestionView[]>();
  for (const row of rows) {
    const list = byTugas.get(row.tugasId) ?? [];
    list.push(toQuestionView(row));
    byTugas.set(row.tugasId, list);
  }
  return byTugas;
}

export async function listTugasQuestions(
  tugasId: number,
): Promise<TugasQuestionView[]> {
  await requireUser("guru");

  const rows = await getDb()
    .select()
    .from(tugasQuestions)
    .where(eq(tugasQuestions.tugasId, tugasId))
    .orderBy(tugasQuestions.orderNo);

  return rows.map(toQuestionView);
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
  const questions = await questionRowsForTugasIds(rows.map((row) => row.id));

  return rows.map((row) =>
    toView(
      row,
      counts.get(row.id) ?? 0,
      targetCounts.get(row.id) ?? 0,
      questions.get(row.id)?.length ?? 0,
    ),
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
  const questions = await questionRowsForTugasIds([row.id]);
  return toView(
    row,
    counts.get(row.id) ?? 0,
    targetCounts.get(row.id) ?? 0,
    questions.get(row.id)?.length ?? 0,
  );
}

function toLinkView(row: TugasLink): TugasLinkView {
  return {
    tugasId: row.tugasId,
    userId: row.userId,
    url: row.url,
    submittedAt: row.submittedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getTugasLink(
  tugasId: number,
  userId: number,
): Promise<TugasLinkView | null> {
  const [row] = await getDb()
    .select()
    .from(tugasLinks)
    .where(
      and(eq(tugasLinks.tugasId, tugasId), eq(tugasLinks.userId, userId)),
    )
    .limit(1);

  return row ? toLinkView(row) : null;
}

async function linkMapForTugas(
  tugasId: number,
): Promise<Map<number, TugasLinkView>> {
  const rows = await getDb()
    .select()
    .from(tugasLinks)
    .where(eq(tugasLinks.tugasId, tugasId));

  return new Map(rows.map((row) => [row.userId, toLinkView(row)]));
}

async function linkMapForUser(
  userId: number,
  tugasIds: number[],
): Promise<Map<number, TugasLinkView>> {
  if (tugasIds.length === 0) return new Map();

  const rows = await getDb()
    .select()
    .from(tugasLinks)
    .where(
      and(
        eq(tugasLinks.userId, userId),
        inArray(tugasLinks.tugasId, tugasIds),
      ),
    );

  return new Map(rows.map((row) => [row.tugasId, toLinkView(row)]));
}

function toLocationView(row: {
  location: typeof tugasLocations.$inferSelect;
  tugasTitle: string;
  userName: string | null;
}): TugasLocationView {
  return {
    id: row.location.id,
    tugasId: row.location.tugasId,
    tugasTitle: row.tugasTitle,
    userId: row.location.userId,
    userName: row.userName,
    status: row.location.status as TugasLocationView["status"],
    latitude: row.location.latitude,
    longitude: row.location.longitude,
    accuracy: row.location.accuracy,
    capturedAt: row.location.capturedAt.toISOString(),
  };
}

export async function getLatestTugasLocation(
  tugasId: number,
  userId: number,
): Promise<TugasLocationView | null> {
  const [row] = await getDb()
    .select({
      location: tugasLocations,
      tugasTitle: tugas.title,
      userName: users.name,
    })
    .from(tugasLocations)
    .innerJoin(tugas, eq(tugas.id, tugasLocations.tugasId))
    .innerJoin(users, eq(users.id, tugasLocations.userId))
    .where(
      and(
        eq(tugasLocations.tugasId, tugasId),
        eq(tugasLocations.userId, userId),
      ),
    )
    .orderBy(desc(tugasLocations.capturedAt), desc(tugasLocations.id))
    .limit(1);

  return row ? toLocationView(row) : null;
}

export async function getLatestAvailableTugasLocation(
  tugasId: number,
  userId: number,
  since: Date,
): Promise<TugasLocationView | null> {
  const [row] = await getDb()
    .select({
      location: tugasLocations,
      tugasTitle: tugas.title,
      userName: users.name,
    })
    .from(tugasLocations)
    .innerJoin(tugas, eq(tugas.id, tugasLocations.tugasId))
    .innerJoin(users, eq(users.id, tugasLocations.userId))
    .where(
      and(
        eq(tugasLocations.tugasId, tugasId),
        eq(tugasLocations.userId, userId),
        eq(tugasLocations.status, "tersedia"),
        gte(tugasLocations.capturedAt, since),
      ),
    )
    .orderBy(desc(tugasLocations.capturedAt), desc(tugasLocations.id))
    .limit(1);

  return row ? toLocationView(row) : null;
}

function toGpsPassView(
  row: typeof tugasGpsPasses.$inferSelect,
): TugasGpsPassView {
  return {
    id: row.id,
    tugasId: row.tugasId,
    userId: row.userId,
    code: row.code,
    active: row.active,
    usedAt: row.usedAt ? row.usedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function hasActiveGpsBypass(
  tugasId: number,
  userId: number,
): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: tugasGpsPasses.id })
    .from(tugasGpsPasses)
    .where(
      and(
        eq(tugasGpsPasses.tugasId, tugasId),
        eq(tugasGpsPasses.userId, userId),
        eq(tugasGpsPasses.active, true),
        isNotNull(tugasGpsPasses.usedAt),
      ),
    )
    .limit(1);

  return Boolean(row);
}

async function latestGpsPassesForTugas(
  tugasId: number,
): Promise<Map<number, TugasGpsPassView>> {
  const rows = await getDb()
    .select()
    .from(tugasGpsPasses)
    .where(eq(tugasGpsPasses.tugasId, tugasId))
    .orderBy(desc(tugasGpsPasses.createdAt), desc(tugasGpsPasses.id));

  const byUser = new Map<number, TugasGpsPassView>();
  for (const row of rows) {
    if (byUser.has(row.userId)) continue;
    byUser.set(row.userId, toGpsPassView(row));
  }
  return byUser;
}

async function latestLocationsForTugas(
  tugasId: number,
): Promise<Map<number, TugasLocationView>> {  const rows = await getDb()
    .select({
      location: tugasLocations,
      tugasTitle: tugas.title,
      userName: users.name,
    })
    .from(tugasLocations)
    .innerJoin(tugas, eq(tugas.id, tugasLocations.tugasId))
    .innerJoin(users, eq(users.id, tugasLocations.userId))
    .where(eq(tugasLocations.tugasId, tugasId))
    .orderBy(desc(tugasLocations.capturedAt), desc(tugasLocations.id));

  const byUser = new Map<number, TugasLocationView>();
  for (const row of rows) {
    if (byUser.has(row.location.userId)) continue;
    byUser.set(row.location.userId, toLocationView(row));
  }
  return byUser;
}

export async function listTugasLocationsForUser(
  userId: number,
  limit = 100,
): Promise<TugasLocationView[]> {
  await requireUser("guru");

  const rows = await getDb()
    .select({
      location: tugasLocations,
      tugasTitle: tugas.title,
      userName: users.name,
    })
    .from(tugasLocations)
    .innerJoin(tugas, eq(tugas.id, tugasLocations.tugasId))
    .innerJoin(users, eq(users.id, tugasLocations.userId))
    .where(eq(tugasLocations.userId, userId))
    .orderBy(desc(tugasLocations.capturedAt), desc(tugasLocations.id))
    .limit(Math.min(Math.max(limit, 1), 500));

  return rows.map(toLocationView);
}

function toSubmissionView(
  row: typeof tugasSubmissions.$inferSelect & {
    userName: string | null;
    questionTitle?: string | null;
  },
): TugasSubmissionView {
  return {
    id: row.id,
    tugasId: row.tugasId,
    questionId: row.questionId,
    questionTitle: row.questionTitle ?? null,
    userId: row.userId,
    userName: row.userName ?? "Siswa",
    attemptNo: row.attemptNo,
    code: row.code,
    stdin: row.stdin,
    stdout: row.stdout,
    stderr: row.stderr,
    status: row.status as LabRunStatus,
    score: row.score,
    outputScore: row.outputScore,
    structureScore: row.structureScore,
    passed: row.passed,
    metrics: row.metrics,
    checks: row.checks,
    feedback: row.feedback,
    submittedAt: row.submittedAt.toISOString(),
  };
}

export async function listLatestSubmissionsForTugas(
  tugasId: number,
): Promise<TugasSubmissionView[]> {
  await requireUser("guru");

  const rows = await getDb()
    .select({
      submission: tugasSubmissions,
      userName: users.name,
      questionTitle: tugasQuestions.title,
    })
    .from(tugasSubmissions)
    .innerJoin(users, eq(users.id, tugasSubmissions.userId))
    .leftJoin(
      tugasQuestions,
      eq(tugasQuestions.id, tugasSubmissions.questionId),
    )
    .where(eq(tugasSubmissions.tugasId, tugasId))
    .orderBy(desc(tugasSubmissions.submittedAt), desc(tugasSubmissions.id));

  const seen = new Set<number>();
  const latest: TugasSubmissionView[] = [];

  for (const row of rows) {
    if (seen.has(row.submission.userId)) continue;
    seen.add(row.submission.userId);
    latest.push(
      toSubmissionView({
        ...row.submission,
        userName: row.userName,
        questionTitle: row.questionTitle,
      }),
    );
  }

  return latest;
}

export async function getTugasRoster(
  tugasId: number,
): Promise<TugasRoster | null> {
  await requireUser("guru");

  const [assignment] = await getDb()
    .select({
      targetType: tugas.targetType,
      kelasId: tugas.kelasId,
      minScore: tugas.minScore,
      maxScore: tugas.maxScore,
      linkRequired: tugas.linkRequired,
    })
    .from(tugas)
    .where(eq(tugas.id, tugasId))
    .limit(1);

  if (!assignment) return null;

  const questionRows = await getDb()
    .select({
      id: tugasQuestions.id,
      maxScore: tugasQuestions.maxScore,
    })
    .from(tugasQuestions)
    .where(eq(tugasQuestions.tugasId, tugasId));
  const questionMaxById = new Map(
    questionRows.map((question) => [question.id, question.maxScore]),
  );
  const isMultiQuestion = questionRows.length > 0;

  const targetType = assignment.targetType as TugasTargetType;

  const studentSelect = {
    id: users.id,
    name: users.name,
    username: users.username,
    isActive: users.isActive,
    kelasName: kelas.name,
    academicYear: kelas.academicYear,
  };

  let students: {
    id: number;
    name: string;
    username: string | null;
    isActive: boolean;
    kelasName: string | null;
    academicYear: string | null;
  }[] = [];

  if (targetType === "siswa") {
    students = await getDb()
      .select(studentSelect)
      .from(tugasTargets)
      .innerJoin(users, eq(users.id, tugasTargets.userId))
      .leftJoin(kelas, eq(kelas.id, users.kelasId))
      .where(eq(tugasTargets.tugasId, tugasId))
      .orderBy(users.name);
  } else {
    const conditions = [eq(users.role, "siswa")];
    if (targetType === "kelas" && assignment.kelasId !== null) {
      conditions.push(eq(users.kelasId, assignment.kelasId));
    }

    students = await getDb()
      .select(studentSelect)
      .from(users)
      .leftJoin(kelas, eq(kelas.id, users.kelasId))
      .where(and(...conditions))
      .orderBy(users.name);
  }

  const rawSubmissions = await getDb()
    .select({
      userId: tugasSubmissions.userId,
      questionId: tugasSubmissions.questionId,
      score: tugasSubmissions.score,
      passed: tugasSubmissions.passed,
      submittedAt: tugasSubmissions.submittedAt,
    })
    .from(tugasSubmissions)
    .where(eq(tugasSubmissions.tugasId, tugasId))
    .orderBy(desc(tugasSubmissions.submittedAt), desc(tugasSubmissions.id));

  const byUser = new Map<
    number,
    {
      questionId: number | null;
      score: number | null;
      passed: boolean | null;
      submittedAt: Date;
    }[]
  >();

  for (const submission of rawSubmissions) {
    const list = byUser.get(submission.userId) ?? [];
    list.push({
      questionId: submission.questionId,
      score: submission.score,
      passed: submission.passed,
      submittedAt: submission.submittedAt,
    });
    byUser.set(submission.userId, list);
  }

  const latestLocations = await latestLocationsForTugas(tugasId);
  const latestGpsPasses = await latestGpsPassesForTugas(tugasId);
  const linksByUser = await linkMapForTugas(tugasId);

  const rows: TugasRosterRow[] = students.map((student) => {
    const mine = byUser.get(student.id) ?? [];
    const attempts = mine.length;
    const latest = mine[0] ?? null;
    const link = linksByUser.get(student.id) ?? null;
    const linkSubmitted = !assignment.linkRequired || Boolean(link);
    const scores = mine
      .map((item) => item.score)
      .filter((value): value is number => typeof value === "number");
    const bestScore = scores.length > 0 ? Math.max(...scores) : null;

    let totalBest = 0;
    let allQuestionsPassed = false;
    if (isMultiQuestion) {
      const bestByQuestion = new Map<number, number>();
      for (const item of mine) {
        if (item.questionId === null || item.score === null) continue;
        const current = bestByQuestion.get(item.questionId);
        if (current === undefined || item.score > current) {
          bestByQuestion.set(item.questionId, item.score);
        }
      }
      allQuestionsPassed = [...questionMaxById].every(
        ([questionId, maxScore]) =>
          (bestByQuestion.get(questionId) ?? 0) >= maxScore,
      );
      for (const questionId of questionMaxById.keys()) {
        totalBest += bestByQuestion.get(questionId) ?? 0;
      }
      totalBest = Math.min(assignment.maxScore, totalBest);
    }

    const passed = isMultiQuestion
      ? assignment.minScore !== null
        ? attempts > 0
          ? allQuestionsPassed &&
            linkSubmitted &&
            totalBest >= assignment.minScore
          : null
        : null
      : assignment.minScore !== null
        ? attempts > 0
          ? mine.some((item) => item.passed === true) && linkSubmitted
          : null
        : null;

    const status =
      passed === true
        ? "lulus"
        : attempts > 0
          ? assignment.minScore !== null
            ? "belum_lulus"
            : "mengerjakan"
          : "belum_mengerjakan";

    return {
      userId: student.id,
      name: student.name,
      username: student.username,
      kelasLabel: student.kelasName
        ? `${student.kelasName} · ${student.academicYear ?? ""}`.trim()
        : null,
      isActive: student.isActive,
      attempts,
      lastScore: isMultiQuestion
        ? attempts > 0
          ? totalBest
          : null
        : latest?.score ?? null,
      bestScore: isMultiQuestion
        ? attempts > 0
          ? totalBest
          : null
        : bestScore,
      passed,
      lastSubmittedAt: latest
        ? latest.submittedAt.toISOString()
        : null,
      status,
      latestLocation: latestLocations.get(student.id) ?? null,
      gpsPass: latestGpsPasses.get(student.id) ?? null,
      link,
    };
  });

  const activeRows = rows.filter((row) => row.isActive);

  return {
    rows,
    assignedCount: rows.length,
    activeCount: activeRows.length,
    passedCount: rows.filter((row) => row.passed === true).length,
    failedCount: activeRows.filter(
      (row) =>
        row.attempts > 0 &&
        row.passed === false &&
        assignment.minScore !== null,
    ).length,
    workedCount: activeRows.filter((row) => row.attempts > 0).length,
    notStartedCount: activeRows.filter((row) => row.attempts === 0).length,
    inactiveCount: rows.filter((row) => !row.isActive).length,
    hasKkm: assignment.minScore !== null,
  };
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
  const questionsByTugas = await questionRowsForTugasIds(ids);
  const linksByTugas = await linkMapForUser(user.id, ids);

  const now = Date.now();

  return rows.map((row) => {
    const mine = byTugas.get(row.id) ?? [];
    const questions = questionsByTugas.get(row.id) ?? [];
    const isMultiQuestion = questions.length > 0;
    const linkSubmitted = !row.linkRequired || linksByTugas.has(row.id);
    const scores = mine
      .map((item) => item.score)
      .filter((value): value is number => typeof value === "number");
    const singleBestScore = scores.length > 0 ? Math.max(...scores) : null;

    let bestScore: number | null = singleBestScore;
    let allQuestionsPassed = false;
    if (isMultiQuestion) {
      const bestByQuestion = new Map<number, number>();
      for (const item of mine) {
        if (item.questionId === null || item.score === null) continue;
        const current = bestByQuestion.get(item.questionId);
        if (current === undefined || item.score > current) {
          bestByQuestion.set(item.questionId, item.score);
        }
      }
      allQuestionsPassed = questions.every(
        (question) =>
          (bestByQuestion.get(question.id) ?? 0) >= question.maxScore,
      );
      bestScore = Math.min(
        row.maxScore,
        questions.reduce(
          (total, question) => total + (bestByQuestion.get(question.id) ?? 0),
          0,
        ),
      );
    }

    const passed =
      row.minScore !== null
        ? mine.length > 0
          ? isMultiQuestion
            ? allQuestionsPassed &&
              linkSubmitted &&
              (bestScore ?? 0) >= row.minScore
            : mine.some((item) => item.passed === true) && linkSubmitted
          : null
        : null;
    const lastSubmittedAt =
      mine.length > 0
        ? mine
            .map((item) => item.submittedAt)
            .sort((a, b) => b.getTime() - a.getTime())[0]
            .toISOString()
        : null;

    return {
      ...toView(row, mine.length, 0, questions.length),
      attemptsUsed: mine.length,
      attemptsLeft: isMultiQuestion
        ? 0
        : Math.max(0, row.maxAttempts - mine.length),
      bestScore,
      passed,
      lastSubmittedAt,
      closed:
        row.manuallyClosed ||
        (row.dueAt !== null && row.dueAt.getTime() <= now),
      linkSubmitted,
    };
  });
}

export async function getTugasForSiswa(tugasId: number): Promise<{
  tugas: TugasView;
  questions: TugasQuestionProgress[];
  submissions: TugasSubmissionView[];
  latestLocation: TugasLocationView | null;
  gpsBypassActive: boolean;
  userId: number;
  link: TugasLinkView | null;
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
  if (row.manuallyClosed) return null;

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

  const latestLocation = await getLatestTugasLocation(tugasId, user.id);
  const gpsBypassActive = await hasActiveGpsBypass(tugasId, user.id);
  const link = await getTugasLink(tugasId, user.id);
  const questionRows = await getDb()
    .select()
    .from(tugasQuestions)
    .where(eq(tugasQuestions.tugasId, tugasId))
    .orderBy(tugasQuestions.orderNo);
  const questions = questionRows.map((question) => {
    const mine = rows.filter(
      (submission) => submission.questionId === question.id,
    );
    const scores = mine
      .map((submission) => submission.score)
      .filter((value): value is number => typeof value === "number");
    const bestScore = scores.length > 0 ? Math.max(...scores) : null;
    return {
      ...toQuestionView(question),
      attemptsUsed: mine.length,
      bestScore,
      passed: bestScore !== null && bestScore >= question.maxScore,
      lastSubmittedAt:
        mine.length > 0 ? mine[0].submittedAt.toISOString() : null,
    } satisfies TugasQuestionProgress;
  });
  const questionTitleById = new Map(
    questionRows.map((question) => [question.id, question.title]),
  );

  return {
    tugas: toView(row, rows.length, 0, questionRows.length),
    questions,
    submissions: rows.map((item) =>
      toSubmissionView({
        ...item,
        userName: user.name,
        questionTitle:
          item.questionId !== null
            ? questionTitleById.get(item.questionId) ?? null
            : null,
      }),
    ),
    latestLocation,
    gpsBypassActive,
    userId: user.id,
    link,
  };
}

export async function listTugasStudentAnswers(
  tugasId: number,
  userId: number,
): Promise<TugasStudentAnswers | null> {
  await requireUser("guru");

  const [assignment] = await getDb()
    .select({ id: tugas.id, maxScore: tugas.maxScore })
    .from(tugas)
    .where(eq(tugas.id, tugasId))
    .limit(1);

  if (!assignment) return null;

  const [student] = await getDb()
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.role, "siswa")))
    .limit(1);

  if (!student) return null;

  const [questions, submissions, link] = await Promise.all([
    getDb()
      .select()
      .from(tugasQuestions)
      .where(eq(tugasQuestions.tugasId, tugasId))
      .orderBy(tugasQuestions.orderNo),
    getDb()
      .select()
      .from(tugasSubmissions)
      .where(
        and(
          eq(tugasSubmissions.tugasId, tugasId),
          eq(tugasSubmissions.userId, userId),
        ),
      )
      .orderBy(desc(tugasSubmissions.submittedAt), desc(tugasSubmissions.id)),
    getTugasLink(tugasId, userId),
  ]);

  const byQuestion = new Map<number, typeof submissions>();
  for (const submission of submissions) {
    if (submission.questionId === null) continue;
    const list = byQuestion.get(submission.questionId) ?? [];
    list.push(submission);
    byQuestion.set(submission.questionId, list);
  }

  const questionTitleById = new Map(
    questions.map((question) => [question.id, question.title]),
  );

  let totalScore = 0;
  let solvedCount = 0;

  const answers: TugasStudentAnswerEntry[] = questions.map((question) => {
    const mine = byQuestion.get(question.id) ?? [];
    const scores = mine
      .map((submission) => submission.score)
      .filter((value): value is number => typeof value === "number");
    const bestScore = scores.length > 0 ? Math.max(...scores) : null;
    const passed = bestScore !== null && bestScore >= question.maxScore;
    if (bestScore !== null) totalScore += bestScore;
    if (passed) solvedCount += 1;

    const latest = mine[0] ?? null;
    return {
      questionId: question.id,
      orderNo: question.orderNo,
      title: question.title,
      maxScore: question.maxScore,
      expectedOutput: question.expectedOutput,
      attempts: mine.length,
      bestScore,
      passed,
      latestSubmission: latest
        ? toSubmissionView({
            ...latest,
            userName: student.name,
            questionTitle: questionTitleById.get(question.id) ?? null,
          })
        : null,
    };
  });

  return {
    userId: student.id,
    userName: student.name,
    totalScore: Math.min(assignment.maxScore, totalScore),
    maxScore: assignment.maxScore,
    questionCount: questions.length,
    solvedCount,
    link,
    answers,
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
