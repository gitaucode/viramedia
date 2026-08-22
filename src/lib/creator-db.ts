import { getCloudflareContext } from "@opennextjs/cloudflare";

type D1Result<T> = { results?: T[] };
type D1Prepared = {
  bind: (...values: unknown[]) => D1Prepared;
  first: <T = unknown>() => Promise<T | null>;
  all: <T = unknown>() => Promise<D1Result<T>>;
  run: () => Promise<unknown>;
};
type D1DatabaseLike = { prepare: (sql: string) => D1Prepared };

type ViraEnv = { VIRA_DB?: D1DatabaseLike };

export type CreatorRecord = {
  id: number;
  created_at: string;
  updated_at: string;
  status: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  age_bracket: string | null;
  gender: string | null;
  tiktok: string;
  tiktok_followers: string | null;
  avg_views: string | null;
  instagram: string | null;
  instagram_followers: string | null;
  youtube: string | null;
  best_content: string | null;
  niches: string;
  languages: string | null;
  formats: string;
  brand_experience: string | null;
  past_brands: string | null;
  ugc: string | null;
  own_account: string | null;
  paid_usage: string | null;
  physical_shoots: string | null;
  travel: string | null;
  rate_range: string | null;
  portfolio: string | null;
  notes: string;
};

export function getCreatorDb() {
  try {
    const { env } = getCloudflareContext();
    return (env as unknown as ViraEnv).VIRA_DB ?? null;
  } catch {
    return null;
  }
}

export function jsonList(value: unknown) {
  return JSON.stringify(Array.isArray(value) ? value.filter((x) => typeof x === "string").slice(0, 30) : []);
}

export function parseList(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function saveCreatorApplication(data: Record<string, unknown>) {
  const db = getCreatorDb();
  if (!db) return { saved: false, reason: "DB_NOT_CONFIGURED" as const };

  const s = (key: string, max = 500) => typeof data[key] === "string" ? String(data[key]).trim().slice(0, max) : "";
  const email = s("email",160).toLowerCase();
  const existing = await db.prepare("SELECT id FROM creators WHERE email = ? COLLATE NOCASE").bind(email).first<{id:number}>();
  if (existing) return { saved: false, reason: "EMAIL_EXISTS" as const, creatorId: existing.id };

  await db.prepare(`INSERT INTO creators (
    full_name,email,phone,city,age_bracket,gender,tiktok,tiktok_followers,avg_views,instagram,instagram_followers,youtube,best_content,niches,languages,formats,brand_experience,past_brands,ugc,own_account,paid_usage,physical_shoots,travel,rate_range,portfolio
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    s("fullName",100),email,s("phone",50),s("city",100),s("ageBracket",30),s("gender",30),s("tiktok",250),s("tiktokFollowers",50),s("avgViews",50),s("instagram",250),s("instagramFollowers",50),s("youtube",250),s("bestContent",500),jsonList(data.niches),s("languages",200),jsonList(data.formats),s("brandExperience",10),s("pastBrands",1000),s("ugc",10),s("ownAccount",10),s("paidUsage",10),s("physicalShoots",10),s("travel",10),s("rateRange",150),s("portfolio",500)
  ).run();
  return { saved: true as const };
}

export async function listCreators(filters: { q?: string; status?: string; city?: string }) {
  const db = getCreatorDb();
  if (!db) return null;
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (filters.status && filters.status !== "all") { clauses.push("status = ?"); values.push(filters.status); }
  if (filters.city && filters.city !== "all") { clauses.push("LOWER(city) = LOWER(?)"); values.push(filters.city); }
  if (filters.q) {
    clauses.push("(LOWER(full_name) LIKE LOWER(?) OR LOWER(tiktok) LIKE LOWER(?) OR LOWER(niches) LIKE LOWER(?) OR LOWER(languages) LIKE LOWER(?))");
    const q = `%${filters.q}%`; values.push(q,q,q,q);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await db.prepare(`SELECT * FROM creators ${where} ORDER BY datetime(created_at) DESC LIMIT 250`).bind(...values).all<CreatorRecord>();
  return result.results ?? [];
}

export async function getCreator(id: number) {
  const db = getCreatorDb();
  if (!db) return null;
  return db.prepare("SELECT * FROM creators WHERE id = ?").bind(id).first<CreatorRecord>();
}
