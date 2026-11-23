import {
  CheckCircle2,
  ListChecks,
  Variable,
} from "@/components/icons";
import {
  RETRY_COOLDOWN_EVERY,
  RETRY_COOLDOWN_MINUTES,
  type TugasStructureRules,
} from "@/lib/tugas/rules";

export function TugasRequirements({
  rules,
  minScore,
  repeatUntilPass,
  retryCooldownEvery = RETRY_COOLDOWN_EVERY,
}: {
  rules: TugasStructureRules | null;
  minScore: number | null;
  repeatUntilPass: boolean;
  retryCooldownEvery?: number;
}) {
  if (!rules?.enabled) return null;

  const inputVariables = rules.inputVariables ?? [];
  const literalVariables = rules.literalVariables ?? [];
  const inputSet = new Set(inputVariables);
  const literalSet = new Set(literalVariables);
  const otherRequired = rules.requiredVariables.filter(
    (name) => !inputSet.has(name) && !literalSet.has(name),
  );
  const hasRequired = otherRequired.length > 0;
  const hasInputs = inputVariables.length > 0;
  const hasLiterals = literalVariables.length > 0;
  const printVariableCount = new Set([
    ...rules.requiredVariables,
    ...inputVariables,
    ...literalVariables,
  ]).size;

  const programRules: string[] = [];

  if (rules.exactInputs !== null) {
    programRules.push(`Gunakan tepat ${rules.exactInputs} input()`);
  }
  if (rules.minPrints !== null) {
    programRules.push(`Cetak minimal ${rules.minPrints} print()`);
  }
  if (rules.minOutputLines !== null) {
    programRules.push(
      `Hasil program minimal ${rules.minOutputLines} baris tidak kosong`,
    );
  }
  programRules.push(
    "Spasi antarkata dan spasi awal baris diperhitungkan; spasi akhir baris diabaikan",
  );
  if (hasInputs) {
    programRules.push(
      "Gunakan variabel dari input() di dalam print(), jangan menulis nilainya langsung",
    );
  }
  if (hasLiterals) {
    programRules.push(
      "Gunakan variabel nilai tetap di dalam print(), jangan menulis nilainya langsung",
    );
  }
  if (printVariableCount > 0) {
    programRules.push(
      `Gunakan semua ${printVariableCount} variabel wajib di dalam print()`,
    );
  }
  if (rules.forbidLoops) {
    programRules.push("Jangan menggunakan for atau while");
  }
  if (rules.forbidConditionals) {
    programRules.push("Jangan menggunakan if atau else");
  }

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-[0_1px_2px_rgba(16,12,40,0.04)]">
      <header className="flex items-start gap-2.5 border-b border-emerald-100 bg-emerald-50 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 ring-1 ring-emerald-100">
          <ListChecks className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-extrabold text-emerald-900">
            Ketentuan Wajib Tugas
          </h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-700/70">
            Semua poin di bawah wajib dipenuhi agar tugas dinyatakan lulus.
          </p>
        </div>
      </header>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        {hasRequired || hasInputs ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            {hasRequired ? (
              <>
                <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                  <Variable className="h-3.5 w-3.5 text-emerald-600" />
                  Variabel lain yang wajib
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {otherRequired.map((name) => (
                    <code
                      key={name}
                      className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1 font-mono text-xs font-bold text-emerald-800 shadow-sm"
                    >
                      {name}
                    </code>
                  ))}
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                  Tulis nama variabel persis seperti di atas, termasuk huruf
                  besar/kecil.
                </p>
              </>
            ) : null}

            {hasInputs ? (
              <div className={hasRequired ? "mt-3" : undefined}>
                <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                  <Variable className="h-3.5 w-3.5 text-emerald-600" />
                  Variabel dari input()
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {inputVariables.map((name) => (
                    <code
                      key={name}
                      className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1 font-mono text-xs font-bold text-emerald-800 shadow-sm"
                    >
                      {name}
                    </code>
                  ))}
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                  Isi dari <code>input()</code>, lalu gunakan variabelnya di
                  dalam <code>print()</code>. Nama harus sama persis dan nilai
                  input tidak boleh ditulis langsung sebagai teks.
                </p>
              </div>
            ) : null}

            {hasLiterals ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-amber-700">
                  Nilai tetap (bukan input)
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {literalVariables.map((name) => (
                    <code
                      key={name}
                      className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-amber-800 ring-1 ring-amber-200"
                    >
                      {name}
                    </code>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-amber-700/80">
                  Isi langsung di kode sebagai teks (string), jangan memakai
                  input(). Nama harus sama persis, lalu pakai variabelnya di
                  print().
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            Aturan program
          </p>
          <ul className="mt-2 space-y-1.5">
            {programRules.map((label) => (
              <li
                key={label}
                className="flex items-start gap-2 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {minScore !== null ? (
        <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold text-slate-500">
          <span>
            Nilai minimal lulus (KKM):{" "}
            <span className="font-extrabold text-slate-700">{minScore}</span>
          </span>
          {repeatUntilPass ? (
            <span>
              Bisa mengulang sampai lulus · jeda {RETRY_COOLDOWN_MINUTES} menit
              setiap {retryCooldownEvery} percobaan
            </span>
          ) : null}
        </footer>
      ) : null}
    </section>
  );
}
