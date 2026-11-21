import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { labRuns, type LabRunStatus } from "@/lib/db/schema";
import type { LabRunView } from "@/lib/lab/types";

export const LAB_RUN_LIMIT = 50;

function toView(row: typeof labRuns.$inferSelect): LabRunView {
  return {
    id: row.id,
    code: row.code,
    stdin: row.stdin,
    stdout: row.stdout,
    stderr: row.stderr,
    status: row.status as LabRunStatus,
    durationMs: row.durationMs,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Riwayat Lab Coding milik siswa yang sedang login (terbaru di atas). */
export async function listLabRuns(limit = 20): Promise<LabRunView[]> {
  const user = await requireUser("siswa");
  const safeLimit = Math.min(Math.max(limit, 1), LAB_RUN_LIMIT);

  const rows = await getDb()
    .select()
    .from(labRuns)
    .where(eq(labRuns.userId, user.id))
    .orderBy(desc(labRuns.createdAt), desc(labRuns.id))
    .limit(safeLimit);

  return rows.map(toView);
}
