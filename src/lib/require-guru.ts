import { requireGuru as cekSesiGuru, type SesiGuru } from "@/lib/guru-sesi";

// Guard untuk semua Server Action & halaman guru.
// Akses database langsung lewat helper di @/lib/db (tanpa RLS Supabase),
// jadi setiap action WAJIB memanggil fungsi ini lebih dulu.
export async function requireGuru(): Promise<SesiGuru> {
  return cekSesiGuru();
}
