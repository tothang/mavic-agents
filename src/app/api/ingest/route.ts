import { NextResponse } from "next/server";
import { ingestAll } from "@/services/ingest";

export async function POST() {
  const result = await ingestAll(process.cwd());
  if (!result.ok) return NextResponse.json(result, { status: 404 });
  return NextResponse.json(result);
}
