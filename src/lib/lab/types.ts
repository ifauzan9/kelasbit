import type { LabRunStatus } from "@/lib/db/schema";

export type LabRunView = {
  id: number;
  code: string;
  stdin: string;
  stdout: string;
  stderr: string;
  status: LabRunStatus;
  durationMs: number | null;
  createdAt: string;
};
