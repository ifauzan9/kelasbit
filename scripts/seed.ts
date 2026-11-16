import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { users } from "../src/lib/db/schema.ts";
import { hashPassword } from "../src/lib/auth/password.ts";

const seedUsers = [
  { name: "Siswa Demo", email: "siswa@kelasbit.id", role: "siswa", password: "siswa12345" },
  { name: "Guru Demo", email: "guru@kelasbit.id", role: "guru", password: "guru12345" },
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString, max: 1 });
const db = drizzle(pool);

async function main() {
  for (const item of seedUsers) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, item.email));

    if (existing) {
      console.log(`skip  ${item.email} (sudah ada)`);
      continue;
    }

    await db.insert(users).values({
      name: item.name,
      email: item.email,
      role: item.role,
      passwordHash: await hashPassword(item.password),
    });

    console.log(`buat  ${item.email} / ${item.password}`);
  }
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
