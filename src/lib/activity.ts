import { getCloudflareContext } from "@opennextjs/cloudflare";

type D1Prepared = {
  bind: (...values: unknown[]) => D1Prepared;
  run: () => Promise<unknown>;
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
