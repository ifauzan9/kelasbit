"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users, type Role } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, homePathForRole } from "@/lib/auth/session";

export type LoginState = { error?: string };

function parseRole(value: FormDataEntryValue | null): Role | null {
  return value === "siswa" || value === "guru" ? value : null;
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const role = parseRole(formData.get("role"));
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!role) {
    return { error: "Halaman login tidak valid." };
  }

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  let user: typeof users.$inferSelect | undefined;

  try {
    [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
  } catch (error) {
    console.error("login: gagal mengambil data user", error);
    return { error: "Layanan sedang tidak tersedia. Coba lagi sebentar." };
  }

  if (!user || !(await verifyPassword(password, user.passwordHash)) || user.role !== role) {
    return { error: "Email atau password salah." };
  }

  try {
    await createSession(user.id, role);
  } catch (error) {
    console.error("login: gagal membuat sesi", error);
    return { error: "Layanan sedang tidak tersedia. Coba lagi sebentar." };
  }

  redirect(homePathForRole(role));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
