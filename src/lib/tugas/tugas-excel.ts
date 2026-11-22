import ExcelJS from "exceljs";
import type {
  TugasRoster,
  TugasRosterRow,
  TugasRosterStatus,
  TugasView,
} from "@/lib/tugas/types";

const COLUMN_COUNT = 11;

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF047857" },
};

const TITLE_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF0F172A" },
};

const META_LABEL_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF1F5F9" },
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFE2E8F0" } },
  left: { style: "thin", color: { argb: "FFE2E8F0" } },
  bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
  right: { style: "thin", color: { argb: "FFE2E8F0" } },
};

const STATUS_STYLE: Record<
  TugasRosterStatus,
  { label: string; fill: string; font: string }
> = {
  lulus: { label: "Lulus", fill: "FFD1FAE5", font: "FF065F46" },
  belum_lulus: { label: "Belum lulus", fill: "FFFEF3C7", font: "FF92400E" },
  mengerjakan: { label: "Sudah mengerjakan", fill: "FFE0F2FE", font: "FF075985" },
  belum_mengerjakan: {
    label: "Belum mengerjakan",
    fill: "FFF1F5F9",
    font: "FF475569",
  },
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null): string {
  if (!value) return "—";
  return `${dateFormatter.format(new Date(value))} WIB`;
}

function targetLabel(tugas: TugasView, roster: TugasRoster): string {
  if (tugas.targetType === "semua") return "Semua kelas";
  if (tugas.targetType === "kelas") return tugas.kelasLabel ?? "Kelas";
  return `${roster.assignedCount} siswa tertentu`;
}

function lastScoreLabel(row: TugasRosterRow): string | number {
  if (row.attempts === 0) return "—";
  if (row.lastScore === null) return "Belum dinilai";
  return row.lastScore;
}

export async function buildTugasProgressExcel(
  tugas: TugasView,
  roster: TugasRoster,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "KelasBit";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Progres Tugas", {
    views: [{ state: "frozen", ySplit: 7 }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    },
  });

  sheet.columns = [
    { width: 6 },
    { width: 26 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 11 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 22 },
    { width: 11 },
  ];

  const titleRow = sheet.addRow([`PROGRES TUGAS — ${tugas.title}`]);
  sheet.mergeCells(titleRow.number, 1, titleRow.number, COLUMN_COUNT);
  titleRow.height = 32;
  titleRow.getCell(1).font = {
    bold: true,
    size: 15,
    color: { argb: "FFFFFFFF" },
  };
  titleRow.getCell(1).fill = TITLE_FILL;
  titleRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };

  const metaRows: [string, string | number, string, string | number, string, string | number][] =
    [
      [
        "Jenis",
        tugas.jenis.toUpperCase(),
        "Target",
        targetLabel(tugas, roster),
        "KKM",
        tugas.minScore === null ? "Tanpa KKM" : tugas.minScore,
      ],
      [
        "Batas waktu",
        tugas.dueAt ? formatDate(tugas.dueAt) : "Tanpa batas waktu",
        "Nilai maksimal",
        tugas.maxScore,
        "Siswa ditugaskan",
        roster.assignedCount,
      ],
      [
        "Lulus KKM",
        roster.hasKkm ? roster.passedCount : "—",
        "Belum lulus",
        roster.hasKkm ? roster.failedCount : "—",
        "Belum mengerjakan",
        roster.notStartedCount,
      ],
      [
        "Akun nonaktif",
        roster.inactiveCount,
        "Sudah mengerjakan",
        roster.workedCount,
        "Dibuat",
        formatDate(new Date().toISOString()),
      ],
    ];

  for (const values of metaRows) {
    const row = sheet.addRow([
      values[0],
      values[1],
      "",
      values[2],
      values[3],
      "",
      values[4],
      values[5],
      "",
      "",
      "",
    ]);
    row.height = 20;
    [1, 4, 7].forEach((column) => {
      const cell = row.getCell(column);
      cell.font = { bold: true, size: 10, color: { argb: "FF64748B" } };
      cell.fill = META_LABEL_FILL;
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: "middle" };
    });
    [2, 5, 8].forEach((column) => {
      const cell = row.getCell(column);
      cell.font = { bold: true, size: 10, color: { argb: "FF0F172A" } };
      cell.alignment = { vertical: "middle", wrapText: true };
    });
  }

  sheet.addRow([]);

  const header = sheet.addRow([
    "No",
    "Nama",
    "Username",
    "Kelas",
    "Status",
    "Percobaan",
    "Nilai Terakhir",
    "Nilai Terbaik",
    "Lulus KKM",
    "Terakhir Mengumpulkan",
    "Akun",
  ]);
  header.height = 28;
  header.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = HEADER_FILL;
    cell.border = THIN_BORDER;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  });

  roster.rows.forEach((row, index) => {
    const status = STATUS_STYLE[row.status];
    const dataRow = sheet.addRow([
      index + 1,
      row.name,
      row.username ?? "—",
      row.kelasLabel ?? "Tanpa kelas",
      status.label,
      row.attempts,
      lastScoreLabel(row),
      row.bestScore ?? "—",
      roster.hasKkm ? (row.passed ? "Ya" : "Tidak") : "—",
      formatDate(row.lastSubmittedAt),
      row.isActive ? "Aktif" : "Nonaktif",
    ]);

    dataRow.height = 20;
    dataRow.eachCell((cell, column) => {
      cell.font = { size: 10, color: { argb: "FF334155" } };
      cell.border = THIN_BORDER;
      cell.alignment = {
        vertical: "middle",
        horizontal: column === 1 || column === 6 ? "center" : "left",
        wrapText: column === 2 || column === 4 || column === 10,
      };
    });

    const statusCell = dataRow.getCell(5);
    statusCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: status.fill },
    };
    statusCell.font = { bold: true, size: 10, color: { argb: status.font } };
    statusCell.alignment = { vertical: "middle", horizontal: "center" };

    const lulusCell = dataRow.getCell(9);
    lulusCell.alignment = { vertical: "middle", horizontal: "center" };
    if (roster.hasKkm && row.passed) {
      lulusCell.font = { bold: true, size: 10, color: { argb: "FF047857" } };
    }
  });

  const lastRow = sheet.rowCount;
  sheet.autoFilter = {
    from: { row: 7, column: 1 },
    to: { row: lastRow, column: COLUMN_COUNT },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
