"use server";

import { and, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { labRuns, type LabRunStatus } from "@/lib/db/schema";
import { LAB_RUN_LIMIT } from "@/lib/lab/queries";
import type { LabRunView } from "@/lib/lab/types";

const MAX_CODE = 50_000;
const MAX_STDIN = 10_000;
const MAX_OUTPUT = 20_000;

const ALLOWED_STATUS: LabRunStatus[] = [
  "success",
  "error",
  "timeout",
  "stopped",
];

export type SaveLabRunInput = {
  code: string;
  stdin: string;
  stdout: string;
  stderr: string;
  status: LabRunStatus;
  durationMs: number | null;
};

export type SaveLabRunResult =
  | { ok: true; run: LabRunView }
  | { ok: false; error: string };

function clampText(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

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

/** Simpan satu hasil Run Lab Coding milik siswa yang sedang login. */
export async function saveLabRun(
  input: SaveLabRunInput,
): Promise<SaveLabRunResult> {
  const user = await requireUser("siswa");

  if (!ALLOWED_STATUS.includes(input.status)) {
    return { ok: false, error: "Status eksekusi tidak valid." };
  }

  const code = clampText(input.code, MAX_CODE);
  if (!code.trim()) {
    return { ok: false, error: "Kode kosong, tidak ada yang perlu disimpan." };
  }

  const duration =
    typeof input.durationMs === "number" && Number.isFinite(input.durationMs)
      ? Math.max(0, Math.min(Math.round(input.durationMs), 600_000))
      : null;

  try {
    const [row] = await getDb()
      .insert(labRuns)
      .values({
        userId: user.id,
        code,
        stdin: clampText(input.stdin, MAX_STDIN),
        stdout: clampText(input.stdout, MAX_OUTPUT),
        stderr: clampText(input.stderr, MAX_OUTPUT),
        status: input.status,
        durationMs: duration,
      })
      .returning();

    // Simpan maksimal 50 run terakhir per siswa.
    await getDb().execute(
      sql`delete from lab_runs
          where user_id = ${user.id}
            and id not in (
              select id from lab_runs
              where user_id = ${user.id}
              order by created_at desc, id desc
              limit ${LAB_RUN_LIMIT}
            )`,
    );

    return { ok: true, run: toView(row) };
  } catch (error) {
    console.error("lab: gagal menyimpan riwayat run", error);
    return { ok: false, error: "Gagal menyimpan riwayat. Coba lagi." };
  }
}

export async function deleteLabRun(
  id: number,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser("siswa");

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, error: "Riwayat tidak valid." };
  }

  try {
    await getDb()
      .delete(labRuns)
      .where(and(eq(labRuns.id, id), eq(labRuns.userId, user.id)));

    return { ok: true };
  } catch (error) {
    console.error("lab: gagal menghapus riwayat run", error);
    return { ok: false, error: "Gagal menghapus riwayat. Coba lagi." };
  }
}
