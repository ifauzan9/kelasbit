export type OutputDiffKind =
  | "karakter berbeda"
  | "spasi berbeda"
  | "spasi vs karakter"
  | "karakter kurang"
  | "karakter tambahan";

export type OutputFirstDiff = {
  column: number;
  expectedChar: string | null;
  actualChar: string | null;
  kind: OutputDiffKind;
};

export type OutputLineDiff = {
  type: "changed" | "missing" | "extra";
  /** Nomor baris yang dibandingkan (1-based). */
  line: number;
  expected: string | null;
  actual: string | null;
  firstDiff?: OutputFirstDiff;
};

export type OutputDiffResult = {
  identical: boolean;
  expectedLines: number;
  actualLines: number;
  changedCount: number;
  missingCount: number;
  extraCount: number;
  diffs: OutputLineDiff[];
};

function toLines(value: string): string[] {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function firstDifference(expected: string, actual: string): OutputFirstDiff {
  const length = Math.max(expected.length, actual.length);

  for (let index = 0; index < length; index += 1) {
    const expectedChar = index < expected.length ? expected[index] : null;
    const actualChar = index < actual.length ? actual[index] : null;

    if (expectedChar === actualChar) continue;

    let kind: OutputDiffKind = "karakter berbeda";

    if (expectedChar === null) {
      kind = "karakter tambahan";
    } else if (actualChar === null) {
      kind = "karakter kurang";
    } else {
      const expectedSpace = /\s/.test(expectedChar);
      const actualSpace = /\s/.test(actualChar);

      if (expectedSpace && actualSpace) kind = "spasi berbeda";
      else if (expectedSpace || actualSpace) kind = "spasi vs karakter";
    }

    return {
      column: index + 1,
      expectedChar,
      actualChar,
      kind,
    };
  }

  return { column: 0, expectedChar: null, actualChar: null, kind: "karakter berbeda" };
}

function lcsOps(expected: string[], actual: string[]) {
  const n = expected.length;
  const m = actual.length;
  const table = Array.from({ length: n + 1 }, () =>
    new Uint16Array(m + 1),
  );

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      table[i][j] =
        expected[i] === actual[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const ops: { type: "same" | "missing" | "extra"; expected?: string; actual?: string }[] = [];
  let i = 0;
  let j = 0;

  while (i < n && j < m) {
    if (expected[i] === actual[j]) {
      ops.push({ type: "same", expected: expected[i], actual: actual[j] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      ops.push({ type: "missing", expected: expected[i] });
      i += 1;
    } else {
      ops.push({ type: "extra", actual: actual[j] });
      j += 1;
    }
  }

  while (i < n) {
    ops.push({ type: "missing", expected: expected[i] });
    i += 1;
  }
  while (j < m) {
    ops.push({ type: "extra", actual: actual[j] });
    j += 1;
  }

  return ops;
}

/**
 * Bandingkan output siswa dengan expected output untuk diagnostik guru.
 * Spasi di akhir baris TIDAK diabaikan di sini (auto-grade tetap menormalkannya).
 */
export function compareOutput(
  expectedRaw: string,
  actualRaw: string,
): OutputDiffResult {
  const expected = toLines(expectedRaw);
  const actual = toLines(actualRaw);
  const diffs: OutputLineDiff[] = [];

  if (expected.length === actual.length) {
    expected.forEach((line, index) => {
      if (line === actual[index]) return;

      diffs.push({
        type: "changed",
        line: index + 1,
        expected: line,
        actual: actual[index],
        firstDiff: firstDifference(line, actual[index]),
      });
    });
  } else {
    let expectedIndex = 0;
    let actualIndex = 0;

    for (const op of lcsOps(expected, actual)) {
      if (op.type === "same") {
        expectedIndex += 1;
        actualIndex += 1;
        continue;
      }

      if (op.type === "missing") {
        expectedIndex += 1;
        diffs.push({
          type: "missing",
          line: expectedIndex,
          expected: op.expected ?? null,
          actual: null,
        });
      } else {
        actualIndex += 1;
        diffs.push({
          type: "extra",
          line: actualIndex,
          expected: null,
          actual: op.actual ?? null,
        });
      }
    }
  }

  const changedCount = diffs.filter((diff) => diff.type === "changed").length;
  const missingCount = diffs.filter((diff) => diff.type === "missing").length;
  const extraCount = diffs.filter((diff) => diff.type === "extra").length;

  return {
    identical: diffs.length === 0,
    expectedLines: expected.length,
    actualLines: actual.length,
    changedCount,
    missingCount,
    extraCount,
    diffs,
  };
}
