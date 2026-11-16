import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { CenterLoading } from "@/components/center-loading";
import { NavigationProgress } from "@/components/navigation-progress";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KelasBit — Informatika & KKA",
  description:
    "Media pendamping pembelajaran Informatika dan Koding & Kecerdasan Artifisial (KKA) untuk siswa.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body
        className={`${jakarta.variable} min-h-screen bg-[#f8f8fd] font-sans text-slate-900 antialiased`}
      >
        <NavigationProgress />
        <CenterLoading />
        {children}
      </body>
    </html>
  );
}
