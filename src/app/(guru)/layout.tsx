import type { ReactNode } from "react";
import { GuruShell } from "@/components/guru/guru-shell";
import { requireUser } from "@/lib/auth/session";

export default async function GuruLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("guru");

  return <GuruShell user={user}>{children}</GuruShell>;
}
