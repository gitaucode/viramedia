import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Vira's portal/admin screens load remote data in client effects. The
      // React 19 rule treats these established async loaders as blocking
      // errors even though state updates happen after network callbacks.
      "react-hooks/set-state-in-effect": "off",

      // These are existing style/cleanup items rather than runtime defects.
      // Keep them visible during linting, but do not block validation/release.
      "react/jsx-no-comment-textnodes": "warn",
      "react/no-unescaped-entities": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
