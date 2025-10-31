import { NextResponse } from "next/server";
import { deleteAllEvaluations } from "@/services/evaluations";

export async function POST() {
  const res = await deleteAllEvaluations();
  return NextResponse.json({ ok: true, ...res });
}
