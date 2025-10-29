import { NextRequest, NextResponse } from "next/server";
import { signToken, setAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const u = process.env.ADMIN_USER || "admin";
  const p = process.env.ADMIN_PASS || "admin";
  if (username === u && password === p) {
    const token = signToken(username);
    setAuthCookie(token);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
}
