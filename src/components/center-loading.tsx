"use client";

import { useEffect, useState } from "react";
import { useNavigationPending } from "@/lib/hooks/use-navigation-pending";

/** Jeda sebelum indikator muncul agar navigasi cepat tidak berkedip. */
const REVEAL_DELAY_MS = 200;

export function CenterLoading() {
  const pending = useNavigationPending();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!pending) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => setVisible(true), REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  return (
    <div
      className="center-loading"
      data-active={visible}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      <div className="center-loading-card">
        <span className="center-loading-spinner" aria-hidden />
        <span className="center-loading-text">Memuat…</span>
      </div>
    </div>
  );
}
