import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getMaintenanceSetting } from "@/lib/settings/maintenance";

// Mode maintenance dibaca dari database setiap request, jadi halaman publik
// (termasuk landing page) tidak boleh di-prerender statis.
export const dynamic = "force-dynamic";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const maintenance = await getMaintenanceSetting();

  if (maintenance.enabled) {
    redirect("/maintenance");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
