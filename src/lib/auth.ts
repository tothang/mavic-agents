import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_token";

export function signToken(username: string) {
  const secret = process.env.JWT_SECRET || "dev_secret_change";
  return jwt.sign({ sub: username }, secret, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  const secret = process.env.JWT_SECRET || "dev_secret_change";
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

export function getAuthUser() {
  const store = cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const data = verifyToken(token);
  if (!data) return null;
  return { username: (data as any).sub as string };
}

export function setAuthCookie(token: string) {
  cookies().set(COOKIE_NAME, token, { httpOnly: true, path: "/" });
}

export function clearAuthCookie() {
  cookies().delete(COOKIE_NAME);
}
