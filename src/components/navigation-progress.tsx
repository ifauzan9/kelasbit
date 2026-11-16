"use client";

import { useNavigationPending } from "@/lib/hooks/use-navigation-pending";

export function NavigationProgress() {
  const active = useNavigationPending();

  return (
    <div className="nav-progress" data-active={active} role="presentation" aria-hidden>
      <div className="nav-progress-track" />
      <div className="nav-progress-bar" />
    </div>
  );
}
