/** Normalisasi output untuk auto-grade: newline, spasi akhir baris, trim. */
export function normalizeOutput(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();
}

/**
 * Skor otomatis: nilai penuh bila output sama (setelah normalisasi),
 * 0 bila berbeda. `null` berarti perlu dinilai guru (expected output kosong).
 */
export function autoScore(
  stdout: string,
  expectedOutput: string,
  maxScore: number,
): number | null {
  if (!expectedOutput.trim()) return null;

  return normalizeOutput(stdout) === normalizeOutput(expectedOutput)
    ? maxScore
    : 0;
}
