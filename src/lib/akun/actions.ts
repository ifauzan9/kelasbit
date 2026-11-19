"use server";

import { redirect } from "next/navigation";
import { and, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  cleanupAuthData,
  destroyAllSessions,
  getSessionId,
  requireCurrentUser,
  revokeOtherSessions,
} from "@/lib/auth/session";
import { isValidEmail } from "@/lib/guru/siswa-utils";
import type { PasswordState, ProfileState } from "@/lib/akun/types";

function normalizeText(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function validateName(name: string): string | null {
  if (!name) return "Nama wajib diisi.";
  if (name.length > 120) return "Nama maksimal 120 karakter.";
  return null;
}

async function emailTaken(email: string, ignoreId: number): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(sql`lower(${users.email}) = lower(${email})`, ne(users.id, ignoreId)))
    .limit(1);

  return Boolean(row);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireCurrentUser();

  const name = normalizeText(formData.get("name"));
  const email = normalizeEmail(formData.get("email"));
  const currentPassword = String(formData.get("currentPassword") ?? "");

  const nameError = validateName(name);
  if (nameError) return { error: nameError };

  if (user.role === "guru" && !email) {
    return { error: "Email guru wajib diisi." };
  }

  if (email && !isValidEmail(email)) {
    return { error: "Format email tidak valid." };
  }

  const emailChanged = email !== (user.email ?? "");

  // Email guru adalah identitas login; wajib konfirmasi password saat berubah.
  if (user.role === "guru" && emailChanged) {
    if (!currentPassword) {
      return { error: "Masukkan password saat ini untuk mengubah email." };
    }

    const [row] = await getDb()
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!row || !(await verifyPassword(currentPassword, row.passwordHash))) {
      return { error: "Password saat ini salah." };
    }
  }

  if (email && (await emailTaken(email, user.id))) {
    return { error: `Email ${email} sudah dipakai akun lain.` };
  }

  try {
    await getDb()
      .update(users)
      .set({ name, email: email || null })
      .where(eq(users.id, user.id));
  } catch (caught) {
    if (isUniqueViolation(caught)) {
      return { error: "Email sudah dipakai akun lain." };
    }
    throw caught;
  }

  return { success: true, stamp: Date.now() };
}

export async function changePassword(
  _prevState: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const user = await requireCurrentUser();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Semua kolom password wajib diisi." };
  }

  if (newPassword.length < 8) {
    return { error: "Password baru minimal 8 karakter." };
  }

  if (newPassword.length > 100) {
    return { error: "Password baru maksimal 100 karakter." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Konfirmasi password tidak cocok." };
  }

  if (newPassword === currentPassword) {
    return { error: "Password baru harus berbeda dari password saat ini." };
  }

  const [row] = await getDb()
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!row || !(await verifyPassword(currentPassword, row.passwordHash))) {
    return { error: "Password saat ini salah." };
  }

  const passwordHash = await hashPassword(newPassword);

  await getDb().update(users).set({ passwordHash }).where(eq(users.id, user.id));

  // Password lama tidak boleh tetap aktif di perangkat lain.
  const sessionId = await getSessionId();
  await revokeOtherSessions(user.id, sessionId);
  await cleanupAuthData();

  return { success: true, stamp: Date.now() };
}

export async function logoutAllDevices(): Promise<void> {
  const user = await requireCurrentUser();
  await destroyAllSessions(user.id);
  redirect("/login");
}
