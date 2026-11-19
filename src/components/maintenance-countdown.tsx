"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days} hari ${hours} jam`;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function MaintenanceCountdown({ until }: { until: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(until).getTime();
    if (Number.isNaN(target)) return;

    const tick = () => setRemaining(Math.max(0, target - Date.now()));
    tick();

    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [until]);

  useEffect(() => {
    if (remaining === null || remaining > 0) return;

    // Situs sudah boleh dibuka; muat ulang supaya pengunjung langsung
    // diarahkan dari /maintenance ke halaman utama.
    const timer = setTimeout(() => window.location.reload(), 1500);
    return () => clearTimeout(timer);
  }, [remaining]);

  if (remaining === null) return null;

  if (remaining <= 0) {
    return <span className="font-semibold text-emerald-300">sebentar lagi…</span>;
  }

  return (
    <span className="font-mono text-sm font-bold tabular-nums text-white">
      {formatRemaining(remaining)}
    </span>
  );
}
