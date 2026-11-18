"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { nudgeRouter } from "@/components/router-nudge";

const REFRESH_DELAY_MS = 120;
const NUDGE_DELAY_MS = 700;

type StateLike = {
  success?: boolean;
  stamp?: number;
};

/**
 * Menjadwalkan `router.refresh()` setelah Server Action selesai.
 *
 * Server Action sengaja tidak memakai `revalidatePath` (lihat catatan di
 * `src/lib/guru/siswa-actions.ts`). Refresh ditunda sebentar karena di Next 15.5
 * hasil refresh yang dikirim tepat saat transisi action masih berjalan kadang
 * dibuang, sehingga daftar tidak ikut ter-update.
 *
 * `nudgeRouter()` dipanggil setelahnya sebagai jaring pengaman: kalau transisi
 * refresh macet karena bug React 19.2 (lihat `router-nudge.tsx`), state update
 * kecil itu membangunkan lane yang tertidur tanpa mengganggu yang sudah commit.
 */
export function useScheduleRefresh() {
  const router = useRouter();

  return useCallback(() => {
    const refreshTimer = setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
    const nudgeTimer = setTimeout(nudgeRouter, REFRESH_DELAY_MS + NUDGE_DELAY_MS);

    return () => {
      clearTimeout(refreshTimer);
      clearTimeout(nudgeTimer);
    };
  }, [router]);
}

/** Memanggil `router.refresh()` setiap kali `state.success` bernilai baru. */
export function useRefreshOnSuccess(state: StateLike) {
  const scheduleRefresh = useScheduleRefresh();

  useEffect(() => {
    if (!state.success) return;

    return scheduleRefresh();
  }, [state.stamp, state.success, scheduleRefresh]);
}
