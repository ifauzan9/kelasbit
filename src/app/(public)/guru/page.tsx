import type { Metadata } from "next";
import { MateriManager } from "@/components/guru/materi-manager";
import { logout } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/session";
import { listMateri } from "@/lib/guru/queries";

export const metadata: Metadata = {
  title: "Dashboard Guru — KelasBit",
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function GuruDashboardPage() {
  const user = await requireUser("guru");
  const rows = await listMateri();

  const materi = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    subject: row.subject,
    createdAtLabel: dateFormatter.format(row.createdAt),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
            Dashboard Guru
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
            Selamat datang, {user.name}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{user.email}</p>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-600"
          >
            Keluar
          </button>
        </form>
      </div>

      <MateriManager materi={materi} />
    </main>
  );
}
