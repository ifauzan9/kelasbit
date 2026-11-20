import { redirect } from "next/navigation";
import { destroySession, getCurrentUser, homePathForRole } from "@/lib/auth/session";
import { getMaintenanceSetting } from "@/lib/settings/maintenance";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    await destroySession();

    const maintenance = await getMaintenanceSetting();
    redirect(maintenance.enabled ? "/maintenance?sesi=berakhir" : "/login");
  }

  redirect(homePathForRole(user.role));
}
