import { spawn, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import process from "node:process";

const CONFIG = "wrangler.test.jsonc";
const STATE = ".wrangler/test-state";
const BASE = "http://127.0.0.1:8788";
const PASSWORD = "vira-test-admin-password";
const CREATOR_COOKIE = "vira_creator=vira-test-creator-token";
const CLIENT_COOKIE = "vira_client=vira-test-client-token";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, CI: "true" } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
function assert(condition, message) { if (!condition) throw new Error(message); }
async function waitForServer() {
  for (let i = 0; i < 90; i++) { try { const response = await fetch(`${BASE}/admin`); if (response.ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 500)); }
  throw new Error("Timed out waiting for test Next.js server");
}
async function uploadR2(deliverableId, bytes, name, note) {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: "video/mp4" }), name);
  form.append("note", note);
  const response = await fetch(`${BASE}/api/portal/deliverables/${deliverableId}/submissions`, { method: "POST", headers: { Cookie: CREATOR_COOKIE }, body: form });
  assert(response.ok, `${name} upload failed with ${response.status}`);
  return (await response.json()).version;
}

async function main() {
  rmSync(STATE, { recursive: true, force: true });
  run("npx", ["wrangler", "d1", "migrations", "apply", "vira-creators-test", "--local", "--config", CONFIG, "--persist-to", STATE]);
  run("npx", ["wrangler", "d1", "execute", "vira-creators-test", "--local", "--config", CONFIG, "--persist-to", STATE, "--file", "scripts/test-seed.sql"]);

  const server = spawn("npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "8788"], {
    stdio: "inherit", shell: process.platform === "win32",
    env: { ...process.env, VIRA_ADMIN_PASSWORD: PASSWORD, VIRA_TEST_WRANGLER_CONFIG: CONFIG, VIRA_TEST_D1_STATE: STATE, NEXT_TELEMETRY_DISABLED: "1" },
  });

  try {
    await waitForServer();
    let response = await fetch(`${BASE}/api/admin/dashboard`);
    assert(response.status === 401, `Expected unauthenticated dashboard 401, got ${response.status}`);

    response = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: PASSWORD }) });
    assert(response.ok, `Admin login failed with ${response.status}`);
    const cookie = (response.headers.get("set-cookie") || "").split(";")[0];
    assert(cookie.includes("vira_admin="), "Admin session cookie was not issued");
    const auth = { Cookie: cookie, "Content-Type": "application/json" };

    response = await fetch(`${BASE}/api/admin/dashboard`, { headers: { Cookie: cookie } });
    assert(response.ok, `Authenticated dashboard failed with ${response.status}`);
    response = await fetch(`${BASE}/api/admin/shortlists`, { headers: { Cookie: cookie } });
    assert(response.status === 410, `Expected retired shortlist API 410, got ${response.status}`);
    response = await fetch(`${BASE}/api/admin/campaigns`, { headers: { Cookie: cookie } });
    const campaigns = (await response.json()).campaigns || [];
    assert(response.ok && campaigns.length === 1 && campaigns[0].id === 1, "Canonical campaign migration did not preserve campaign ID 1");

    response = await fetch(`${BASE}/api/creator-application`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "Duplicate Creator", email: "CREATOR-TEST@EXAMPLE.COM", phone: "+254700000099", city: "Nairobi", tiktok: "@duplicate" }) });
    assert(response.status === 409, `Expected duplicate creator email 409, got ${response.status}`);

    response = await fetch(`${BASE}/api/admin/clients`, { method: "POST", headers: auth, body: JSON.stringify({ action: "link", campaignId: 1, clientId: 1 }) });
    assert(response.ok, `Client campaign link failed with ${response.status}`);
    response = await fetch(`${BASE}/api/admin/clients`, { method: "POST", headers: auth, body: JSON.stringify({ action: "link", campaignId: 1, clientId: 2, primary: true }) });
    assert(response.ok, `Second client link failed with ${response.status}`);
    response = await fetch(`${BASE}/api/admin/clients`, { method: "POST", headers: auth, body: JSON.stringify({ action: "unlink", campaignId: 1, clientId: 2 }) });
    assert(response.ok, `Primary client unlink failed with ${response.status}`);
    response = await fetch(`${BASE}/api/admin/clients?campaignId=1`, { headers: { Cookie: cookie } });
    const linkedClients = (await response.json()).clients || [];
    assert(linkedClients.length === 1 && linkedClients[0].id === 1 && Number(linkedClients[0].is_primary) === 1, "Primary client fallback failed");

    response = await fetch(`${BASE}/api/admin/campaign-creators`, { method: "POST", headers: auth, body: JSON.stringify({ action: "add", campaignId: 1, creatorId: 1, status: "shortlisted" }) });
    assert(response.ok, `Creator shortlisting failed with ${response.status}`);
    response = await fetch(`${BASE}/api/admin/campaign-creators`, { method: "POST", headers: auth, body: JSON.stringify({ action: "add", campaignId: 1, creatorId: 1, status: "assigned" }) });
    assert(response.ok, `Creator assignment failed with ${response.status}`);

    response = await fetch(`${BASE}/api/admin/deliverables`, { method: "POST", headers: auth, body: JSON.stringify({ campaignId: 1, creatorId: 1, title: "Automated Test Deliverable", status: "pending", creatorFee: 25000 }) });
    assert(response.ok, `Deliverable creation failed with ${response.status}`);
    response = await fetch(`${BASE}/api/admin/deliverables?campaignId=1`, { headers: { Cookie: cookie } });
    const deliverables = (await response.json()).deliverables || [];
    assert(deliverables.length === 1, `Expected 1 deliverable, got ${deliverables.length}`);
    const deliverableId = deliverables[0].id;

    response = await fetch(`${BASE}/api/admin/deliverables`, { method: "PATCH", headers: auth, body: JSON.stringify({ id: deliverableId, status: "in_progress" }) });
    assert(response.ok, `Deliverable status update failed with ${response.status}`);

    const v1 = await uploadR2(deliverableId, [0,1,2,3,4,5,6,7,8,9,10,11], "test-v1.mp4", "Automated V1 upload");
    assert(v1.versionNumber === 1 && v1.sourceType === "r2", "V1 was not stored as R2");
    response = await fetch(`${BASE}/api/media/submissions/${v1.id}`);
    assert(response.status === 401, `Expected protected media 401, got ${response.status}`);
    response = await fetch(`${BASE}/api/media/submissions/${v1.id}`, { headers: { Cookie: CREATOR_COOKIE, Range: "bytes=2-5" } });
    const ranged = new Uint8Array(await response.arrayBuffer());
    assert(response.status === 206 && ranged.length === 4 && ranged[0] === 2 && ranged[3] === 5, "R2 byte-range streaming failed");

    response = await fetch(`${BASE}/api/admin/deliverables`, { method: "PATCH", headers: auth, body: JSON.stringify({ id: deliverableId, status: "approved" }) });
    assert(response.status === 409, `Expected generic approval bypass to be blocked with 409, got ${response.status}`);

    response = await fetch(`${BASE}/api/admin/reviews`, { method: "POST", headers: auth, body: JSON.stringify({ deliverableId, versionId: v1.id, action: "changes_requested", feedback: "Tighten the opening hook" }) });
    assert(response.ok, `V1 revision request failed with ${response.status}`);

    const v2 = await uploadR2(deliverableId, [20,21,22,23,24,25,26,27,28,29], "test-v2.mp4", "Automated V2 revision");
    assert(v2.versionNumber === 2 && v2.sourceType === "r2", "V2 was not stored as R2");
    response = await fetch(`${BASE}/api/admin/reviews`, { method: "POST", headers: auth, body: JSON.stringify({ deliverableId, versionId: v1.id, action: "approved" }) });
    assert(response.status === 409, `Expected stale V1 approval to be blocked with 409, got ${response.status}`);
    response = await fetch(`${BASE}/api/admin/reviews`, { method: "POST", headers: auth, body: JSON.stringify({ deliverableId, versionId: v2.id, action: "approved" }) });
    assert(response.ok, `V2 internal approval failed with ${response.status}`);

    response = await fetch(`${BASE}/api/admin/reporting`, { method: "PATCH", headers: auth, body: JSON.stringify({ kind: "share", campaignId: 1, deliverableId, clientApprovalStatus: "awaiting_client" }) });
    const shareV2 = await response.json();
    assert(response.ok && shareV2.submissionVersionId === v2.id, `Expected V2 to be pinned for client review, got ${shareV2.submissionVersionId}`);

    response = await fetch(`${BASE}/api/media/submissions/${v1.id}`, { headers: { Cookie: CLIENT_COOKIE } });
    assert(response.status === 401, `Expected client to be denied internal V1, got ${response.status}`);
    response = await fetch(`${BASE}/api/media/submissions/${v2.id}`, { headers: { Cookie: CLIENT_COOKIE, Range: "bytes=0-2" } });
    assert(response.status === 206, `Expected client access to pinned V2, got ${response.status}`);

    response = await fetch(`${BASE}/api/client/campaigns/1`, { method: "PATCH", headers: { Cookie: CLIENT_COOKIE, "Content-Type": "application/json" }, body: JSON.stringify({ deliverableId, status: "changes_requested", feedback: "Please shorten the ending" }) });
    assert(response.ok, `Client V2 changes request failed with ${response.status}`);

    const v3Form = new FormData();
    v3Form.append("url", "https://example.com/test-v3");
    v3Form.append("note", "Automated external V3");
    response = await fetch(`${BASE}/api/portal/deliverables/${deliverableId}/submissions`, { method: "POST", headers: { Cookie: CREATOR_COOKIE }, body: v3Form });
    assert(response.ok, `Creator external V3 failed with ${response.status}`);
    const v3 = (await response.json()).version;
    assert(v3.versionNumber === 3 && v3.sourceType === "external", "V3 external fallback failed");

    response = await fetch(`${BASE}/api/admin/reporting`, { method: "PATCH", headers: auth, body: JSON.stringify({ kind: "share", campaignId: 1, deliverableId, clientApprovalStatus: "awaiting_client" }) });
    assert(response.status === 400, `Expected unapproved V3 client share to be blocked, got ${response.status}`);
    response = await fetch(`${BASE}/api/admin/reviews`, { method: "POST", headers: auth, body: JSON.stringify({ deliverableId, versionId: v3.id, action: "approved" }) });
    assert(response.ok, `V3 internal approval failed with ${response.status}`);
    response = await fetch(`${BASE}/api/admin/reporting`, { method: "PATCH", headers: auth, body: JSON.stringify({ kind: "share", campaignId: 1, deliverableId, clientApprovalStatus: "awaiting_client" }) });
    const shareV3 = await response.json();
    assert(response.ok && shareV3.submissionVersionId === v3.id, "V3 was not pinned for client review");
    response = await fetch(`${BASE}/api/client/campaigns/1`, { method: "PATCH", headers: { Cookie: CLIENT_COOKIE, "Content-Type": "application/json" }, body: JSON.stringify({ deliverableId, status: "approved" }) });
    assert(response.ok, `Client V3 approval failed with ${response.status}`);

    response = await fetch(`${BASE}/api/admin/reviews?campaignId=1`, { headers: { Cookie: cookie } });
    assert(response.ok, `Review ledger listing failed with ${response.status}`);
    const ledger = await response.json();
    assert((ledger.versions || []).length === 3, `Expected 3 immutable versions, got ${(ledger.versions || []).length}`);
    const reviewActions = (ledger.events || []).map((e) => `${e.reviewer_type}:${e.action}:v${e.submission_version_id}`);
    assert((ledger.events || []).some((e) => e.submission_version_id === v1.id && e.reviewer_type === "admin" && e.action === "changes_requested"), "Missing V1 internal changes review event");
    assert((ledger.events || []).some((e) => e.submission_version_id === v2.id && e.reviewer_type === "admin" && e.action === "approved"), "Missing V2 internal approval event");
    assert((ledger.events || []).some((e) => e.submission_version_id === v2.id && e.reviewer_type === "client" && e.action === "changes_requested"), "Missing V2 client changes event");
    assert((ledger.events || []).some((e) => e.submission_version_id === v3.id && e.reviewer_type === "client" && e.action === "approved"), "Missing V3 client approval event");

    response = await fetch(`${BASE}/api/admin/deliverables`, { method: "PATCH", headers: auth, body: JSON.stringify({ id: deliverableId, paymentStatus: "paid" }) });
    assert(response.ok, `Payment update failed with ${response.status}`);
    response = await fetch(`${BASE}/api/admin/activity?campaignId=1`, { headers: { Cookie: cookie } });
    const events = (await response.json()).events || [];
    const types = new Set(events.map((event) => event.event_type));
    for (const expected of ["campaign_client.linked","campaign_creator.assigned","deliverable.created","deliverable.submitted","submission.internal_changes_requested","submission.internal_approved","deliverable.client_review_status_changed","deliverable.client_changes_requested","deliverable.client_approved","deliverable.payment_changed"]) assert(types.has(expected), `Missing activity event: ${expected}`);
    assert(events.filter((event) => event.event_type === "deliverable.submitted").length === 3, "Expected three submission activity events");

    response = await fetch(`${BASE}/api/admin/logout`, { method: "POST", headers: { Cookie: cookie } });
    assert(response.ok, `Logout failed with ${response.status}`);
    const clearCookie = (response.headers.get("set-cookie") || "").split(";")[0];
    response = await fetch(`${BASE}/api/admin/dashboard`, { headers: { Cookie: clearCookie || cookie } });
    assert(response.status === 401, `Expected dashboard 401 after logout, got ${response.status}`);

    console.log("\n✓ Review workflow smoke test passed");
    console.log(`✓ Verified V1 changes → V2 client changes → V3 client approval with ${ledger.events.length} review events`);
    console.log(`✓ Review ledger markers: ${reviewActions.join(", ")}`);
  } finally {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore", shell: true });
    else server.kill("SIGTERM");
  }
}

main().catch((error) => { console.error("\n✗ Review workflow smoke test failed"); console.error(error); process.exitCode = 1; });
