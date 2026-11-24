export type OutputScoreBreakdown = {
  exact: boolean;
  /** Selalu 1 untuk output exact, 0 untuk output yang berbeda. */
  similarity: number;
  /** Rasio nilai output final 0..1. */
  ratio: number;
  changedLines: number;
  missingLines: number;
  extraLines: number;
};

/**
 * Normalisasi minimum untuk perbandingan output:
 * - CRLF diseragamkan menjadi LF;
 * - satu newline di akhir output dibuang (karena `print()` selalu menambahnya);
 * - spasi, huruf, dan tanda baca tidak diubah.
 */
export function normalizeOutput(value: string): string {
  const normalized = value.replace(/\r\n?/g, "\n");
  return normalized.endsWith("\n") ? normalized.slice(0, -1) : normalized;
}

/**
 * Penilaian output strict.
 *
 * Output harus sama persis dengan target: huruf, tanda baca, spasi awal,
 * spasi antarkata, dan spasi akhir baris. Output yang berbeda tidak mendapat
 * nilai parsial.
 */
export function scoreOutput(
  expectedRaw: string,
  actualRaw: string,
): OutputScoreBreakdown {
  const expectedText = normalizeOutput(expectedRaw);
  const actualText = normalizeOutput(actualRaw);
  const exact = expectedText === actualText;

  if (exact) {
    return {
      exact: true,
      similarity: 1,
      ratio: 1,
      changedLines: 0,
      missingLines: 0,
      extraLines: 0,
    };
  }

  const expectedLines = expectedText ? expectedText.split("\n") : [];
  const actualLines = actualText ? actualText.split("\n") : [];
  const common = Math.min(expectedLines.length, actualLines.length);
  let changedLines = 0;

  for (let index = 0; index < common; index += 1) {
    if (expectedLines[index] !== actualLines[index]) changedLines += 1;
  }

  return {
    exact: false,
    similarity: 0,
    ratio: 0,
    changedLines,
    missingLines: Math.max(0, expectedLines.length - actualLines.length),
    extraLines: Math.max(0, actualLines.length - expectedLines.length),
  };
}
