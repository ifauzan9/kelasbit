import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const journalPath = path.join(root, "drizzle", "meta", "_journal.json");

if (!existsSync(journalPath)) {
  console.error("Tidak menemukan drizzle/meta/_journal.json.");
  process.exit(1);
}

const journal = JSON.parse(readFileSync(journalPath, "utf8"));

if (!Array.isArray(journal.entries) || journal.entries.length === 0) {
  console.error("Journal Drizzle kosong.");
  process.exit(1);
}

const rows = [];

for (const entry of journal.entries) {
  const sqlPath = path.join(root, "drizzle", `${entry.tag}.sql`);

  if (!existsSync(sqlPath)) {
    console.error(`File migrasi tidak ditemukan: ${sqlPath}`);
    process.exit(1);
  }

  // Drizzle menghitung hash dari isi file SQL sebagai string.
  const sql = readFileSync(sqlPath, "utf8");
  const hash = createHash("sha256").update(sql).digest("hex");

  rows.push(`  ('${hash}', ${entry.when})`);
}

const output = `-- Jurnal migrasi Drizzle untuk ${journal.entries.length} migrasi.
-- Dibuat oleh scripts/generate-migration-journal.mjs.
-- Aman dijalankan berulang: hash yang sudah ada tidak dimasukkan lagi.

CREATE SCHEMA IF NOT EXISTS "drizzle";

CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at numeric
);

INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
SELECT v.hash, v.created_at
FROM (VALUES
${rows.join(",\n")}
) AS v(hash, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM "drizzle"."__drizzle_migrations" m WHERE m.hash = v.hash
);
`;

const outIndex = process.argv.indexOf("--out");
const outPath = outIndex === -1 ? null : process.argv[outIndex + 1];

if (outPath) {
  const resolved = path.resolve(root, outPath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, output, "utf8");
  console.log(
    `Jurnal dibuat: ${path.relative(root, resolved)} (${journal.entries.length} migrasi).`,
  );
} else {
  process.stdout.write(output);
}
