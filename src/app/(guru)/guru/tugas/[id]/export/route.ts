import { requireUser } from "@/lib/auth/session";
import { buildTugasProgressExcel } from "@/lib/tugas/tugas-excel";
import { getTugasForGuru, getTugasRoster } from "@/lib/tugas/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser("guru");

  const { id: rawId } = await params;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    return new Response("Tugas tidak ditemukan.", { status: 404 });
  }

  const tugas = await getTugasForGuru(id);
  if (!tugas) {
    return new Response("Tugas tidak ditemukan.", { status: 404 });
  }

  const roster = await getTugasRoster(id);
  if (!roster) {
    return new Response("Tugas tidak ditemukan.", { status: 404 });
  }

  const buffer = await buildTugasProgressExcel(tugas, roster);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="progres-tugas-${id}.xlsx"`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
