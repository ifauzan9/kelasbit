import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.error("Standalone build tidak ditemukan. Jalankan `npm run build` dulu.");
  process.exit(1);
}

const copies = [
  [path.join(root, "public"), path.join(standalone, "public")],
  [path.join(root, ".next", "static"), path.join(standalone, ".next", "static")],
];

for (const [from, to] of copies) {
  if (!existsSync(from)) {
    console.log(`lewati ${path.relative(root, from)} (tidak ada)`);
    continue;
  }

  await mkdir(path.dirname(to), { recursive: true });
  await cp(from, to, { recursive: true });
  console.log(`copy ${path.relative(root, from)} -> ${path.relative(root, to)}`);
}

// Next.js ikut menyalin file .env dari root proyek ke bundle standalone.
// Jangan sampai kredensial lokal ikut terupload; produksi memakai env vars cPanel.
const removedEnvFiles = [];

for (const entry of await readdir(standalone, { withFileTypes: true })) {
  if (!entry.isDirectory() && entry.name.startsWith(".env")) {
    await rm(path.join(standalone, entry.name));
    removedEnvFiles.push(entry.name);
  }
}

if (removedEnvFiles.length > 0) {
  console.log(`hapus ${removedEnvFiles.join(", ")} dari bundle standalone`);
} else {
  console.log("tidak ada file .env di bundle standalone");
}

console.log("Bundle siap diupload: .next/standalone");
