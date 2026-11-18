export const SUBJECTS = ["Informatika", "KKA"] as const;

export type Subject = (typeof SUBJECTS)[number];

const ACADEMIC_YEAR_PATTERN = /^(\d{4})\/(\d{4})$/;

/** Tahun ajaran berjalan; berganti tiap Juli. Contoh: "2026/2027". */
export function currentAcademicYear(now = new Date()): string {
  const year = now.getFullYear();
  const start = now.getMonth() + 1 >= 7 ? year : year - 1;
  return `${start}/${start + 1}`;
}

/** Pilihan tahun ajaran: dua tahun ke belakang sampai satu tahun ke depan. */
export function academicYearOptions(now = new Date()): string[] {
  const currentStart = Number(currentAcademicYear(now).slice(0, 4));

  return Array.from({ length: 4 }, (_, index) => {
    const start = currentStart - 2 + index;
    return `${start}/${start + 1}`;
  });
}

export function isValidAcademicYear(value: string): boolean {
  const match = ACADEMIC_YEAR_PATTERN.exec(value);
  if (!match) return false;

  return Number(match[2]) === Number(match[1]) + 1;
}
