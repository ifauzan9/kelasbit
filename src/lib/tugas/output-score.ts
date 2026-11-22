const MAX_PARTIAL_RATIO = 0.92;
const CHANGED_LINE_PENALTY = 0.015;
const GAP_LINE_PENALTY = 0.03;
const MAX_LINE_PENALTY = 0.2;
const MIN_LINE_SIMILARITY = 0.55;
const ALIGN_WINDOW = 8;
const LEVENSHTEIN_LIMIT = 2_000_000;

export type OutputScoreBreakdown = {
  exact: boolean;
  /** Kemiripan baris 0..1, sebelum penalti dan batas nilai parsial. */
  similarity: number;
  /** Rasio nilai output final 0..1. */
  ratio: number;
  changedLines: number;
  missingLines: number;
  extraLines: number;
};

/** Normalisasi output untuk auto-grade: newline, spasi akhir baris, trim. */
export function normalizeOutput(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();
}

function toLines(value: string): string[] {
  if (!value) return [];
  return value.split("\n");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const left = a.length <= b.length ? a : b;
  const right = a.length <= b.length ? b : a;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  let current = new Array<number>(right.length + 1);

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const substitution = previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1);
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        substitution,
      );
    }
    [previous, current] = [current, previous];
  }

  return previous[right.length];
}

/** Fallback cepat untuk baris sangat panjang. */
function bigramSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const counts = new Map<string, number>();
  for (let index = 0; index < a.length - 1; index += 1) {
    const gram = a.slice(index, index + 2);
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }

  let overlap = 0;
  for (let index = 0; index < b.length - 1; index += 1) {
    const gram = b.slice(index, index + 2);
    const available = counts.get(gram) ?? 0;
    if (available > 0) {
      overlap += 1;
      counts.set(gram, available - 1);
    }
  }

  return (2 * overlap) / (a.length - 1 + b.length - 1);
}

function lineSimilarity(expected: string, actual: string): number {
  if (expected === actual) return 1;
  if (!expected || !actual) return 0;

  const maxLength = Math.max(expected.length, actual.length);
  if (expected.length * actual.length > LEVENSHTEIN_LIMIT) {
    return bigramSimilarity(expected, actual);
  }

  return 1 - levenshtein(expected, actual) / maxLength;
}

type Pair = {
  expectedIndex: number;
  actualIndex: number;
  similarity: number;
};

function alignLines(
  expected: string[],
  actual: string[],
): { pairs: Pair[]; usedActual: Set<number> } {
  const pairs: Pair[] = [];
  const usedActual = new Set<number>();

  if (expected.length === actual.length) {
    expected.forEach((line, index) => {
      pairs.push({
        expectedIndex: index,
        actualIndex: index,
        similarity: lineSimilarity(line, actual[index]),
      });
      usedActual.add(index);
    });
    return { pairs, usedActual };
  }

  let actualStart = 0;
  for (let expectedIndex = 0; expectedIndex < expected.length; expectedIndex += 1) {
    let bestIndex = -1;
    let bestSimilarity = 0;
    const end = Math.min(actual.length, actualStart + ALIGN_WINDOW);

    for (let actualIndex = actualStart; actualIndex < end; actualIndex += 1) {
      const similarity = lineSimilarity(
        expected[expectedIndex],
        actual[actualIndex],
      );
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestIndex = actualIndex;
      }
    }

    if (bestIndex >= 0 && bestSimilarity >= MIN_LINE_SIMILARITY) {
      pairs.push({
        expectedIndex,
        actualIndex: bestIndex,
        similarity: bestSimilarity,
      });
      usedActual.add(bestIndex);
      actualStart = bestIndex + 1;
    }
  }

  return { pairs, usedActual };
}

/**
 * Nilai output dengan toleransi typo kecil.
 *
 * - Output identik = 1.
 * - Output tidak identik maksimal 92% dari bobot output.
 * - Kemiripan dihitung per baris, sehingga satu huruf hilang tidak langsung 0.
 * - Baris hilang/tambahan dan jumlah baris berbeda mengurangi nilai.
 */
export function scoreOutput(
  expectedRaw: string,
  actualRaw: string,
): OutputScoreBreakdown {
  const expectedText = normalizeOutput(expectedRaw);
  const actualText = normalizeOutput(actualRaw);

  if (expectedText === actualText) {
    return {
      exact: true,
      similarity: 1,
      ratio: 1,
      changedLines: 0,
      missingLines: 0,
      extraLines: 0,
    };
  }

  const expected = toLines(expectedText);
  const actual = toLines(actualText);

  if (expected.length === 0 || actual.length === 0) {
    return {
      exact: false,
      similarity: 0,
      ratio: 0,
      changedLines: 0,
      missingLines: expected.length,
      extraLines: actual.length,
    };
  }

  const { pairs, usedActual } = alignLines(expected, actual);
  const pairByExpected = new Map(pairs.map((pair) => [pair.expectedIndex, pair]));

  let numerator = 0;
  let denominator = 0;
  let changedLines = 0;
  let missingLines = 0;

  expected.forEach((line, index) => {
    const weight = Math.max(1, line.length);
    denominator += weight;

    const pair = pairByExpected.get(index);
    if (!pair) {
      missingLines += 1;
      return;
    }

    if (pair.similarity === 1) {
      numerator += weight;
      return;
    }

    changedLines += 1;
    if (pair.similarity >= MIN_LINE_SIMILARITY) {
      numerator += weight * pair.similarity;
    }
  });

  let extraLines = 0;
  actual.forEach((line, index) => {
    if (usedActual.has(index)) return;
    extraLines += 1;
    denominator += Math.max(1, line.length);
  });

  const similarity = denominator > 0 ? numerator / denominator : 0;
  const penalty = Math.min(
    MAX_LINE_PENALTY,
    changedLines * CHANGED_LINE_PENALTY +
      (missingLines + extraLines) * GAP_LINE_PENALTY,
  );
  const ratio = Math.max(
    0,
    Math.min(MAX_PARTIAL_RATIO, similarity * MAX_PARTIAL_RATIO - penalty),
  );

  return {
    exact: false,
    similarity,
    ratio,
    changedLines,
    missingLines,
    extraLines,
  };
}
