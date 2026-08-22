import { spawn, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import process from "node:process";

const CONFIG = "wrangler.test.jsonc";
const STATE = ".wrangler/test-state";
const BASE = "http://127.0.0.1:8788";
const PASSWORD = "vira-test-admin-password";
const CREATOR_COOKIE = "vira_creator=vira-test-creator-token";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, CI: "true" },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForServer() {
  for (let i = 0; i < 90; i++) {
    try {
      const response = await fetch(`${BASE}/admin`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for test Next.js server");
}

async function main() {
  rmSync(STATE, { recursive: true, force: true });

  run("npx", ["wrangler", "d1", "migrations", "apply", "vira-creators-test", "--local", "--config", CONFIG, "--persist-to", STATE]);
  run("npx", ["wrangler", "d1", "execute", "vira-creators-test", "--local", "--config", CONFIG, "--persist-to", STATE, "--file", "scripts/test-seed.sql"]);

  const server = spawn("npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "8788"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      VIRA_ADMIN_PASSWORD: PASSWORD,
      VIRA_TEST_WRANGLER_CONFIG: CONFIG,
      VIRA_TEST_D1_STATE: STATE,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });

  try {
    await waitForServer();

    let response = await fetch(`${BASE}/api/admin/dashboard`);
    assert(response.status === 401, `Expected unauthenticated dashboard 401, got ${response.status}`);

    response = await fetch(`${BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: PASSWORD }),
    });
    assert(response.ok, `Admin login failed with ${response.status}`);
    const setCookie = response.headers.get("set-cookie") || "";
    const cookie = setCookie.split(";")[0];
    assert(cookie.includes("vira_admin="), "Admin session cookie was not issued");

    const auth = { Cookie: cookie, "Content-Type": "application/json" };

    response = await fetch(`${BASE}/api/admin/dashboard`, { headers: { Cookie: cookie } });
    assert(response.ok, `Authenticated dashboard failed with ${response.status}`);

    response = await fetch(`${BASE}/api/admin/shortlists`, { headers: { Cookie: cookie } });
    assert(response.status === 410, `Expected retired shortlist API 410, got ${response.status}`);

    response = await fetch(`${BASE}/api/admin/campaigns`, { headers: { Cookie: cookie } });
    assert(response.ok, `Campaign listing failed with ${response.status}`);
    const campaigns = (await response.json()).campaigns || [];
    assert(campaigns.length === 1 && campaigns[0].id === 1, "Canonical campaign migration did not preserve campaign ID 1");

    response = await fetch(`${BASE}/api/creator-application`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: "Duplicate Creator", email: "CREATOR-TEST@EXAMPLE.COM", phone: "+254700000099", city: "Nairobi", tiktok: "@duplicate" }),
    });
    assert(response.status === 409, `Expected duplicate creator email 409, got ${response.status}`);

    response = await fetch(`${BASE}/api/admin/clients`, { method: "POST", headers: auth, body: JSON.stringify({ action: "link", campaignId: 1, clientId: 1 }) });
    assert(response.ok, `Client campaign link failed with ${response.status}`);
    response = await fetch(`${BASE}/api/admin/clients?campaignId=1`, { headers: { Cookie: cookie } });
    assert(response.ok, `Linked client listing failed with ${response.status}`);
    let linkedClients = (await response.json()).clients || [];
    assert(linkedClients.length === 1 && linkedClients[0].id === 1 && Number(linkedClients[0].is_primary) === 1, "First linked client was not made primary");

    response = await fetch(`${BASE}/api/admin/clients`, { method: "POST", headers: auth, body: JSON.stringify({ action: "link", campaignId: 1, clientId: 2, primary: true }) });
    assert(response.ok, `Second client link failed with ${response.status}`);
    response = await fetch(`${BASE}/api/admin/clients?campaignId=1`, { headers: { Cookie: cookie } });
    linkedClients = (await response.json()).clients || [];
    assert(Number(linkedClients.find((c) => c.id === 2)?.is_primary) === 1, "Explicit primary client was not set");
    assert(Number(linkedClients.find((c) => c.id === 1)?.is_primary) === 0, "Previous primary client was not demoted");

    response = await fetch(`${BASE}/api/admin/clients`, { method: "POST", headers: auth, body: JSON.stringify({ action: "unlink", campaignId: 1, clientId: 2 }) });
    assert(response.ok, `Primary client unlink failed with ${response.status}`);
    response = await fetch(`${BASE}/api/admin/clients?campaignId=1`, { headers: { Cookie: cookie } });
    linkedClients = (await response.json()).clients || [];
    assert(linkedClients.length === 1 && linkedClients[0].id === 1 && Number(linkedClients[0].is_primary) === 1, "Remaining client was not promoted after primary unlink");

    response = await fetch(`${BASE}/api/admin/campaign-creators`, { method: "POST", headers: auth, body: JSON.stringify({ action: "add", campaignId: 1, creatorId: 1, status: "shortlisted" }) });
    assert(response.ok, `Creator shortlisting failed with ${response.status}`);
    response = await fetch(`${BASE}/api/admin/campaign-creators?campaignId=1`, { headers: { Cookie: cookie } });
    assert(response.ok, `Campaign creator listing failed with ${response.status}`);
    let campaignCreators = (await response.json()).creators || [];
    assert(campaignCreators.length === 1 && campaignCreators[0].assignment_status === "shortlisted", "Creator was not stored as shortlisted");

    response = await fetch(`${BASE}/api/admin/campaign-creators`, { method: "POST", headers: auth, body: JSON.stringify({ action: "add", campaignId: 1, creatorId: 1, status: "assigned" }) });
    assert(response.ok, `Creator assignment failed with ${response.status}`);
    response = await fetch(`${BASE}/api/admin/campaign-creators?campaignId=1`, { headers: { Cookie: cookie } });
    campaignCreators = (await response.json()).creators || [];
    assert(campaignCreators[0]?.assignment_status === "assigned", "Creator lifecycle did not move shortlisted → assigned");

    response = await fetch(`${BASE}/api/admin/deliverables`, { method: "POST", headers: auth, body: JSON.stringify({ campaignId: 1, creatorId: 1, title: "Automated Test Deliverable", status: "pending", creatorFee: 25000 }) });
    assert(response.ok, `Deliverable creation failed with ${response.status}`);
    response = await fetch(`${BASE}/api/admin/deliverables?campaignId=1`, { headers: { Cookie: cookie } });
    assert(response.ok, `Deliverable listing failed with ${response.status}`);
    const deliverables = (await response.json()).deliverables || [];
    assert(deliverables.length === 1, `Expected 1 deliverable, got ${deliverables.length}`);
    const deliverableId = deliverables[0].id;

    response = await fetch(`${BASE}/api/admin/deliverables`, { method: "PATCH", headers: auth, body: JSON.stringify({ id: deliverableId, status: "in_progress" }) });
    assert(response.ok, `Deliverable status update failed with ${response.status}`);

    const v1Form = new FormData();
    v1Form.append("file", new Blob([new Uint8Array([0,1,2,3,4,5,6,7,8,9,10,11])], { type: "video/mp4" }), "test-v1.mp4");
    v1Form.append("note", "Automated V1 upload");
    response = await fetch(`${BASE}/api/portal/deliverables/${deliverableId}/submissions`, { method: "POST", headers: { Cookie: CREATOR_COOKIE }, body: v1Form });
    assert(response.ok, `Creator R2 V1 upload failed with ${response.status}`);
    const v1 = (await response.json()).version;
    assert(v1?.versionNumber === 1 && v1?.sourceType === "r2", "V1 was not stored as an R2 submission version");

    response = await fetch(`${BASE}/api/media/submissions/${v1.id}`);
    assert(response.status === 401, `Expected protected media to reject unauthenticated access, got ${response.status}`);
    response = await fetch(`${BASE}/api/media/submissions/${v1.id}`, { headers: { Cookie: CREATOR_COOKIE, Range: "bytes=2-5" } });
    assert(response.status === 206, `Expected ranged creator media response 206, got ${response.status}`);
    const ranged = new Uint8Array(await response.arrayBuffer());
    assert(ranged.length === 4 && ranged[0] === 2 && ranged[3] === 5, "R2 byte-range media response was incorrect");

    const v2Form = new FormData();
    v2Form.append("url", "https://example.com/test-v2");
    v2Form.append("note", "Automated external V2");
    response = await fetch(`${BASE}/api/portal/deliverables/${deliverableId}/submissions`, { method: "POST", headers: { Cookie: CREATOR_COOKIE }, body: v2Form });
    assert(response.ok, `Creator external V2 submission failed with ${response.status}`);
    const v2 = (await response.json()).version;
    assert(v2?.versionNumber === 2 && v2?.sourceType === "external", "V2 was not stored as an external submission version");

    response = await fetch(`${BASE}/api/portal/campaigns/1`, { headers: { Cookie: CREATOR_COOKIE } });
    assert(response.ok, `Creator campaign version history failed with ${response.status}`);
    const creatorCampaign = await response.json();
    assert((creatorCampaign.versions || []).length === 2, `Expected 2 immutable submission versions, got ${(creatorCampaign.versions || []).length}`);
    assert(creatorCampaign.versions[0].version_number === 2 && creatorCampaign.versions[1].version_number === 1, "Submission versions are not ordered newest first");

    response = await fetch(`${BASE}/api/admin/deliverables`, { method: "PATCH", headers: auth, body: JSON.stringify({ id: deliverableId, paymentStatus: "paid" }) });
    assert(response.ok, `Payment update failed with ${response.status}`);
    response = await fetch(`${BASE}/api/admin/deliverables`, { method: "PATCH", headers: auth, body: JSON.stringify({ id: deliverableId, status: "approved" }) });
    assert(response.ok, `Internal approval failed with ${response.status}`);
    response = await fetch(`${BASE}/api/admin/reporting`, { method: "PATCH", headers: auth, body: JSON.stringify({ kind: "share", campaignId: 1, deliverableId, clientApprovalStatus: "awaiting_client" }) });
    assert(response.ok, `Client review sharing failed with ${response.status}`);

    response = await fetch(`${BASE}/api/admin/campaign-creators`, { method: "POST", headers: auth, body: JSON.stringify({ action: "remove", campaignId: 1, creatorId: 1 }) });
    assert(response.ok, `Creator removal failed with ${response.status}`);

    response = await fetch(`${BASE}/api/admin/activity?campaignId=1`, { headers: { Cookie: cookie } });
    assert(response.ok, `Activity endpoint failed with ${response.status}`);
    const events = (await response.json()).events || [];
    const types = new Set(events.map((event) => event.event_type));
    for (const expected of ["campaign_client.linked","campaign_client.primary_changed","campaign_client.unlinked","campaign_creator.shortlisted","campaign_creator.assigned","deliverable.created","deliverable.status_changed","deliverable.payment_changed","deliverable.submitted","deliverable.client_review_status_changed","campaign_creator.removed"]) assert(types.has(expected), `Missing activity event: ${expected}`);
    assert(events.filter((event) => event.event_type === "deliverable.submitted").length === 2, "Expected two immutable deliverable submission events");

    response = await fetch(`${BASE}/api/admin/logout`, { method: "POST", headers: { Cookie: cookie } });
    assert(response.ok, `Logout failed with ${response.status}`);
    const clearCookie = (response.headers.get("set-cookie") || "").split(";")[0];
    response = await fetch(`${BASE}/api/admin/dashboard`, { headers: { Cookie: clearCookie || cookie } });
    assert(response.status === 401, `Expected dashboard 401 after logout, got ${response.status}`);

    console.log("\n✓ Content pipeline smoke test passed");
    console.log(`✓ Verified R2 V1, external V2, protected range streaming and ${events.length} activity events`);
  } finally {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore", shell: true });
    else server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error("\n✗ Content pipeline smoke test failed");
  console.error(error);
  process.exitCode = 1;
});
