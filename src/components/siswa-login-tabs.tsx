"use client";

import { useState } from "react";
import { LoginForm } from "@/components/login-form";
import { LoginTokenForm } from "@/components/login-token-form";

type LoginMode = "password" | "token";

const tabs: { id: LoginMode; label: string }[] = [
  { id: "password", label: "Username" },
  { id: "token", label: "Token Kelas" },
];

export function SiswaLoginTabs({
  initialMode = "password",
}: {
  initialMode?: LoginMode;
}) {
  const [mode, setMode] = useState<LoginMode>(initialMode);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Metode login siswa"
        className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mode === tab.id}
            onClick={() => setMode(tab.id)}
            className={
              mode === tab.id
                ? "rounded-lg bg-white px-3 py-2 text-xs font-extrabold text-brand-700 shadow-sm transition-colors sm:text-sm"
                : "rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:text-slate-700 sm:text-sm"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {mode === "password" ? <LoginForm role="siswa" /> : <LoginTokenForm />}
      </div>
    </div>
  );
}
