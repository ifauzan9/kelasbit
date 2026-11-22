import { AlertCircle, CheckCircle2 } from "@/components/icons";
import {
  compareOutput,
  type OutputFirstDiff,
  type OutputLineDiff,
} from "@/lib/tugas/output-diff";

function charLabel(char: string | null): string {
  if (char === null) return "tidak ada";
  if (char === " ") return "spasi";
  if (char === "\t") return "tab";
  return `"${char}"`;
}

function visibleLine(line: string | null): string {
  if (line === null) return "";
  if (line === "") return "(baris kosong)";
  return line.replace(/ /g, "·").replace(/\t/g, "→");
}

function DiffExplanation({ diff }: { diff: OutputLineDiff }) {
  if (diff.type === "missing") {
    return (
      <p className="text-[11px] font-semibold text-rose-700">
        Baris {diff.line} tidak ada di output siswa.
      </p>
    );
  }

  if (diff.type === "extra") {
    return (
      <p className="text-[11px] font-semibold text-rose-700">
        Baris {diff.line} tambahan di output siswa.
      </p>
    );
  }

  const first: OutputFirstDiff | undefined = diff.firstDiff;
  if (!first) return null;

  return (
    <p className="text-[11px] leading-relaxed text-rose-700">
      Baris {diff.line}: <strong>{first.kind}</strong> di kolom{" "}
      {first.column} — harapan {charLabel(first.expectedChar)}, hasil{" "}
      {charLabel(first.actualChar)}.
    </p>
  );
}

function LineComparison({
  diff,
}: {
  diff: OutputLineDiff;
}) {
  return (
    <li className="rounded-xl border border-rose-100 bg-white p-2.5">
      <DiffExplanation diff={diff} />

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {diff.expected !== null ? (
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">
              Harapan
            </p>
            <pre className="mt-1 overflow-auto whitespace-pre rounded-md bg-slate-50 p-2 font-mono text-[11px] text-slate-700 ring-1 ring-slate-200">
              {visibleLine(diff.expected)}
            </pre>
          </div>
        ) : null}

        {diff.actual !== null ? (
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">
              Hasil siswa
            </p>
            <pre className="mt-1 overflow-auto whitespace-pre rounded-md bg-rose-50/60 p-2 font-mono text-[11px] text-rose-800 ring-1 ring-rose-100">
              {visibleLine(diff.actual)}
            </pre>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function OutputDiffPanel({
  expectedOutput,
  actualOutput,
}: {
  expectedOutput: string;
  actualOutput: string;
}) {
  if (!expectedOutput.trim()) return null;

  const diff = compareOutput(expectedOutput, actualOutput);
  const visible = diff.diffs.slice(0, 8);
  const remaining = diff.diffs.length - visible.length;

  if (diff.identical) {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[11px] font-semibold text-emerald-800">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        Output siswa sama persis dengan target ({diff.expectedLines} baris).
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50/50 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-rose-700">
          <AlertCircle className="h-3.5 w-3.5" />
          Perbedaan output
        </p>
        <div className="flex flex-wrap gap-1.5 text-[9px] font-bold">
          {diff.changedCount > 0 ? (
            <span className="rounded-full bg-white px-2 py-0.5 text-rose-700 ring-1 ring-rose-200">
              {diff.changedCount} baris berbeda
            </span>
          ) : null}
          {diff.missingCount > 0 ? (
            <span className="rounded-full bg-white px-2 py-0.5 text-rose-700 ring-1 ring-rose-200">
              {diff.missingCount} baris hilang
            </span>
          ) : null}
          {diff.extraCount > 0 ? (
            <span className="rounded-full bg-white px-2 py-0.5 text-rose-700 ring-1 ring-rose-200">
              {diff.extraCount} baris tambahan
            </span>
          ) : null}
        </div>
      </div>

      <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
        Output target {diff.expectedLines} baris, output siswa{" "}
        {diff.actualLines} baris. Tanda <span className="font-mono">·</span> =
        spasi, <span className="font-mono">→</span> = tab. Auto-grade
        mengabaikan spasi di akhir baris, tetapi perbedaan penulisan tetap
        ditampilkan di sini.
      </p>

      <ul className="mt-2 space-y-2">
        {visible.map((item) => (
          <LineComparison
            key={`${item.type}-${item.line}-${item.expected ?? ""}-${item.actual ?? ""}`}
            diff={item}
          />
        ))}
      </ul>

      {remaining > 0 ? (
        <p className="mt-2 text-[10px] font-semibold text-rose-600">
          +{remaining} perbedaan lain.
        </p>
      ) : null}
    </div>
  );
}
