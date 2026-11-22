"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, MapPin, ShieldCheck } from "@/components/icons";
import type { LoginLocationStatus } from "@/lib/auth/geolocation";

type Phase = "idle" | "locating" | "saving" | "error";

export function TugasGpsGate({
  tugasId,
  tugasTitle,
}: {
  tugasId: number;
  tugasTitle: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);

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

  function requestGps() {
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
    setMessage("Meminta izin dan membaca lokasi…");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setPhase("saving");
        setMessage("Lokasi ditemukan. Membuka tugas…");

        const saved = await saveLocation({
          status: "tersedia",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });

        if (!saved) {
          setPhase("error");
          setMessage("Gagal menyimpan lokasi. Coba lagi.");
          return;
        }

        router.refresh();
      },
      (error) => {
        const status: LoginLocationStatus =
          error.code === error.PERMISSION_DENIED
            ? "ditolak"
            : error.code === error.TIMEOUT
              ? "timeout"
              : "error";

        const text =
          status === "ditolak"
            ? "Izin lokasi ditolak. Aktifkan izin lokasi di browser, lalu coba lagi."
            : status === "timeout"
              ? "Waktu pengambilan lokasi habis. Coba lagi di tempat yang sinyalnya lebih baik."
              : "Lokasi tidak tersedia. Pastikan GPS aktif dan coba lagi.";

        setPhase("error");
        setMessage(text);
        void saveLocation({
          status,
          latitude: null,
          longitude: null,
          accuracy: null,
        });
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  }

  const busy = phase === "locating" || phase === "saving";

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-[0_1px_2px_rgba(16,12,40,0.04)]">
      <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 ring-1 ring-emerald-100">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-emerald-950">
              Aktifkan GPS untuk membuka tugas
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-emerald-800/70">
              {tugasTitle}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <p className="text-sm leading-relaxed text-slate-600">
          Tugas ini mewajibkan lokasi GPS. Setelah diizinkan, halaman tugas
          akan terbuka. Lokasi berlaku selama <strong>1 jam</strong> dan
          disimpan sebagai riwayat untuk guru.
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-[11px] leading-relaxed text-slate-500">
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            Lokasi hanya diminta untuk tugas ini. Jika izin ditolak, tugas
            tidak bisa dikerjakan sampai izin lokasi diaktifkan.
          </p>
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <MapPin className="h-4 w-4" />
          {phase === "locating"
            ? "Membaca lokasi…"
            : phase === "saving"
              ? "Menyimpan lokasi…"
              : phase === "error"
                ? "Coba Aktifkan GPS Lagi"
                : "Aktifkan GPS"}
        </button>
      </div>
    </section>
  );
}
