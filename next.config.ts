import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;

const testConfig = process.env.VIRA_TEST_WRANGLER_CONFIG;
const testState = process.env.VIRA_TEST_D1_STATE;

initOpenNextCloudflareForDev(
  testConfig
    ? {
        configPath: testConfig,
        persist: testState ? { path: `${testState.replace(/[\\/]+$/, "")}/v3` } : false,
        remoteBindings: false,
      }
    : undefined,
);
