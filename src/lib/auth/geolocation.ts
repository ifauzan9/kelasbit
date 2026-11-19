export const LOGIN_LOCATION_STATUSES = [
  "tersedia",
  "ditolak",
  "timeout",
  "tidak_didukung",
  "error",
  "tidak_dicatat",
  "dimatikan",
] as const;

export type LoginLocationStatus = (typeof LOGIN_LOCATION_STATUSES)[number];

export type LoginLocation = {
  status: LoginLocationStatus;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
};

export function isLoginLocationStatus(value: string): value is LoginLocationStatus {
  return (LOGIN_LOCATION_STATUSES as readonly string[]).includes(value);
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/**
 * Validasi data lokasi yang dikirim client. Koordinat berasal dari browser dan
 * bisa dimanipulasi, jadi hanya dipakai sebagai informasi tambahan di log.
 */
export function normalizeLoginLocation(location: LoginLocation): LoginLocation {
  const status = isLoginLocationStatus(location.status)
    ? location.status
    : "tidak_dicatat";

  if (status !== "tersedia") {
    return { status, latitude: null, longitude: null, accuracy: null };
  }

  const { latitude, longitude, accuracy } = location;
  const coordinateValid =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (!coordinateValid) {
    return { status: "error", latitude: null, longitude: null, accuracy: null };
  }

  return {
    status: "tersedia",
    latitude: roundCoordinate(latitude),
    longitude: roundCoordinate(longitude),
    accuracy:
      typeof accuracy === "number" &&
      Number.isFinite(accuracy) &&
      accuracy >= 0
        ? Math.round(accuracy)
        : null,
  };
}

export function locationMapUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(
    `${latitude},${longitude}`,
  )}`;
}
