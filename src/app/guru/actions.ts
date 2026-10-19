"use server";

import { redirect } from "next/navigation";
import { hapusSesiGuru } from "@/lib/guru-sesi";

export async function logout() {
  await hapusSesiGuru();
  redirect("/login");
}