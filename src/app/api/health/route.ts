import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getDb().execute(sql`select 1 as ok`);

    return NextResponse.json({
      status: "ok",
      db: result.rows[0]?.ok === 1,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}
