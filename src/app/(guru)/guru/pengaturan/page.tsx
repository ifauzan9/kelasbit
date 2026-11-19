import type { Metadata } from "next";
import { Settings } from "@/components/icons";
import { LoginLocationSetting } from "@/components/guru/login-location-setting";
import { requireUser } from "@/lib/auth/session";
import { getLoginLocationSetting } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Pengaturan — KelasBit",
};

export default async function PengaturanPage() {
  await requireUser("guru");

  const locationSetting = await getLoginLocationSetting();

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-emerald-500 via-emerald-700 to-teal-950 px-6 py-7 text-white shadow-[0_30px_60px_-40px_rgba(5,150,105,0.55)] sm:px-9 sm:py-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 right-24 h-64 w-64 rounded-full bg-teal-300/20 blur-3xl"
        />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80 ring-1 ring-white/15">
            <Settings className="h-3.5 w-3.5" />
            Pengaturan
          </span>

          <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Pengaturan Aplikasi
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">
            Atur fitur yang berlaku untuk seluruh pengguna KelasBit. Perubahan
            langsung dipakai pada login berikutnya.
          </p>
        </div>
      </section>

      <div className="mt-6 max-w-3xl">
        <LoginLocationSetting
          enabled={locationSetting.enabled}
          updatedAt={locationSetting.updatedAt}
        />
      </div>
    </>
  );
}
