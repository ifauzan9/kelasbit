import { NextResponse } from "next/server";
import type { LoginLocation } from "@/lib/auth/geolocation";
import { saveLoginLocationForUser } from "@/lib/auth/login-location";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  logId?: unknown;
  location?: LoginLocation;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "siswa") {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: Payload;

  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const logId = Number(body.logId);

  if (!Number.isInteger(logId) || logId <= 0 || !body.location) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await saveLoginLocationForUser(user.id, logId, body.location);

  return NextResponse.json({ ok: true });
}
