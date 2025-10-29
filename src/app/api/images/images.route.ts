import { NextRequest, NextResponse } from "next/server";
import { listImages } from "@/services/images";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sortBy = (url.searchParams.get("sortBy") as "time" | "score") || "time";
  const channel = url.searchParams.get("channel") || undefined;
  const items = await listImages({ sortBy, channel });
  return NextResponse.json({ items });
}
