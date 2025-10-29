import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function contentType(p: string) {
  const ext = (p.split(".").pop() || "").toLowerCase();
  if (["png","jpg","jpeg","gif","webp","bmp"].includes(ext)) return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  if (["mp4","webm","mov"].includes(ext)) return `video/${ext}`;
  return "application/octet-stream";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rel = url.searchParams.get("path");
  if (!rel) return new NextResponse("missing path", { status: 400 });
  const abs = path.join(process.cwd(), rel);
  if (!abs.startsWith(process.cwd())) return new NextResponse("forbidden", { status: 403 });
  if (!fs.existsSync(abs)) return new NextResponse("not found", { status: 404 });
  const data = fs.readFileSync(abs);
  return new NextResponse(data, { status: 200, headers: { "Content-Type": contentType(abs) } });
}
