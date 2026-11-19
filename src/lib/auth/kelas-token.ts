import { randomInt } from "node:crypto";
import {
  KELAS_TOKEN_ALPHABET,
  KELAS_TOKEN_LENGTH,
} from "@/lib/auth/kelas-token-format";

export {
  KELAS_TOKEN_ALPHABET,
  KELAS_TOKEN_LENGTH,
  formatKelasToken,
  isValidKelasTokenFormat,
  normalizeKelasToken,
} from "@/lib/auth/kelas-token-format";

/**
 * Token acak untuk login satu kelas. Memakai alphabet tanpa karakter ambigu
 * supaya mudah dibacakan/diketik siswa.
 */
export function generateKelasToken(): string {
  let token = "";

  for (let index = 0; index < KELAS_TOKEN_LENGTH; index += 1) {
    token += KELAS_TOKEN_ALPHABET[randomInt(KELAS_TOKEN_ALPHABET.length)];
  }

  return token;
}
