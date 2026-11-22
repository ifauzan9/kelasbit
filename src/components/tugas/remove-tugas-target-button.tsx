"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "@/components/icons";
import { removeTugasTarget } from "@/lib/tugas/actions";

export function RemoveTugasTargetButton({
  tugasId,
  userId,
  name,
}: {
  tugasId: number;
  userId: number;
  name: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (pending) return;
    if (
      !window.confirm(
        `Hapus ${name} dari target tugas ini?\n\nJawaban, nilai, dan riwayat yang sudah ada tetap disimpan.`,
      )
    ) {
      return;
    }

    setPending(true);
    const result = await removeTugasTarget({ tugasId, userId });
    setPending(false);

    if (!result.ok) {
      window.alert(result.error ?? "Gagal menghapus siswa.");
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      aria-label={`Hapus ${name} dari target`}
      title="Hapus dari target"
      className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <X className="h-3 w-3" />
    </button>
  );
}
