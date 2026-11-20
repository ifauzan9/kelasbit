import {
  ArrowRight,
  ChipAI,
  Info,
  MonitorCode,
  ShieldCheck,
} from "@/components/icons";
import { MaintenanceScheduleNotice } from "@/components/maintenance-schedule-notice";
import { getMaintenanceSetting } from "@/lib/settings/maintenance";

function CodePreview() {
  return (
    <div className="relative mx-auto w-full max-w-[440px] lg:mr-0 lg:ml-auto">
      <div
        aria-hidden
        className="absolute -top-6 right-4 h-48 w-48 rounded-full bg-brand-200/50 blur-3xl"
      />

      <div className="relative mx-auto w-[94%] -rotate-2 rounded-2xl bg-[#171532] p-4 shadow-[0_40px_70px_-28px_rgba(45,20,120,0.6)] sm:w-[90%] sm:p-5">
        <div className="flex items-center justify-between px-1 pb-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <span className="font-mono text-[10px] text-white/40">belajar.py</span>
        </div>

        <div className="space-y-1.5 px-1 py-2 font-mono text-[11.5px] leading-6 sm:text-[13px]">
          <p className="text-[#8b87b8]"># Halo, selamat belajar!</p>
          <p>
            <span className="text-[#c4b5fd]">nama</span>{" "}
            <span className="text-[#8b87b8]">=</span>{" "}
            <span className="text-[#f0abfc]">&quot;Siswa Hebat&quot;</span>
          </p>
          <p>
            <span className="text-[#7dd3fc]">print</span>
            <span className="text-[#cbd5e1]">(</span>
            <span className="text-[#f0abfc]">&quot;Halo,&quot;</span>
            <span className="text-[#cbd5e1]">, </span>
            <span className="text-[#c4b5fd]">nama</span>
            <span className="text-[#cbd5e1]">)</span>
          </p>
          <p className="pt-3 text-[#fde68a]">&gt; Halo, Siswa Hebat ✨</p>
        </div>
      </div>

      <div className="absolute -top-8 right-0 flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 shadow-[0_18px_32px_-14px_rgba(30,20,90,0.4)]">
        <MonitorCode className="h-4 w-4 text-brand-500" />
        Informatika
      </div>

      <div className="absolute -bottom-5 left-0 flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 shadow-[0_18px_32px_-14px_rgba(30,20,90,0.4)]">
        <ChipAI className="h-4 w-4 text-emerald-500" />
        Koding &amp; AI
      </div>
    </div>
  );
}

export default async function Home() {
  const maintenance = await getMaintenanceSetting();

  return (
    <main>
      <section id="beranda" className="mx-auto w-full max-w-6xl px-6 pt-6">
        <MaintenanceScheduleNotice setting={maintenance} className="mb-4" />

        <div className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-[#f6f3ff] via-[#f4f1ff] to-[#eef1ff] px-6 py-10 sm:rounded-[32px] sm:px-12 sm:py-12 lg:px-14 lg:py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-white/70 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-10 top-10 h-64 w-64 rounded-full bg-brand-200/40 blur-3xl"
          />

          <div className="relative grid items-center gap-12 lg:grid-cols-[1.12fr_0.88fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-700 shadow-sm backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                Portal Pembelajaran Kelas
              </span>

              <h1 className="mt-6 text-[32px] font-extrabold leading-[1.08] tracking-[-0.03em] text-slate-900 sm:text-[46px]">
                Selamat datang di{" "}
                <span className="text-brand-600">
                  ruang
                  <br />
                  belajar digital!
                </span>
              </h1>

              <p className="mt-5 max-w-[520px] text-[15px] leading-relaxed text-slate-500">
                Tempat belajar{" "}
                <strong className="font-bold text-slate-700">Informatika</strong>{" "}
                dan{" "}
                <strong className="font-bold text-slate-700">
                  Koding &amp; Kecerdasan Artifisial (KKA)
                </strong>{" "}
                dengan cara yang sederhana, menarik, dan menyenangkan.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition-colors hover:bg-brand-700"
                >
                  Login
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <p className="mt-6 flex items-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="h-4 w-4" />
                Ruang belajar khusus untuk kegiatan pembelajaran kelas.
              </p>
            </div>

            <CodePreview />
          </div>
        </div>
      </section>

      <section id="tentang" className="mx-auto w-full max-w-6xl px-6 pt-14 pb-16">
        <div className="flex items-start gap-4 rounded-2xl border border-slate-200/70 bg-[#f1f0fa] px-6 py-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-500 shadow-sm">
            <Info className="h-5 w-5" />
          </span>
          <p className="text-[13px] leading-relaxed text-slate-600">
            <span className="font-bold text-slate-800">
              Tentang KelasBit:
            </span>{" "}
            Website ini disiapkan sebagai media pendamping pembelajaran
            Informatika dan KKA. Siswa dapat masuk melalui tombol{" "}
            <span className="font-semibold text-brand-600">Login Siswa</span>{" "}
            ketika akses kelas sudah diaktifkan.
          </p>
        </div>
      </section>
    </main>
  );
}
