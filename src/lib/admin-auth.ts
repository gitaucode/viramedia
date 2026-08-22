import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies } from "next/headers";

const COOKIE = "vira_admin";
const SESSION_SECONDS = 60 * 60 * 12;

type D1Prepared = {
  bind: (...values: unknown[]) => D1Prepared;
  first: <T = unknown>() => Promise<T | null>;
  run: () => Promise<unknown>;
};
type D1DatabaseLike = { prepare: (sql: string) => D1Prepared };
type Env = { VIRA_DB?: D1DatabaseLike };

function getDb() {
  try {
    const { env } = getCloudflareContext();
    return (env as unknown as Env).VIRA_DB ?? null;
  } catch {
    return null;
  }
}

async function digest(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function adminPasswordConfigured() {
  return Boolean(process.env.VIRA_ADMIN_PASSWORD);
}

// Local Next.js development can run without a Cloudflare D1 binding. Keep a
// development-only fallback so local UI work does not depend on Workers runtime.
async function localFallbackToken() {
  const password = process.env.VIRA_ADMIN_PASSWORD;
  if (!password || process.env.NODE_ENV === "production") return null;
  return digest(`vira-admin-local:${password}`);
}

export async function isAdminAuthenticated() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return false;

  const db = getDb();
  if (!db) return token === await localFallbackToken();

  try {
    const tokenHash = await digest(token);
    const session = await db.prepare(
      "SELECT token_hash FROM admin_sessions WHERE token_hash = ? AND datetime(expires_at) > CURRENT_TIMESTAMP"
    ).bind(tokenHash).first<{ token_hash: string }>();
    if (!session) return false;
    await db.prepare("UPDATE admin_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token_hash = ?").bind(tokenHash).run();
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Admin session table unavailable in local development", error);
      return token === await localFallbackToken();
    }
    return false;
  }
}

export async function setAdminSession() {
  const jar = await cookies();
  const db = getDb();

  if (!db) {
    const fallback = await localFallbackToken();
    if (!fallback) return false;
    jar.set(COOKIE, fallback, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return true;
  }

  const token = randomToken();
  const tokenHash = await digest(token);
  await db.prepare("DELETE FROM admin_sessions WHERE datetime(expires_at) <= CURRENT_TIMESTAMP").run();
  await db.prepare(
    "INSERT INTO admin_sessions (token_hash,expires_at) VALUES (?,datetime('now','+12 hours'))"
  ).bind(tokenHash).run();

  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return true;
}

export async function clearAdminSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  const db = getDb();
  if (token && db) {
    try {
      await db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(await digest(token)).run();
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn("Could not revoke local admin session", error);
    }
  }
  jar.set(COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
