import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path, { dirname, normalize, sep } from "node:path";
import { randomUUID } from "node:crypto";

// ============================================================================
// Penyimpanan berkas tugas di filesystem hosting (pengganti Supabase Storage).
//
// Berkas disimpan di direktori di LUAR `public/` (default: ./berkas-tugas,
// diatur lewat env UPLOAD_DIR) supaya tidak bisa diakses langsung tanpa
// melewati pemeriksaan sesi. Pengunduhan dilayani route handler
// /berkas-tugas/[...path] yang memanggil requireSiswa/requireGuru.
//
// `path` yang disimpan di tabel assignment_files berbentuk:
//   tugas/<tugasId>/<submissionId>/<uuid>-<nama-file>
// ============================================================================

const DIR_DASAR = process.env.UPLOAD_DIR || "./berkas-tugas";

function akar(): string {
  // turbopackIgnore: jalur ini dihitung saat runtime, bukan saat build, supaya
  // Turbopack tidak menyeret seluruh isi proyek ke bundel server.
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), DIR_DASAR);
}

// Cegah path traversal: hasil resolve wajib tetap di dalam akar.
function pathAman(pathRelatif: string): string {
  const bersih = normalize(pathRelatif).replace(/^([/\\])+/, "");
  const dasar = akar();
  const penuh = path.resolve(/*turbopackIgnore: true*/ dasar, bersih);

  if (penuh !== dasar && !penuh.startsWith(dasar + sep)) {
    throw new Error("Path berkas tidak valid.");
  }

  return penuh;
}

// Simpan buffer ke disk; kembalikan path relatif yang disimpan di database.
export async function simpanBerkas(
  pathRelatif: string,
  isi: Buffer,
): Promise<string> {
  const penuh = pathAman(pathRelatif);
  await mkdir(dirname(penuh), { recursive: true });
  await writeFile(penuh, isi);
  return normalize(pathRelatif).replace(/\\/g, "/");
}

// Baca berkas; null kalau tidak ada.
export async function bacaBerkas(pathRelatif: string): Promise<Buffer | null> {
  try {
    return await readFile(pathAman(pathRelatif));
  } catch {
    return null;
  }
}

// Hapus berkas. Tidak melempar error kalau berkas sudah tidak ada.
export async function hapusBerkas(pathRelatif: string | null | undefined) {
  if (!pathRelatif) return;
  await rm(pathAman(pathRelatif), { force: true }).catch(() => {});
}

// Hapus seluruh isi satu folder (mis. semua berkas satu tugas).
export async function hapusFolder(pathRelatif: string) {
  if (!pathRelatif) return;
  await rm(pathAman(pathRelatif), { recursive: true, force: true }).catch(
    () => {},
  );
}

// Nama berkas unik untuk disimpan di disk.
export function namaBerkasBaru(namaAsli: string, namaAman: string): string {
  return `${randomUUID()}-${namaAman || "berkas"}`;
}

export { pathAman, akar };
export const folderTugas = (tugasId: string) => path.join("tugas", tugasId);
export const folderPengumpulan = (tugasId: string, submissionId: string) =>
  path.join("tugas", tugasId, submissionId);
