import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import {
  normalizeLoginLocation,
  type LoginLocation,
} from "@/lib/auth/geolocation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { tugas, tugasLocations, tugasTargets, users } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  location?: LoginLocation;
};

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

  let body: Payload;

  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body.location) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const location = normalizeLoginLocation(body.location);

  try {
    await getDb().insert(tugasLocations).values({
      tugasId,
      userId: user.id,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      status: location.status,
      capturedAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("tugas-location: gagal menyimpan lokasi", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
