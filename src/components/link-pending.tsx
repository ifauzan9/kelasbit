"use client";

import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

export function LinkPendingIndicator({ idle }: { idle: ReactNode }) {
  const { pending } = useLinkStatus();

  return (
    <span
      className="relative flex h-4 w-4 shrink-0 items-center justify-center"
      data-pending={pending}
      aria-hidden
    >
      <span className="pending-indicator-idle flex items-center justify-center">{idle}</span>
      <span className="pending-indicator-ring" />
    </span>
  );
}
