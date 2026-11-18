export const MAX_IMPORT_ROWS = 200;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value) && value.length <= 255;
}

/** "Budi Santoso" → "budi.santoso" */
export function slugifyName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".")
    .slice(0, 40)
    .replace(/\.+$/, "");

  return slug || "siswa";
}

/** Tambahkan angka di belakang kalau username sudah dipakai. */
export function nextUsername(name: string, taken: Set<string>): string {
  const base = slugifyName(name);
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}${suffix}`)) suffix += 1;

  return `${base}${suffix}`;
}

/**
 * Parser CSV sederhana yang mendukung tanda kutip dan koma di dalam sel.
 * Mengembalikan baris berisi kolom; baris kosong dibuang.
 */
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }

      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

/** "2026-2027" / "2026 / 2027" → "2026/2027" */
export function normalizeAcademicYear(value: string): string {
  const match = /^(\d{4})\s*[/-]\s*(\d{4})$/.exec(value.trim());
  return match ? `${match[1]}/${match[2]}` : value.trim();
}

/** Judul kolom dinormalisasi supaya "Tahun Ajaran" === "tahun_ajaran". */
export function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "_");
}

export type ImportColumn = "nomor" | "nama" | "kelas" | "tahun_ajaran" | "email";

const HEADER_ALIASES: Record<ImportColumn, string[]> = {
  nomor: ["nomor", "no", "nomer", "no_urut", "nomor_urut"],
  nama: ["nama", "name", "nama_siswa", "nama_lengkap"],
  kelas: ["kelas", "class", "rombel"],
  tahun_ajaran: [
    "tahun_ajaran",
    "tahun_ajaran_ta",
    "tahun",
    "ta",
    "academic_year",
  ],
  email: ["email", "e_mail", "surel", "alamat_email"],
};

export function resolveHeaderRow(header: string[]): Partial<Record<ImportColumn, number>> {
  const normalized = header.map(normalizeHeader);
  const map: Partial<Record<ImportColumn, number>> = {};

  for (const column of Object.keys(HEADER_ALIASES) as ImportColumn[]) {
    const aliases = HEADER_ALIASES[column];
    const index = normalized.findIndex((cell) => aliases.includes(cell));
    if (index !== -1) map[column] = index;
  }

  return map;
}

