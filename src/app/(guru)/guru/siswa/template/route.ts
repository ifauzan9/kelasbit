import { requireUser } from "@/lib/auth/session";
import { buildSiswaTemplate } from "@/lib/guru/siswa-excel";
import { listKelasWithCount } from "@/lib/guru/siswa-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireUser("guru");

  const kelasRows = await listKelasWithCount();
  const buffer = await buildSiswaTemplate(
    kelasRows.map((row) => ({
      id: row.id,
      name: row.name,
      academicYear: row.academicYear,
    })),
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-siswa.xlsx"',
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
