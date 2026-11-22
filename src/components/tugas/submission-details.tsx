"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Kartu pengumpulan yang tertutup default. Membuka otomatis jika hash URL
 * menunjuk ke kartu ini (dipakai tombol "Lihat jawaban" di roster).
 */
export function SubmissionDetails({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const sync = () => {
      if (window.location.hash !== `#${id}`) return;
      if (ref.current) ref.current.open = true;
    };

    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [id]);

  return (
    <details
      ref={ref}
      id={id}
      className="group scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,12,40,0.04)]"
    >
      {children}
    </details>
  );
}
