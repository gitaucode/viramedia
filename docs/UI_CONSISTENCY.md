# Vira UI Consistency Suite

The authenticated Vira app must not rely on manual browsing to discover visual inconsistencies.

## What the gate covers

The Playwright matrix exercises these authenticated surfaces:

- Admin Overview
- Leads
- Campaigns
- Campaign Workspace
- Publishing
- Reporting
- Clients
- Creators
- Client login, dashboard and campaign
- Creator Portal login, dashboard and campaign

Every route is checked in explicit Light and Dark themes on desktop and mobile projects. The current matrix produces 56 route/theme/viewport checks and screenshot artifacts per CI run.

## Automatic contract checks

Each route must:

1. Render one of the shared `.admin-shell`, `.client-shell` or `.portal-shell` workspace roots.
2. Restore the requested `vira-workspace-theme` value before/while the route loads.
3. Use the canonical workspace background for the selected theme.
4. Avoid document-level horizontal overflow.
5. Avoid known legacy neutral colors from the opposite theme on visible elements.
6. Use shared Admin navigation and expose the shared appearance control on Admin routes.
7. Preserve specific regression contracts for previously discovered bugs, such as the Creator Directory secondary action not falling back to browser-default underlined link styling.

Screenshots are uploaded as CI artifacts for every successful or failed matrix run. They are diagnostic artifacts rather than committed pixel baselines, so the contract gate remains stable across font-rendering/OS differences while still giving reviewers a visual record.

## CSS change gate

`scripts/workspace-css-lint.mjs` inspects CSS lines added by the current change. New authenticated workspace CSS must use the shared `--app-*` variables for neutral colors instead of reintroducing legacy literals such as `#111`, `#fff`, `#292929`, and related dark/light neutrals.

Semantic brand and status colors remain allowed.

Legacy CSS is not mass-rewritten by this check. The rule is forward-looking: existing debt can be migrated deliberately, but new changes cannot add more neutral-color debt.

## Commands

```sh
npm run ui:css
npm run ui:test
npm run ui:consistency
```

`ui:test` resets and prepares an isolated local D1 state under `.wrangler/ui-test-state`; it does not use production D1, R2, sessions or email delivery.

## CI release gate

The `ui-consistency` job installs Playwright Chromium, runs the CSS gate, prepares disposable test data, executes the authenticated route/theme matrix and uploads `test-results/` plus `playwright-report/` for inspection.

A failing UI consistency job should block release until the regression is understood. Intentional design changes should update the contract only when the design-system behavior itself changes, not merely to silence a failing route.
