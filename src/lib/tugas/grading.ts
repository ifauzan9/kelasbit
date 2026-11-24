import type { LabRunStatus } from "@/lib/db/schema";
import { scoreOutput } from "@/lib/tugas/output-score";
import {
  evaluateStructure,
  type TugasCheck,
  type TugasMetrics,
  type TugasStructureRules,
} from "@/lib/tugas/rules";

export type AutoGradeResult = {
  outputScore: number;
  structureScore: number;
  totalScore: number | null;
  checks: TugasCheck[];
  mandatoryFailed: boolean;
  criticalFailed: boolean;
  variableUsed: number;
  variableTotal: number;
};

/**
 * Hitung skor otomatis dari output + struktur.
 * - Tanpa expected output & tanpa aturan struktur → null (nilai manual).
 * - Bobot struktur mengikuti `structureWeight` (persen).
 */
export function computeAutoGrade(input: {
  stdout: string;
  expectedOutput: string;
  status: LabRunStatus;
  maxScore: number;
  structureRules: TugasStructureRules | null;
  structureWeight: number;
  metrics: TugasMetrics | null;
}): AutoGradeResult {
  const checks = evaluateStructure(input.structureRules, input.metrics);
  const rulesActive = checks.length > 0;
  const hasExpected = input.expectedOutput.trim().length > 0;

  if (!rulesActive && !hasExpected) {
    return {
      outputScore: 0,
      structureScore: 0,
      totalScore: null,
      checks,
      mandatoryFailed: false,
      criticalFailed: false,
      variableUsed: 0,
      variableTotal: 0,
    };
  }

  const mandatoryFailed = checks.some(
    (check) => check.mandatory === true && !check.passed,
  );
  const criticalFailed = checks.some(
    (check) => check.critical === true && !check.passed,
  );
  const printVarsCheck = checks.find((check) => check.id === "print-vars");
  const variableRatio =
    printVarsCheck?.total && printVarsCheck.total > 0
      ? Math.max(0, Math.min(1, printVarsCheck.credit ?? 0))
      : 1;

  const weight = Math.min(
    100,
    Math.max(0, Math.round(input.structureWeight)),
  );

  let structureMax = 0;
  let outputMax = 0;

  if (rulesActive && hasExpected) {
    structureMax = Math.round((input.maxScore * weight) / 100);
    outputMax = input.maxScore - structureMax;
  } else if (rulesActive) {
    structureMax = input.maxScore;
  } else {
    outputMax = input.maxScore;
  }

  let outputScore = 0;
  if (
    hasExpected &&
    input.status === "success" &&
    !criticalFailed
  ) {
    const output = scoreOutput(input.expectedOutput, input.stdout);
    outputScore = output.exact ? outputMax : 0;
  }

  const scoredChecks = checks.filter((check) => check.scored !== false);
  const passedChecks = scoredChecks.filter((check) => check.passed).length;
  const structureScore =
    rulesActive && scoredChecks.length > 0
      ? Math.round((structureMax * passedChecks) / scoredChecks.length)
      : 0;
  const baseTotal = outputScore + structureScore;

  return {
    outputScore,
    structureScore,
    totalScore: Math.round(baseTotal * variableRatio),
    checks,
    mandatoryFailed,
    criticalFailed,
    variableUsed: printVarsCheck?.used ?? 0,
    variableTotal: printVarsCheck?.total ?? 0,
  };
}
