import type {
  LoginLogReason,
  LoginLogStatus,
} from "@/lib/db/schema";
import {
  locationMapUrl,
  type LoginLocationStatus,
} from "@/lib/auth/geolocation";

export const LOGIN_STATUS_LABELS: Record<LoginLogStatus, string> = {
  berhasil: "Berhasil",
  gagal: "Gagal",
  diblokir: "Diblokir",
};

export const LOGIN_STATUS_STYLES: Record<LoginLogStatus, string> = {
  berhasil: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  gagal: "bg-amber-50 text-amber-700 ring-amber-100",
  diblokir: "bg-rose-50 text-rose-700 ring-rose-100",
};

export const LOGIN_REASON_LABELS: Record<LoginLogReason, string> = {
  password_salah: "Password salah",
  akun_tidak_ditemukan: "Akun tidak ditemukan",
  bukan_akun_siswa: "Bukan akun siswa",
  akun_nonaktif: "Akun nonaktif",
  rate_limit: "Dibatasi rate limit",
  token_salah: "Token kelas salah",
  token_nonaktif: "Token kelas nonaktif",
  kelas_tanpa_siswa: "Kelas tanpa siswa aktif",
  siswa_tidak_ada: "Siswa tidak ada di kelas",
};

export const LOGIN_METHOD_LABELS: Record<string, string> = {
  password: "Password",
  token_kelas: "Token kelas",
};

export function loginMethodLabel(value: string): string {
  return LOGIN_METHOD_LABELS[value] ?? "Password";
}

export function toLoginStatus(value: string): LoginLogStatus {
  if (value === "gagal" || value === "diblokir") return value;
  return "berhasil";
}

export function reasonLabel(value: string | null): string | null {
  if (!value) return null;
  return LOGIN_REASON_LABELS[value as LoginLogReason] ?? null;
}

export const LOGIN_LOCATION_LABELS: Record<LoginLocationStatus, string> = {
  tersedia: "Lokasi tersedia",
  ditolak: "Izin lokasi ditolak",
  timeout: "Lokasi timeout",
  tidak_didukung: "Tidak didukung",
  error: "Gagal membaca lokasi",
  tidak_dicatat: "Tidak dicatat",
  dimatikan: "Pelacakan nonaktif",
};

export function locationStatusLabel(value: string): string {
  return LOGIN_LOCATION_LABELS[value as LoginLocationStatus] ?? "Tidak diketahui";
}

export function mapUrlFor(
  latitude: number | null,
  longitude: number | null,
): string | null {
  if (latitude === null || longitude === null) return null;
  return locationMapUrl(latitude, longitude);
}

export function formatAccuracy(accuracy: number | null): string | null {
  if (accuracy === null || !Number.isFinite(accuracy)) return null;
  return `±${Math.max(1, Math.round(accuracy))} m`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatLoginTime(value: Date): string {
  return `${dateTimeFormatter.format(value)} WIB`;
}

export function formatUserAgent(value: string | null): string {
  if (!value) return "Tidak diketahui";

  if (/bot|crawler|spider/i.test(value)) return "Bot";

  const browser = /Edg\//i.test(value)
    ? "Edge"
    : /OPR\//i.test(value)
      ? "Opera"
      : /Chrome\//i.test(value)
        ? "Chrome"
        : /Firefox\//i.test(value)
          ? "Firefox"
          : /Safari\//i.test(value)
            ? "Safari"
            : null;

  const os = /Windows/i.test(value)
    ? "Windows"
    : /Android/i.test(value)
      ? "Android"
      : /iPhone|iPad|iPod/i.test(value)
        ? "iOS"
        : /Mac OS X|Macintosh/i.test(value)
          ? "macOS"
          : /Linux/i.test(value)
            ? "Linux"
            : null;

  if (browser && os) return `${browser} · ${os}`;
  return browser ?? os ?? "Perangkat lain";
}
