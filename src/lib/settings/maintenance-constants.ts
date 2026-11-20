/**
 * Konstanta pengaturan maintenance yang aman diimpor dari client component.
 * Jangan tambahkan dependensi server (db, crypto) di file ini.
 */

export const MAINTENANCE_MODE_KEY = "maintenance_mode";
/** Waktu mulai maintenance terjadwal (kosong = tidak ada jadwal). */
export const MAINTENANCE_START_KEY = "maintenance_start";
export const MAINTENANCE_TITLE_KEY = "maintenance_title";
export const MAINTENANCE_MESSAGE_KEY = "maintenance_message";
/** Waktu selesai maintenance (dipakai juga sebagai jam buka otomatis). */
export const MAINTENANCE_UNTIL_KEY = "maintenance_until";
/**
 * Override manual sementara saat jendela jadwal sedang berjalan.
 * Disimpan bersama `start` jadwal supaya override lama tidak ikut terpakai
 * pada jadwal berikutnya.
 */
export const MAINTENANCE_OVERRIDE_VALUE_KEY = "maintenance_override_value";
export const MAINTENANCE_OVERRIDE_START_KEY = "maintenance_override_start";
export const MAINTENANCE_TOKEN_KEY = "maintenance_guru_token";
/** Token URL login siswa khusus saat maintenance. */
export const MAINTENANCE_STUDENT_TOKEN_KEY = "maintenance_siswa_token";

export const DEFAULT_MAINTENANCE_TITLE = "Sedang Dalam Perbaikan";
export const DEFAULT_MAINTENANCE_MESSAGE =
  "KelasBit sedang dalam perbaikan. Silakan coba lagi beberapa saat lagi.";

export const MAX_MAINTENANCE_TITLE = 80;
export const MAX_MAINTENANCE_MESSAGE = 300;
