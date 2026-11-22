import type {
  LabRunStatus,
  TugasJenis,
  TugasTargetType,
} from "@/lib/db/schema";
import type { LoginLocationStatus } from "@/lib/auth/geolocation";
import type {
  TugasCheck,
  TugasMetrics,
  TugasStructureRules,
} from "@/lib/tugas/rules";

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
  outputScore: number | null;
  structureScore: number | null;
  passed: boolean | null;
  metrics: TugasMetrics | null;
  checks: TugasCheck[] | null;
  feedback: string | null;
  submittedAt: string;
};

export type TugasLocationView = {
  id: number;
  tugasId: number;
  tugasTitle: string;
  userId: number;
  userName: string | null;
  status: LoginLocationStatus;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  capturedAt: string;
};

export type TugasGpsPassView = {
  id: number;
  tugasId: number;
  userId: number;
  code: string;
  active: boolean;
  usedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TugasSiswaView = TugasView & {
  attemptsUsed: number;
  attemptsLeft: number;
  bestScore: number | null;
  passed: boolean | null;
  lastSubmittedAt: string | null;
  closed: boolean;
};

export type TugasRosterStatus =
  | "lulus"
  | "belum_lulus"
  | "mengerjakan"
  | "belum_mengerjakan";

export type TugasRosterRow = {
  userId: number;
  name: string;
  username: string | null;
  kelasLabel: string | null;
  isActive: boolean;
  attempts: number;
  lastScore: number | null;
  bestScore: number | null;
  passed: boolean | null;
  lastSubmittedAt: string | null;
  status: TugasRosterStatus;
  latestLocation: TugasLocationView | null;
  gpsPass: TugasGpsPassView | null;
};

export type TugasRoster = {
  rows: TugasRosterRow[];
  assignedCount: number;
  activeCount: number;
  passedCount: number;
  failedCount: number;
  workedCount: number;
  notStartedCount: number;
  inactiveCount: number;
  hasKkm: boolean;
};
