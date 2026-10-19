import { NextResponse } from "next/server";
import { NAMA_COOKIE_GURU } from "@/lib/guru-sesi";

// Hapus cookie sesi guru, lalu arahkan ke halaman login.
// Dipisah dari Server Action karena cookie tidak boleh diubah saat render.
export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(NAMA_COOKIE_GURU);
  return response;
}