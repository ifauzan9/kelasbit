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

// Next.js file tracing kadang hanya menyalin sebagian file sebuah paket
// (mis. file .mjs yang dirujuk lewat "exports"). Akibatnya paket seperti
// `generator-function` (transitif dari exceljs) gagal di-require di produksi.
// Lengkapi file yang hilang dari node_modules root supaya bundle benar-benar jalan.
const SKIP_DIRS = new Set(["node_modules", "test", "tests", "__tests__", ".github", "docs"]);
// File .mjs/.cjs sering terlewat karena file tracing hanya menyalin hasil resolve
// tertentu; file inilah yang biasanya bikin `MODULE_NOT_FOUND` di produksi.
const RUNTIME_EXTENSIONS = new Set([".mjs", ".cjs"]);

async function fillMissingFiles(sourceDir, targetDir) {
  const filled = [];
  const entries = await readdir(sourceDir, { withFileTypes: true });

  await mkdir(targetDir, { recursive: true });

  for (const entry of entries) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;

    const from = path.join(sourceDir, entry.name);
    const to = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      filled.push(...(await fillMissingFiles(from, to)));
      continue;
    }

    if (!RUNTIME_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    if (existsSync(to)) continue;

    await cp(from, to);
    filled.push(path.relative(standalone, to));
  }

  return filled;
}

const rootModules = path.join(root, "node_modules");
const bundleModules = path.join(standalone, "node_modules");

// Jangan sentuh paket framework: menambah file di sana bisa mengubah cara Node
// me-resolve "exports" dan justru merusak Server Action di produksi.
const FRAMEWORK_PACKAGES = new Set([
  "next",
  "react",
  "react-dom",
  "react-is",
  "@next",
  "@swc",
  "styled-jsx",
]);

if (!process.env.DEPLOY_SKIP_FILL && existsSync(rootModules) && existsSync(bundleModules)) {
  const filled = [];

  for (const entry of await readdir(bundleModules, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (FRAMEWORK_PACKAGES.has(entry.name)) continue;

    const source = path.join(rootModules, entry.name);
    if (!existsSync(source)) continue;

    filled.push(...(await fillMissingFiles(source, path.join(bundleModules, entry.name))));
  }

  if (filled.length > 0) {
    console.log(`lengkapi ${filled.length} file paket yang tidak tersalin Next.js`);
    for (const file of filled.slice(0, 10)) console.log(`  + ${file}`);
    if (filled.length > 10) console.log(`  … dan ${filled.length - 10} file lain`);
  }
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
