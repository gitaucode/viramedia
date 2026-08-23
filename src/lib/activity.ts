import { getCloudflareContext } from "@opennextjs/cloudflare";

type D1Result<T> = { results?: T[] };
type D1Prepared = {
  bind: (...values: unknown[]) => D1Prepared;
  run: () => Promise<unknown>;
  all: <T = unknown>() => Promise<D1Result<T>>;
};
type D1DatabaseLike = { prepare: (sql: string) => D1Prepared };
type Env = { VIRA_DB?: D1DatabaseLike };

export type ActivityInput = {
  actorType?: "admin" | "creator" | "client" | "system";
  actorId?: string | number | null;
  campaignId?: number | null;
  creatorId?: number | null;
  clientId?: number | null;
  deliverableId?: number | null;
  eventType: string;
  title: string;
  detail?: string;
  metadata?: Record<string, unknown>;
};

export type ActivityEvent = {
  id: number;
  created_at: string;
  actor_type: string;
  actor_id: string | null;
  campaign_id: number | null;
  creator_id: number | null;
  client_id: number | null;
  deliverable_id: number | null;
  event_type: string;
  title: string;
  detail: string;
  metadata_json: string;
};

function getDb() {
  try {
    const { env } = getCloudflareContext();
    return (env as unknown as Env).VIRA_DB ?? null;
  } catch {
    return null;
  }
}

export async function recordActivity(input: ActivityInput) {
  const db = getDb();
  if (!db) return false;
  try {
    const metadata = JSON.stringify(input.metadata ?? {}).slice(0, 20000);
    await db.prepare(`INSERT INTO activity_events
      (actor_type,actor_id,campaign_id,creator_id,client_id,deliverable_id,event_type,title,detail,metadata_json)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .bind(
        input.actorType ?? "system",
        input.actorId == null ? null : String(input.actorId),
        input.campaignId ?? null,
        input.creatorId ?? null,
        input.clientId ?? null,
        input.deliverableId ?? null,
        input.eventType.slice(0, 100),
        input.title.slice(0, 240),
        (input.detail ?? "").slice(0, 3000),
        metadata,
      ).run();
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Activity event could not be recorded", error);
    return false;
  }
}

export async function listActivityEvents(campaignId: number, limit = 100) {
  const db = getDb();
  if (!db) return null;
  const safeLimit = Math.max(1, Math.min(250, Math.trunc(limit) || 100));
  const result = await db.prepare(`SELECT id,created_at,actor_type,actor_id,campaign_id,creator_id,client_id,deliverable_id,event_type,title,detail,metadata_json
    FROM activity_events
    WHERE campaign_id = ?
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT ?`)
    .bind(campaignId, safeLimit)
    .all<ActivityEvent>();
  return (result.results ?? []).map((event) => {
    let metadata: Record<string, unknown> = {};
    try { metadata = JSON.parse(event.metadata_json || "{}"); } catch { metadata = {}; }
    return { ...event, metadata };
  });
}
