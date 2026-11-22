import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { tugas, tugasGpsPasses, tugasTargets, users } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function canAccessTugas(
  user: { id: number; role: string },
  tugasId: number,
): Promise<boolean> {
  const [assignment] = await getDb()
    .select({
      targetType: tugas.targetType,
      kelasId: tugas.kelasId,
      manuallyClosed: tugas.manuallyClosed,
    })
    .from(tugas)
    .where(eq(tugas.id, tugasId))
    .limit(1);

  if (!assignment || assignment.manuallyClosed) return false;

  if (assignment.targetType === "semua") return true;

  if (assignment.targetType === "kelas") {
    const [student] = await getDb()
      .select({ kelasId: users.kelasId })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    return (
      assignment.kelasId !== null &&
      assignment.kelasId === (student?.kelasId ?? null)
    );
  }

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

  return Boolean(target);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user || user.role !== "siswa") {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id: rawId } = await params;
  const tugasId = Number(rawId);

  if (!Number.isInteger(tugasId) || tugasId <= 0) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const allowed = await canAccessTugas(user, tugasId);
  if (!allowed) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let body: { code?: unknown };

  try {
    body = (await request.json()) as { code?: unknown };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const code =
    typeof body.code === "string"
      ? body.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
      : "";

  if (code.length < 6 || code.length > 12) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const [pass] = await getDb()
    .select({ id: tugasGpsPasses.id })
    .from(tugasGpsPasses)
    .where(
      and(
        eq(tugasGpsPasses.tugasId, tugasId),
        eq(tugasGpsPasses.userId, user.id),
        eq(tugasGpsPasses.code, code),
        eq(tugasGpsPasses.active, true),
      ),
    )
    .limit(1);

  if (!pass) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  await getDb()
    .update(tugasGpsPasses)
    .set({ usedAt: new Date(), updatedAt: new Date() })
    .where(eq(tugasGpsPasses.id, pass.id));

  return NextResponse.json({ ok: true });
}
