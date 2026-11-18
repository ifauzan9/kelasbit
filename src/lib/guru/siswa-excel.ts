import ExcelJS from "exceljs";
import type { KelasOption } from "@/lib/guru/types";

export type SpreadsheetRow = {
  /** Nomor baris asli di file, dipakai untuk pesan error. */
  rowNumber: number;
  cells: string[];
};

export type SpreadsheetRead = {
  rows: SpreadsheetRow[];
  sheetName: string;
  format: "xlsx" | "csv";
};

export const TEMPLATE_SHEET = "Data Siswa";

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("formula" in value || "sharedFormula" in value) {
      const result = (value as { result?: ExcelJS.CellValue }).result;
      return result === undefined ? "" : cellToString(result);
    }
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }
    if ("error" in value) return "";
  }

  return String(value);
}

function isBlankRow(cells: string[]): boolean {
  return cells.every((cell) => cell.trim() === "");
}

/** Baca .xlsx dari buffer jadi baris teks; baris kosong dibuang. */
export async function readXlsx(buffer: ArrayBuffer): Promise<SpreadsheetRead> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet =
    workbook.getWorksheet(TEMPLATE_SHEET) ??
    workbook.worksheets.find((item) => item.rowCount > 0) ??
    workbook.worksheets[0];

  if (!sheet) {
    return { rows: [], sheetName: "", format: "xlsx" };
  }

  const rows: SpreadsheetRow[] = [];
  const maxColumn = Math.max(sheet.columnCount, 5);

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const cells: string[] = [];

    for (let column = 1; column <= maxColumn; column += 1) {
      cells.push(cellToString(row.getCell(column).value).trim());
    }

    if (!isBlankRow(cells)) rows.push({ rowNumber, cells });
  });

  return { rows, sheetName: sheet.name, format: "xlsx" };
}

/** Apakah file ini xlsx (zip) atau teks biasa? */
export function detectSpreadsheetFormat(buffer: ArrayBuffer): "xlsx" | "csv" {
  const bytes = new Uint8Array(buffer.slice(0, 4));
  return bytes[0] === 0x50 && bytes[1] === 0x4b ? "xlsx" : "csv";
}

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF065F46" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 11,
};

const BORDER: Partial<ExcelJS.Borders> = {
  bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
};

const TEMPLATE_COLUMNS: { header: string; width: number; note: string }[] = [
  {
    header: "nomor",
    width: 9,
    note: "Nomor urut. Tidak disimpan ke database, hanya membantu pengecekan.",
  },
  { header: "nama", width: 30, note: "Wajib. Nama lengkap siswa." },
  {
    header: "kelas",
    width: 14,
    note: "Opsional. Pilih dari daftar kelas di sheet \"Daftar Kelas\".",
  },
  {
    header: "tahun_ajaran",
    width: 16,
    note: "Opsional. Isi kalau nama kelas ada di lebih dari satu tahun ajaran.",
  },
  {
    header: "email",
    width: 32,
    note: "Opsional. Harus unik antar akun.",
  },
];

const MAX_TEMPLATE_ROWS = 200;

/**
 * Bangun template .xlsx: sheet data kosong + contoh + daftar kelas.
 * Kolom kelas diberi dropdown ke sheet "Daftar Kelas".
 */
export async function buildSiswaTemplate(kelasList: KelasOption[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "KelasBit";
  workbook.created = new Date();

  const data = workbook.addWorksheet(TEMPLATE_SHEET);
  data.columns = TEMPLATE_COLUMNS.map((column) => ({
    header: column.header,
    width: column.width,
  }));

  const headerRow = data.getRow(1);
  headerRow.height = 22;
  headerRow.font = HEADER_FONT;
  headerRow.alignment = { vertical: "middle" };

  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.border = BORDER;
  });

  TEMPLATE_COLUMNS.forEach((column, index) => {
    data.getCell(1, index + 1).note = column.note;
  });

  data.views = [{ state: "frozen", ySplit: 1 }];

  const lessonRows: { kelas: string; years: string }[] = [];
  const yearsByName = new Map<string, Set<string>>();

  for (const item of kelasList) {
    const name = item.name.trim();
    if (!name) continue;

    const years = yearsByName.get(name.toLowerCase()) ?? new Set<string>();
    years.add(item.academicYear);
    yearsByName.set(name.toLowerCase(), years);
  }

  for (const [key, years] of yearsByName) {
    lessonRows.push({
      kelas: kelasList.find((item) => item.name.trim().toLowerCase() === key)?.name ?? key,
      years: [...years].sort().join(", "),
    });
  }

  lessonRows.sort((a, b) => a.kelas.localeCompare(b.kelas, "id"));

  if (lessonRows.length > 0) {
    const lastRow = lessonRows.length + 1;

    for (let row = 2; row <= MAX_TEMPLATE_ROWS + 1; row += 1) {
      data.getCell(row, 3).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`'Daftar Kelas'!$A$2:$A$${lastRow}`],
        showErrorMessage: true,
        errorTitle: "Kelas tidak dikenal",
        error: "Pilih nama kelas dari daftar di sheet Daftar Kelas.",
      };
    }
  }

  const example = workbook.addWorksheet("Contoh");
  example.columns = [
    { width: 9 },
    { width: 30 },
    { width: 14 },
    { width: 16 },
    { width: 32 },
  ];

  example.getCell(1, 1).value = "Contoh pengisian — sheet ini TIDAK ikut diimport.";
  example.getCell(1, 1).font = { bold: true, size: 12, color: { argb: "FF065F46" } };
  example.mergeCells(1, 1, 1, 5);

  const exampleHeader = example.getRow(3);
  exampleHeader.values = ["nomor", "nama", "kelas", "tahun_ajaran", "email"];
  exampleHeader.font = HEADER_FONT;
  exampleHeader.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.border = BORDER;
  });

  const sampleClass = lessonRows[0];
  const samples: (string | number)[][] = [
    [
      1,
      "Budi Santoso",
      sampleClass?.kelas ?? "",
      sampleClass?.years.split(",").sort()[0]?.trim() ?? "",
      "budi@sekolah.sch.id",
    ],
    [2, "Siti Aminah", sampleClass?.kelas ?? "", "", ""],
  ];

  samples.forEach((values, index) => {
    example.getRow(index + 4).values = values;
  });

  const notes = [
    "",
    "Catatan:",
    "1. Isi data siswa di sheet \"Data Siswa\", mulai baris 2.",
    "2. Kolom nama wajib; kelas, tahun_ajaran, dan email opsional.",
    "3. Username dan password dibuat otomatis oleh sistem.",
    "4. Kalau nama kelas ada di beberapa tahun ajaran, isi kolom tahun_ajaran.",
    "5. Maksimal 200 siswa per sekali import.",
  ];

  notes.forEach((note, index) => {
    example.getCell(index + 7, 1).value = note;
    example.getCell(index + 7, 1).font = index === 1 ? { bold: true } : { size: 10 };
    example.mergeCells(index + 7, 1, index + 7, 5);
  });

  const list = workbook.addWorksheet("Daftar Kelas");
  list.columns = [
    { header: "kelas", width: 18 },
    { header: "tahun_ajaran tersedia", width: 28 },
  ];
  list.getRow(1).font = HEADER_FONT;
  list.getRow(1).eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.border = BORDER;
  });
  list.views = [{ state: "frozen", ySplit: 1 }];

  if (lessonRows.length === 0) {
    list.getCell(2, 1).value = "Belum ada kelas";
    list.getCell(2, 2).value = "Tambahkan kelas di /guru/kelas";
  } else {
    lessonRows.forEach((item, index) => {
      list.getCell(index + 2, 1).value = item.kelas;
      list.getCell(index + 2, 2).value = item.years;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
