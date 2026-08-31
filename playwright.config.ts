import { defineConfig,devices } from "@playwright/test";

const baseURL="http://127.0.0.1:8788";

export default defineConfig({
  testDir:"./tests/ui",
  outputDir:"test-results/ui",
  timeout:45_000,
  expect:{timeout:15_000},
  retries:process.env.CI?1:0,
  workers:1,
  reporter:process.env.CI?[["list"],["html",{outputFolder:"playwright-report",open:"never"}]]:[["list"]],
  use:{baseURL,trace:"retain-on-failure",screenshot:"only-on-failure"},
  projects:[
    {name:"desktop",use:{...devices["Desktop Chrome"],viewport:{width:1440,height:1000}}},
    {name:"mobile",use:{...devices["Pixel 7"]}},
  ],
  webServer:{
    command:"npm run dev -- --webpack --hostname 127.0.0.1 --port 8788",
    url:`${baseURL}/admin`,
    reuseExistingServer:!process.env.CI,
    timeout:120_000,
    env:{
      VIRA_ADMIN_PASSWORD:"vira-test-admin-password",
      VIRA_TEST_WRANGLER_CONFIG:"wrangler.test.jsonc",
      VIRA_TEST_D1_STATE:".wrangler/ui-test-state",
      NEXT_TELEMETRY_DISABLED:"1",
    },
  },
});
