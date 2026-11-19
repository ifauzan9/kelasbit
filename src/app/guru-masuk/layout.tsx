import type { ReactNode } from "react";

export default function GuruMasukLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#f8f8fd] py-10">
      {children}
    </div>
  );
}
