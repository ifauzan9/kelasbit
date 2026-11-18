"use client";

import { useEffect, useState } from "react";

/**
 * Workaround untuk bug React 19.2 (dipakai Next 15.5): ping `thenable` yang
 * datang saat fase render bisa hilang, sehingga transisi router — misalnya
 * `router.refresh()` setelah Server Action — tidak pernah di-commit. Akibatnya
 * data sudah berubah di server tapi daftar di layar tetap lama.
 *
 * Satu state update kecil di root membuat lane yang macet diproses ulang dan
 * transisi yang tertunda langsung commit. Lihat:
 * https://github.com/react/react/issues/37830 (fixed di React 19.3).
 */
let nudge: (() => void) | null = null;

export function nudgeRouter() {
  nudge?.();
}

export function RouterNudge() {
  const [, setTick] = useState(0);

  useEffect(() => {
    nudge = () => setTick((tick) => tick + 1);

    return () => {
      nudge = null;
    };
  }, []);

  return null;
}
