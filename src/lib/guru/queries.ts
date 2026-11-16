import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { materi } from "@/lib/db/schema";

export async function listMateri() {
  return getDb().select().from(materi).orderBy(desc(materi.createdAt));
}
