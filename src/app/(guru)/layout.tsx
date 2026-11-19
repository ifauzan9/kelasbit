import type { ReactNode } from "react";
import { GuruShell } from "@/components/guru/guru-shell";
import { requireUser } from "@/lib/auth/session";
import {
  getEffectiveMaintenanceToken,
  getMaintenanceSetting,
  maintenanceLoginPath,
} from "@/lib/settings/maintenance";

export default async function GuruLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser("guru");
  const maintenance = await getMaintenanceSetting();

  let loginPath: string | null = null;

  if (maintenance.enabled) {
    const effective = await getEffectiveMaintenanceToken();

    if (effective.token) {
      loginPath = maintenanceLoginPath(effective.token);
    }
  }

  return (
    <GuruShell user={user} maintenanceLoginPath={loginPath}>
      {children}
    </GuruShell>
  );
}
