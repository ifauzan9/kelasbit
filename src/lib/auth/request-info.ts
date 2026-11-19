import { headers } from "next/headers";

export type ClientInfo = {
  ip: string | null;
  userAgent: string | null;
};

/**
 * Ambil IP dan User-Agent dari header request.
 * `x-forwarded-for` di cPanel/Passenger biasanya berisi IP klien asli.
 */
export async function getClientInfo(): Promise<ClientInfo> {
  try {
    const store = await headers();
    const forwarded = store.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || store.get("x-real-ip")?.trim() || null;
    const userAgent = store.get("user-agent");

    return {
      ip: ip || null,
      userAgent: userAgent || null,
    };
  } catch (error) {
    console.error("request-info: gagal membaca header request", error);
    return { ip: null, userAgent: null };
  }
}
