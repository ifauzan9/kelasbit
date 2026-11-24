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
  linkRequired: boolean;
  dueAt: string | null;
  createdAt: string;
  submissionCount: number;
  questionCount: number;
};

export type TugasQuestionView = {
  id: number;
  tugasId: number;
  orderNo: number;
  title: string;
  description: string;
  starterCode: string;
  expectedOutput: string;
  solutionCode: string;
  maxScore: number;
  structureRules: TugasStructureRules | null;
  structureWeight: number;
};

export type TugasQuestionProgress = TugasQuestionView & {
  attemptsUsed: number;
  bestScore: number | null;
  passed: boolean;
  lastSubmittedAt: string | null;
};

export type TugasSubmissionView = {
  id: number;
  tugasId: number;
  questionId: number | null;
  questionTitle: string | null;
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

export type TugasLinkView = {
  tugasId: number;
  userId: number;
  url: string;
  submittedAt: string;
  updatedAt: string;
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
  linkSubmitted: boolean;
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
  link: TugasLinkView | null;
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

export type TugasStudentAnswerEntry = {
  questionId: number;
  orderNo: number;
  title: string;
  maxScore: number;
  expectedOutput: string;
  attempts: number;
  bestScore: number | null;
  passed: boolean;
  latestSubmission: TugasSubmissionView | null;
};

export type TugasStudentAnswers = {
  userId: number;
  userName: string;
  totalScore: number;
  maxScore: number;
  questionCount: number;
  solvedCount: number;
  link: TugasLinkView | null;
  answers: TugasStudentAnswerEntry[];
};
