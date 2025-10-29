import { NextRequest, NextResponse } from "next/server";
import { evaluateImageById } from "@/services/evaluate";

export async function POST(req: NextRequest) {
  const { imageId } = await req.json();
  if (!imageId) return NextResponse.json({ ok: false, error: "missing_imageId" }, { status: 400 });
  const result = await evaluateImageById(imageId, process.cwd());
  if (!result.ok) return NextResponse.json(result, { status: 404 });
  return NextResponse.json(result);
}
