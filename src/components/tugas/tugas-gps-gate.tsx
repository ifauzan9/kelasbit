"use client";

import { useEffect, useState } from "react";
import { AlertCircle, MapPin, ShieldCheck } from "@/components/icons";
import type { LoginLocationStatus } from "@/lib/auth/geolocation";
import {
  formatAccuracyMeters,
  GPS_MAX_ACCURACY_METERS,
  GPS_PRECISION_LABEL,
  GPS_SAMPLE_COUNT,
  gpsPrecisionTier,
} from "@/lib/tugas/location";

type Phase = "idle" | "locating" | "saving" | "error";
type PermissionState = "unknown" | "prompt" | "granted" | "denied" | "unsupported";

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 0,
    });
  });
}

export function TugasGpsGate({
  tugasId,
  tugasTitle,
}: {
  tugasId: number;
  tugasTitle: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeMessage, setCodeMessage] = useState<string | null>(null);
  const [permissionState, setPermissionState] =
    useState<PermissionState>("unknown");

  useEffect(() => {
    if (!navigator.permissions?.query) {
      setPermissionState("unsupported");
      return;
    }

    let status: PermissionStatus | null = null;

    const update = () => {
      if (!status) return;
      setPermissionState(status.state as PermissionState);
    };

    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((result) => {
        status = result;
        update();
        status.onchange = update;
      })
      .catch(() => setPermissionState("unsupported"));

    return () => {
      if (status) status.onchange = null;
    };
  }, []);

  async function saveLocation(location: {
    status: LoginLocationStatus;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
  }): Promise<boolean> {
    try {
      const response = await fetch(`/api/tugas/${tugasId}/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Muat ulang halaman setelah lokasi/kode pass tersimpan.
   *
   * `router.refresh()` pernah macet di perangkat mobile (React 19.2) sehingga
   * gate tetap menampilkan "Membuka tugas..." walaupun server sudah punya
   * lokasi valid. Reload penuh memastikan halaman tugas benar-benar dirender.
   */
  function reloadToTask(delayMs = 250) {
    window.setTimeout(() => window.location.reload(), delayMs);
  }

  async function requestGps() {
    if (!window.isSecureContext) {
      setPhase("error");
      setMessage(
        "GPS hanya bisa dipakai melalui HTTPS. Hubungi guru jika halaman ini tidak memakai HTTPS.",
      );
      return;
    }

    if (!("geolocation" in navigator)) {
      setPhase("error");
      setMessage(
        "Perangkat ini tidak mendukung GPS. Coba gunakan HP atau browser lain.",
      );
      void saveLocation({
        status: "tidak_didukung",
        latitude: null,
        longitude: null,
        accuracy: null,
      });
      return;
    }

    setPhase("locating");
    setMessage("Meminta izin dan mengambil sampel lokasi…");

    const samples: GeolocationPosition[] = [];
    let lastError: GeolocationPositionError | null = null;

    for (let index = 0; index < GPS_SAMPLE_COUNT; index += 1) {
      try {
        const position = await getPosition();
        samples.push(position);

        if (position.coords.accuracy <= 50) break;

        if (index < GPS_SAMPLE_COUNT - 1) {
          setMessage(
            `Sampel ${index + 1}/${GPS_SAMPLE_COUNT} selesai. Mengambil sampel berikutnya…`,
          );
        }
      } catch (error) {
        lastError = error as GeolocationPositionError;

        if (lastError.code === lastError.PERMISSION_DENIED) break;
      }
    }

    if (samples.length === 0) {
      const status: LoginLocationStatus =
        lastError?.code === lastError?.PERMISSION_DENIED
          ? "ditolak"
          : lastError?.code === lastError?.TIMEOUT
            ? "timeout"
            : "error";

      setPhase("error");
      setMessage(
        status === "ditolak"
          ? "Izin lokasi ditolak. Aktifkan izin lokasi dan pilih Presisi, lalu coba lagi."
          : status === "timeout"
            ? "Waktu pengambilan lokasi habis. Coba lagi di tempat yang sinyalnya lebih baik."
            : "Lokasi tidak tersedia. Pastikan GPS aktif dan coba lagi.",
      );
      void saveLocation({
        status,
        latitude: null,
        longitude: null,
        accuracy: null,
      });
      return;
    }

    const best = samples.reduce((current, sample) =>
      sample.coords.accuracy < current.coords.accuracy ? sample : current,
    );
    const accuracy = best.coords.accuracy;
    const tier = gpsPrecisionTier(accuracy);
    const tierLabel = tier ? GPS_PRECISION_LABEL[tier] : null;
    const accuracyLabel = formatAccuracyMeters(accuracy) ?? "tidak diketahui";

    setPhase("saving");
    setMessage(`Akurasi terbaik ${accuracyLabel}. Menyimpan lokasi…`);

    if (accuracy > GPS_MAX_ACCURACY_METERS) {
      await saveLocation({
        status: "tersedia",
        latitude: best.coords.latitude,
        longitude: best.coords.longitude,
        accuracy,
      });
      setPhase("error");
      setMessage(
        `Lokasi di luar batas (${accuracyLabel}). Aktifkan GPS presisi/Precise Location, lalu coba lagi.`,
      );
      return;
    }

    const saved = await saveLocation({
      status: "tersedia",
      latitude: best.coords.latitude,
      longitude: best.coords.longitude,
      accuracy,
    });

    if (!saved) {
      setPhase("error");
      setMessage("Gagal menyimpan lokasi. Coba lagi.");
      return;
    }

    setPhase("saving");
    setMessage(
      `Lokasi tersimpan (${accuracyLabel}${tierLabel ? ` · ${tierLabel}` : ""}). Membuka tugas…`,
    );
    reloadToTask();
  }

  async function usePass() {
    const normalized = code.trim().toUpperCase();
    if (!normalized || codeBusy) return;

    setCodeBusy(true);
    setCodeMessage(null);

    try {
      const response = await fetch(`/api/tugas/${tugasId}/gps-pass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalized }),
      });

      if (!response.ok) {
        setCodeMessage(
          "Kode pass tidak valid, sudah dinonaktifkan, atau bukan untuk tugas ini.",
        );
        return;
      }

      setCodeMessage("Kode diterima. Membuka tugas…");
      reloadToTask();
    } catch {
      setCodeMessage("Gagal memeriksa kode. Coba lagi.");
    } finally {
      setCodeBusy(false);
    }
  }

  const busy = phase === "locating" || phase === "saving";

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-[0_1px_2px_rgba(16,12,40,0.04)]">
      <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-start gap-2.5 sm:gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 ring-1 ring-emerald-100 sm:h-11 sm:w-11">
            <MapPin className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="break-words text-base font-extrabold tracking-tight text-emerald-950 sm:text-lg">
              Aktifkan GPS untuk membuka tugas
            </h2>
            <p className="mt-1 break-words text-[11px] leading-relaxed text-emerald-800/70 sm:text-xs">
              {tugasTitle}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <p className="break-words text-xs leading-relaxed text-slate-600 sm:text-sm">
          Tugas ini mewajibkan lokasi GPS dengan akurasi maksimal{" "}
          <strong>{GPS_MAX_ACCURACY_METERS} meter</strong>. Sistem mengambil
          hingga {GPS_SAMPLE_COUNT} sampel dan memakai akurasi terbaik. Lokasi
          berlaku selama <strong>1 jam</strong>.
        </p>

        {permissionState !== "unsupported" && permissionState !== "unknown" ? (
          <p
            className={`rounded-xl px-3.5 py-2.5 text-[11px] font-semibold ${
              permissionState === "denied"
                ? "border border-rose-200 bg-rose-50 text-rose-700"
                : permissionState === "granted"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            {permissionState === "denied"
              ? "Izin lokasi diblokir. Reset izin lokasi lewat pengaturan browser, lalu muat ulang halaman."
              : permissionState === "granted"
                ? "Izin lokasi sudah aktif. Tekan Aktifkan GPS untuk mengambil sampel terbaru."
                : "Izin lokasi belum diberikan. Browser akan meminta izin saat tombol Aktifkan GPS ditekan."}
          </p>
        ) : null}

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-3 text-[11px] leading-relaxed text-emerald-800">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <p className="min-w-0 break-words">
              Jika browser menampilkan pilihan{" "}
              <strong>Perkiraan/Presisi</strong>, pilih{" "}
              <strong>Presisi (Precise Location)</strong>. Jika akurasi masih
              di luar batas, minta kode pass dari guru.
            </p>
          </div>
        </div>

        {message ? (
          <p
            role={phase === "error" ? "alert" : "status"}
            className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-xs font-medium ${
              phase === "error"
                ? "border border-rose-200 bg-rose-50 text-rose-700"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {phase === "error" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : null}
            {message}
          </p>
        ) : null}

        <button
          type="button"
          onClick={requestGps}
          disabled={busy}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <MapPin className="h-4 w-4" />
          {phase === "locating"
            ? "Mengambil sampel lokasi…"
            : phase === "saving"
              ? "Menyimpan lokasi…"
              : phase === "error"
                ? "Coba Aktifkan GPS Lagi"
                : "Aktifkan GPS"}
        </button>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            Punya kode pass dari guru?
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Gunakan kode ini jika GPS perangkat tetap tidak presisi. Kode hanya
            berlaku untuk tugas dan siswa ini.
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 12),
                )
              }
              placeholder="Contoh: AB12CD34"
              spellCheck={false}
              autoComplete="off"
              className="h-11 w-full min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm font-bold tracking-widest text-slate-800 outline-none transition placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 sm:h-10"
            />
            <button
              type="button"
              onClick={usePass}
              disabled={codeBusy || code.trim().length < 6}
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-auto"
            >
              {codeBusy ? "Memeriksa…" : "Gunakan kode"}
            </button>
          </div>
          {codeMessage ? (
            <p
              role="status"
              className="mt-2 text-[11px] font-semibold text-rose-600"
            >
              {codeMessage}
            </p>
          ) : null}
        </div>

        <details className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
          <summary className="cursor-pointer text-[11px] font-extrabold text-slate-700">
            GPS tidak akurat atau ingin reset izin?
          </summary>
          <div className="mt-3 space-y-3 text-[11px] leading-relaxed text-slate-600">
            <div>
              <p className="font-extrabold text-slate-700">Chrome Android</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                <li>
                  Ketuk ikon <strong>gembok</strong> di address bar.
                </li>
                <li>
                  Pilih <strong>Izin / Permissions</strong> →{" "}
                  <strong>Lokasi / Location</strong>.
                </li>
                <li>
                  Pilih <strong>Presisi / Precise</strong>.
                </li>
                <li>
                  Jika sudah ditolak: Chrome <strong>Setelan</strong> →{" "}
                  <strong>Setelan situs</strong> → <strong>Lokasi</strong>,
                  cari <strong>kelasbit.my.id</strong>, lalu{" "}
                  <strong>Reset izin</strong>.
                </li>
              </ol>
            </div>

            <div>
              <p className="font-extrabold text-slate-700">Safari iPhone</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                <li>
                  <strong>Settings</strong> →{" "}
                  <strong>Privacy &amp; Security</strong> →{" "}
                  <strong>Location Services</strong>.
                </li>
                <li>
                  Pilih <strong>Safari Websites</strong>.
                </li>
                <li>
                  Pilih <strong>While Using the App</strong> dan aktifkan{" "}
                  <strong>Precise Location</strong>.
                </li>
                <li>Tutup tab tugas, lalu buka kembali.</li>
              </ol>
            </div>

            <div>
              <p className="font-extrabold text-slate-700">
                Chrome / Edge desktop
              </p>
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                <li>
                  Klik ikon <strong>gembok</strong> di address bar.
                </li>
                <li>
                  Pilih <strong>Site settings</strong> →{" "}
                  <strong>Location</strong>.
                </li>
                <li>
                  Pilih <strong>Allow</strong> dan aktifkan{" "}
                  <strong>Precise location</strong> jika tersedia.
                </li>
                <li>
                  Alternatif: buka <strong>chrome://settings/content/location</strong>,
                  cari situs, lalu <strong>Reset permission</strong>.
                </li>
              </ol>
            </div>

            <div>
              <p className="font-extrabold text-slate-700">Firefox</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                <li>Klik ikon gembok di address bar.</li>
                <li>
                  Pilih <strong>Clear permission</strong> /{" "}
                  <strong>Reset permission</strong>.
                </li>
                <li>Muat ulang halaman dan izinkan lokasi.</li>
              </ol>
            </div>

            <p className="rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] text-slate-500 ring-1 ring-slate-100">
              Reset izin lokasi tidak menghapus jawaban atau nilai tugas. Jika
              GPS tetap tidak bisa, gunakan kode pass dari guru.
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}
