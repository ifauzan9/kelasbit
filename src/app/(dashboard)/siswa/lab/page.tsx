import type { Metadata } from "next";
import { CodeXml, Sparkles, Terminal } from "@/components/icons";
import { LabWorkspace } from "@/components/lab/lab-workspace";
import { requireUser } from "@/lib/auth/session";
import { listLabRuns } from "@/lib/lab/queries";

export const metadata: Metadata = {
  title: "Lab Coding — KelasBit",
};

export default async function LabCodingPage() {
  const user = await requireUser("siswa");
  const runs = await listLabRuns(20);

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-emerald-950 to-slate-900 px-6 py-7 text-white shadow-[0_30px_60px_-40px_rgba(2,44,34,0.65)] sm:px-9 sm:py-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-emerald-400/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 right-24 h-64 w-64 rounded-full bg-teal-300/10 blur-3xl"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80 ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" />
              Lab Coding
            </span>

            <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Tulis &amp; jalankan Python
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
              Editor Python lengkap dengan console dan input program. Kode
              berjalan di browser. Run tidak disimpan otomatis; gunakan tombol
              Simpan Riwayat untuk menyimpan hasil coding.
            </p>
          </div>

          <div className="flex w-full max-w-xs items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/25">
              <Terminal className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/50">
                Python di browser
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-white/80">
                <CodeXml className="h-3.5 w-3.5" />
                Pyodide · tanpa install
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6">
        <LabWorkspace initialRuns={runs} draftOwnerId={user.id} />
      </div>
    </>
  );
}
