import { spawn, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import process from "node:process";

const CONFIG = "wrangler.test.jsonc";
const STATE = ".wrangler/test-state";
const BASE = "http://127.0.0.1:8788";
const PASSWORD = "vira-test-admin-password";

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

    response = await fetch(`${BASE}/api/admin/campaign-creators`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ action: "add", campaignId: 1, creatorId: 1 }),
    });
    assert(response.ok, `Creator assignment failed with ${response.status}`);

    response = await fetch(`${BASE}/api/admin/deliverables`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ campaignId: 1, creatorId: 1, title: "Automated Test Deliverable", status: "pending", creatorFee: 25000 }),
    });
    assert(response.ok, `Deliverable creation failed with ${response.status}`);

    response = await fetch(`${BASE}/api/admin/deliverables?campaignId=1`, { headers: { Cookie: cookie } });
    assert(response.ok, `Deliverable listing failed with ${response.status}`);
    const deliverables = (await response.json()).deliverables || [];
    assert(deliverables.length === 1, `Expected 1 deliverable, got ${deliverables.length}`);
    const deliverableId = deliverables[0].id;

    response = await fetch(`${BASE}/api/admin/deliverables`, {
      method: "PATCH",
      headers: auth,
      body: JSON.stringify({ id: deliverableId, status: "in_progress" }),
    });
    assert(response.ok, `Deliverable status update failed with ${response.status}`);

    response = await fetch(`${BASE}/api/admin/deliverables`, {
      method: "PATCH",
      headers: auth,
      body: JSON.stringify({ id: deliverableId, paymentStatus: "paid" }),
    });
    assert(response.ok, `Payment update failed with ${response.status}`);

    response = await fetch(`${BASE}/api/admin/campaign-creators`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ action: "remove", campaignId: 1, creatorId: 1 }),
    });
    assert(response.ok, `Creator removal failed with ${response.status}`);

    response = await fetch(`${BASE}/api/admin/activity?campaignId=1`, { headers: { Cookie: cookie } });
    assert(response.ok, `Activity endpoint failed with ${response.status}`);
    const events = (await response.json()).events || [];
    const types = new Set(events.map((event) => event.event_type));
    for (const expected of [
      "campaign_creator.assigned",
      "deliverable.created",
      "deliverable.status_changed",
      "deliverable.payment_changed",
      "campaign_creator.removed",
    ]) assert(types.has(expected), `Missing activity event: ${expected}`);

    response = await fetch(`${BASE}/api/admin/logout`, { method: "POST", headers: { Cookie: cookie } });
    assert(response.ok, `Logout failed with ${response.status}`);

    const clearCookie = (response.headers.get("set-cookie") || "").split(";")[0];
    response = await fetch(`${BASE}/api/admin/dashboard`, { headers: { Cookie: clearCookie || cookie } });
    assert(response.status === 401, `Expected dashboard 401 after logout, got ${response.status}`);

    console.log("\n✓ Foundation smoke test passed");
    console.log(`✓ Verified ${events.length} activity events`);
  } finally {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore", shell: true });
    } else {
      server.kill("SIGTERM");
    }
  }
}

main().catch((error) => {
  console.error("\n✗ Foundation smoke test failed");
  console.error(error);
  process.exitCode = 1;
});
