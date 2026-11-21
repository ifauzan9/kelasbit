import type {
  LabRunStatus,
  TugasJenis,
  TugasTargetType,
} from "@/lib/db/schema";

export type TugasView = {
  id: number;
  title: string;
  description: string;
  jenis: TugasJenis;
  targetType: TugasTargetType;
  kelasId: number | null;
  kelasLabel: string | null;
  targetCount: number;
  starterCode: string;
  expectedOutput: string;
  maxScore: number;
  maxAttempts: number;
  dueAt: string | null;
  createdAt: string;
  submissionCount: number;
};

export type TugasSubmissionView = {
  id: number;
  tugasId: number;
  userId: number;
  userName: string;
  attemptNo: number;
  code: string;
  stdin: string;
  stdout: string;
  stderr: string;
  status: LabRunStatus;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
};

export type TugasSiswaView = TugasView & {
  attemptsUsed: number;
  attemptsLeft: number;
  bestScore: number | null;
  lastSubmittedAt: string | null;
  closed: boolean;
};
