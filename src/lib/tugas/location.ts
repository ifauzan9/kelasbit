export const GPS_VALIDITY_MS = 60 * 60 * 1000;
export const GPS_MAX_ACCURACY_METERS = 500;
export const GPS_SAMPLE_COUNT = 3;

export type GpsPrecisionTier =
  | "sangat_presisi"
  | "presisi"
  | "cukup_presisi"
  | "kurang_presisi"
  | "di_luar_batas";

export const GPS_PRECISION_LABEL: Record<GpsPrecisionTier, string> = {
  sangat_presisi: "Sangat presisi",
  presisi: "Presisi",
  cukup_presisi: "Cukup presisi",
  kurang_presisi: "Kurang presisi",
  di_luar_batas: "Di luar batas",
};

export function gpsPrecisionTier(
  accuracy: number | null | undefined,
): GpsPrecisionTier | null {
  if (accuracy === null || accuracy === undefined || !Number.isFinite(accuracy)) {
    return null;
  }

  if (accuracy <= 50) return "sangat_presisi";
  if (accuracy <= 200) return "presisi";
  if (accuracy <= 350) return "cukup_presisi";
  if (accuracy <= GPS_MAX_ACCURACY_METERS) return "kurang_presisi";
  return "di_luar_batas";
}

export function isGpsAccuracyAccepted(
  accuracy: number | null | undefined,
): boolean {
  return (
    typeof accuracy === "number" &&
    Number.isFinite(accuracy) &&
    accuracy >= 0 &&
    accuracy <= GPS_MAX_ACCURACY_METERS
  );
}

export function formatAccuracyMeters(accuracy: number | null): string | null {
  if (accuracy === null || !Number.isFinite(accuracy)) return null;
  return `±${Math.max(1, Math.round(accuracy))} m`;
}
