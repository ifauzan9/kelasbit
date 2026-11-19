import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, lt, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { sessions, users, type Role } from "@/lib/db/schema";
import { cleanupLoginLogs } from "@/lib/auth/login-log";
import { cleanupLoginAttempts } from "@/lib/auth/rate-limit";

const COOKIE_NAME = "kelasbit_session";
const ROLE_COOKIE_NAME = "kelasbit_role";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: number;
  name: string;
  email: string | null;
  username: string | null;
  role: Role;
};

export function homePathForRole(role: Role): string {
  return role === "guru" ? "/guru" : "/siswa";
}

export async function createSession(userId: number, role: Role): Promise<void> {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await getDb().insert(sessions).values({ id, userId, expiresAt });

  const store = await cookies();
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  store.set(ROLE_COOKIE_NAME, role, {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const sessionId = store.get(COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const db = getDb();
  const [row] = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!row) return null;

  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  // Akun yang dinonaktifkan langsung kehilangan sesinya.
  if (!row.user.isActive) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  return {
    id: row.user.id,
    name: row.user.name,
    email: row.user.email,
    username: row.user.username,
    role: row.user.role as Role,
  };
}

export async function requireUser(role: Role): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) redirect(`/login/${role}`);
  if (user.role !== role) redirect(homePathForRole(user.role));

  return user;
}

/** Untuk Server Action/halaman yang boleh diakses role mana pun. */
export async function requireCurrentUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return user;
}

/** ID sesi yang sedang dipakai, dipakai saat mencabut sesi lain. */
export async function getSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

/** Hapus semua sesi milik user kecuali sesi yang sedang dipakai. */
export async function revokeOtherSessions(
  userId: number,
  keepSessionId: string | null,
): Promise<void> {
  const conditions = [eq(sessions.userId, userId)];
  if (keepSessionId) conditions.push(ne(sessions.id, keepSessionId));

  await getDb().delete(sessions).where(and(...conditions));
}

/** Hapus semua sesi user, termasuk sesi saat ini (dipakai untuk logout semua perangkat). */
export async function destroyAllSessions(userId: number): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.userId, userId));

  const store = await cookies();
  store.delete(COOKIE_NAME);
  store.delete(ROLE_COOKIE_NAME);
}

/**
 * Bersihkan sesi kedaluwarsa dan catatan percobaan login lama.
 * Dipanggil saat login berhasil dan saat password diganti.
 */
export async function cleanupAuthData(): Promise<void> {
  try {
    await getDb().delete(sessions).where(lt(sessions.expiresAt, new Date()));
  } catch (error) {
    console.error("cleanup: gagal menghapus sesi kedaluwarsa", error);
  }

  await cleanupLoginAttempts();
  await cleanupLoginLogs();
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const sessionId = store.get(COOKIE_NAME)?.value;

  if (sessionId) {
    await getDb().delete(sessions).where(eq(sessions.id, sessionId));
  }

  store.delete(COOKIE_NAME);
  store.delete(ROLE_COOKIE_NAME);
}
