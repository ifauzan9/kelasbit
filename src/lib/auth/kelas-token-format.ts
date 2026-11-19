/**
 * Utilitas token kelas yang aman diimpor dari client component.
 * Jangan tambahkan dependensi server (db, crypto) di file ini.
 */

export const KELAS_TOKEN_LENGTH = 6;

/** Tanpa huruf/angka ambigu: I, O, 0, 1. */
export const KELAS_TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Buang spasi, tanda hubung, dan samakan ke huruf besar. */
export function normalizeKelasToken(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Tampilan token: ABC-123. */
export function formatKelasToken(value: string): string {
  const token = normalizeKelasToken(value);
  if (token.length <= 3) return token;
  return `${token.slice(0, 3)}-${token.slice(3)}`;
}

export function isValidKelasTokenFormat(token: string): boolean {
  if (token.length !== KELAS_TOKEN_LENGTH) return false;

  return [...token].every((char) => KELAS_TOKEN_ALPHABET.includes(char));
}
