import { redirect } from "next/navigation";
import { destroySession, getCurrentUser, homePathForRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    await destroySession();
    redirect("/login");
  }

  redirect(homePathForRole(user.role));
}
