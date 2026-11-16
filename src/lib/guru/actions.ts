"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { materi } from "@/lib/db/schema";
import { SUBJECTS, type Subject } from "@/lib/guru/constants";

export type MateriState = {
  error?: string;
  success?: boolean;
  stamp?: number;
};

function parseForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const rawSubject = String(formData.get("subject") ?? "");

  const subject = (SUBJECTS as readonly string[]).includes(rawSubject)
    ? (rawSubject as Subject)
    : null;

  return { title, description, subject };
}

function validate(title: string, description: string): string | null {
  if (!title) return "Judul materi wajib diisi.";
  if (title.length > 160) return "Judul maksimal 160 karakter.";
  if (description.length > 2000) return "Deskripsi maksimal 2000 karakter.";
  return null;
}

function parseId(value: FormDataEntryValue | null): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function createMateri(
  _prevState: MateriState,
  formData: FormData,
): Promise<MateriState> {
  await requireUser("guru");

  const { title, description, subject } = parseForm(formData);
  if (!subject) return { error: "Mata pelajaran tidak valid." };

  const error = validate(title, description);
  if (error) return { error };

  await getDb().insert(materi).values({ title, description, subject });
  revalidatePath("/guru");

  return { success: true, stamp: Date.now() };
}

export async function updateMateri(
  _prevState: MateriState,
  formData: FormData,
): Promise<MateriState> {
  await requireUser("guru");

  const id = parseId(formData.get("id"));
  if (!id) return { error: "Materi tidak valid." };

  const { title, description, subject } = parseForm(formData);
  if (!subject) return { error: "Mata pelajaran tidak valid." };

  const error = validate(title, description);
  if (error) return { error };

  await getDb()
    .update(materi)
    .set({ title, description, subject, updatedAt: new Date() })
    .where(eq(materi.id, id));
  revalidatePath("/guru");

  return { success: true, stamp: Date.now() };
}

export async function deleteMateri(formData: FormData): Promise<void> {
  await requireUser("guru");

  const id = parseId(formData.get("id"));
  if (!id) return;

  await getDb().delete(materi).where(eq(materi.id, id));
  revalidatePath("/guru");
}
