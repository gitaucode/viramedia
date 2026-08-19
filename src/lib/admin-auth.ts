import { cookies } from "next/headers";

const COOKIE = "vira_admin";

async function digest(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function adminPasswordConfigured() {
  return Boolean(process.env.VIRA_ADMIN_PASSWORD);
}

export async function expectedAdminToken() {
  const password = process.env.VIRA_ADMIN_PASSWORD;
  if (!password) return null;
  return digest(`vira-admin:${password}`);
}

export async function isAdminAuthenticated() {
  const expected = await expectedAdminToken();
  if (!expected) return false;
  const jar = await cookies();
  return jar.get(COOKIE)?.value === expected;
}

export async function setAdminSession() {
  const token = await expectedAdminToken();
  if (!token) return false;
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return true;
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
}
