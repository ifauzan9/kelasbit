import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { kelas, users, type Role } from "@/lib/db/schema";

export type ProfileData = {
  id: number;
  name: string;
  email: string | null;
  username: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  kelasId: number | null;
  kelasName: string | null;
  academicYear: string | null;
};

export async function getProfile(userId: number): Promise<ProfileData | null> {
  const [row] = await getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      username: users.username,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      kelasId: users.kelasId,
      kelasName: kelas.name,
      academicYear: kelas.academicYear,
    })
    .from(users)
    .leftJoin(kelas, eq(kelas.id, users.kelasId))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    role: row.role as Role,
  };
}
