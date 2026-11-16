"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const BUSY_EVENT = "kelasbit:busy";

/** Memberi tahu indikator loading global bahwa ada proses non-navigasi (mis. submit form). */
export function emitBusy(busy: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<boolean>(BUSY_EVENT, { detail: busy }));
}

function isInternalNavigation(anchor: HTMLAnchorElement): boolean {
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;

  return !(url.pathname === window.location.pathname && url.search === window.location.search);
}

/**
 * Mendeteksi navigasi internal (klik link same-origin) selama perpindahan halaman.
 * Dipakai bersama oleh NavigationProgress (bar atas) dan CenterLoading (indikator tengah).
 */
export function useNavigationPending(): boolean {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(false);
  }, [pathname]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    function stop() {
      clearTimeout(timer);
      timer = setTimeout(() => setActive(false), 240);
    }

    function onClick(event: MouseEvent) {
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as Element | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor || !isInternalNavigation(anchor)) return;

      clearTimeout(timer);
      setActive(true);
    }

    function onBusy(event: Event) {
      clearTimeout(timer);
      setActive(Boolean((event as CustomEvent<boolean>).detail));
    }

    document.addEventListener("click", onClick);
    window.addEventListener("beforeunload", stop);
    window.addEventListener(BUSY_EVENT, onBusy);

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("beforeunload", stop);
      window.removeEventListener(BUSY_EVENT, onBusy);
      clearTimeout(timer);
    };
  }, []);

  return active;
}
