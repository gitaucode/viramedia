# Vira UI Consistency Suite

The authenticated Vira app must not rely on manual browsing to discover visual inconsistencies.

## What the gate covers

The Playwright matrix exercises these authenticated surfaces:

- Admin Overview
- Leads
- Campaigns
- Campaign Workspace
- Publishing
- Opportunities & Applications
- Reporting
- Clients
- Creators
- Client login, dashboard and campaign
- Creator Portal login, dashboard, opportunities and campaign

Every route is checked in explicit Light and Dark themes on desktop and mobile projects. The current matrix produces 64 route/theme/viewport checks and screenshot artifacts per run.

## Automatic contract checks

Each route must:

1. Render one of the shared `.admin-shell`, `.client-shell` or `.portal-shell` workspace roots.
2. Restore the requested `vira-workspace-theme` value before/while the route loads.
3. Use the canonical workspace background for the selected theme.
4. Avoid document-level horizontal overflow.
5. Avoid known legacy neutral colors from the opposite theme on visible elements.
6. Use shared Admin navigation and expose the shared appearance control on Admin routes.
7. Preserve specific regression contracts for previously discovered bugs, such as the Creator Directory secondary action not falling back to browser-default underlined link styling.

Screenshots are saved locally under `test-results/` and `playwright-report/`. They are diagnostic artifacts rather than committed pixel baselines, so the contract gate remains stable across font-rendering/OS differences while still providing a visual record.

## CSS change gate

`scripts/workspace-css-lint.mjs` inspects CSS lines added by the current change. New authenticated workspace CSS must use the shared `--app-*` variables for neutral colors instead of reintroducing legacy literals such as `#111`, `#fff`, `#292929`, and related dark/light neutrals.

Semantic brand and status colors remain allowed.

Legacy CSS is not mass-rewritten by this check. The rule is forward-looking: existing debt can be migrated deliberately, but new changes cannot add more neutral-color debt.

## Local commands

Install Chromium once on a development machine:

```sh
npm run ui:install
```

Run only the UI consistency suite:

```sh
npm run ui:consistency
```

Run the complete pre-release gate:

```sh
npm run release:check
```

`release:check` runs the existing smoke tests, including the creator opportunity matching/application/shortlist flow, typecheck, lint, production build, CSS consistency gate and the full authenticated Playwright matrix.

`ui:test` resets and prepares an isolated local D1 state under `.wrangler/ui-test-state`; it does not use production D1, R2, sessions or email delivery.

## No GitHub Actions dependency

Vira intentionally does not use GitHub-hosted Actions runners. Release validation runs locally, so no paid GitHub Actions usage is required.

The UI suite and release checks remain part of the repository and are run locally before a release. Cloudflare deployment from `main` remains independent of GitHub Actions.
