"use client";

import { useActionState } from "react";
import { Trash2 } from "@/components/icons";
import { useRefreshOnSuccess } from "@/components/guru/use-refresh-on-success";
import { deleteTugas, type TugasFormState } from "@/lib/tugas/actions";

const initialState: TugasFormState = {};

export function DeleteTugasButton({
  id,
  title,
}: {
  id: number;
  title: string;
}) {
  const [state, action, pending] = useActionState(deleteTugas, initialState);

  useRefreshOnSuccess(state);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        onClick={(event) => {
          if (
            !window.confirm(
              `Hapus tugas "${title}"? Semua pengumpulan siswa ikut terhapus.`,
            )
          ) {
            event.preventDefault();
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline">{pending ? "Menghapus…" : "Hapus"}</span>
      </button>
    </form>
  );
}
