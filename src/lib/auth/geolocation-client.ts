import type { LoginLocation } from "@/lib/auth/geolocation";

type DetectLocationOptions = {
  /** Waktu tunggu saat browser masih menampilkan dialog izin. */
  promptTimeoutMs?: number;
  /** Waktu tunggu setelah izin sudah pernah diberikan. */
  grantedTimeoutMs?: number;
};

function unavailable(status: LoginLocation["status"]): LoginLocation {
  return { status, latitude: null, longitude: null, accuracy: null };
}

/**
 * Ambil posisi sekali saat login. Selalu resolve (tidak pernah reject) supaya
 * login tetap bisa dilanjutkan walau lokasi ditolak/timeout.
 */
export async function detectBrowserLocation(
  options: DetectLocationOptions = {},
): Promise<LoginLocation> {
  if (typeof window === "undefined" || !window.isSecureContext) {
    return unavailable("tidak_didukung");
  }

  if (!("geolocation" in navigator)) {
    return unavailable("tidak_didukung");
  }

  // Beri waktu lebih panjang saat dialog izin browser masih terbuka. Setelah
  // izin pernah diberikan, posisi biasanya didapat lebih cepat.
  let timeoutMs = options.promptTimeoutMs ?? 30_000;

  try {
    if (navigator.permissions) {
      const permission = await navigator.permissions.query({ name: "geolocation" });

      if (permission.state === "denied") {
        return unavailable("ditolak");
      }

      if (permission.state === "granted") {
        timeoutMs = options.grantedTimeoutMs ?? 15_000;
      }
    }
  } catch {
    // Permissions API tidak didukung di sebagian browser; lanjut ke geolocation.
  }

  return new Promise<LoginLocation>((resolve) => {
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            status: "tersedia",
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Number.isFinite(position.coords.accuracy)
              ? position.coords.accuracy
              : null,
          });
        },
        (error) => {
          if (error.code === 1) {
            resolve(unavailable("ditolak"));
            return;
          }

          if (error.code === 3) {
            resolve(unavailable("timeout"));
            return;
          }

          resolve(unavailable("error"));
        },
        {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 60_000,
        },
      );
    } catch {
      resolve(unavailable("error"));
    }
  });
}
