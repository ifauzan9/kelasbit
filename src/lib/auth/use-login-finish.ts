"use client";

import { useEffect, useRef, useState } from "react";
import type { LoginState } from "@/lib/auth/actions";
import { detectBrowserLocation } from "@/lib/auth/geolocation-client";

/**
 * Menyelesaikan login setelah Server Action sukses:
 * - minta & simpan lokasi bila fitur lacak lokasi aktif;
 * - arahkan browser ke dashboard.
 *
 * Dipakai oleh login password maupun login token kelas supaya alurnya sama.
 */
export function useLoginFinish(state: LoginState) {
  const [locating, setLocating] = useState(false);
  const handledStampRef = useRef<number | null>(null);
  const finishing = Boolean(state.success && state.redirectTo);

  useEffect(() => {
    if (!state.success || !state.stamp || !state.redirectTo) return;
    if (handledStampRef.current === state.stamp) return;

    handledStampRef.current = state.stamp;

    const redirectTo = state.redirectTo;
    const loginLogId = state.loginLogId;
    const needsLocation = state.needsLocation;

    async function finish() {
      if (needsLocation && loginLogId) {
        setLocating(true);

        try {
          const location = await detectBrowserLocation({
            promptTimeoutMs: 30_000,
            grantedTimeoutMs: 15_000,
          });

          const response = await fetch("/api/login-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ logId: loginLogId, location }),
          });

          if (!response.ok) {
            throw new Error(`Gagal menyimpan lokasi (${response.status}).`);
          }
        } catch (error) {
          console.error("login: gagal menyimpan lokasi", error);
        } finally {
          setLocating(false);
        }
      }

      window.location.replace(redirectTo);
    }

    void finish();
  }, [state]);

  return { locating, finishing };
}
