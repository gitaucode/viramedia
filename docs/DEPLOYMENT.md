# Vira Media Deployment

## Production platform

Vira runs on Cloudflare Workers through OpenNext.

Key production resources:
- Worker: `viramedia`
- D1 binding: `VIRA_DB`
- D1 database: `vira-creators`
- Static assets: `.open-next/assets`
- Scheduled trigger: daily cron for creator deadline reminders
- Observability: enabled in Wrangler configuration

## Important environment values

Public/config values may include:
- `VIRA_SITE_URL`
- `NEXT_PUBLIC_VIRA_WHATSAPP`
- `NEXT_PUBLIC_VIRA_PHONE`
- `NEXT_PUBLIC_VIRA_EMAIL`

Secrets/private values include:
- `VIRA_ADMIN_PASSWORD`
- `RESEND_API_KEY`
- `VIRA_FROM_EMAIL` where treated as environment configuration
- inbox/sender configuration as appropriate

Never commit production secret values.

## Current scripts

The project currently exposes:

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run preview
npm run db:migrate
npm run deploy
```

The current `deploy` script applies remote migrations before building/deploying.

## Recommended release process now

Until CI is added, use:

```bash
npm run typecheck
npm run lint
npm run build
```

Then, where migrations are required:

```bash
npm run db:migrate
```

Then deploy.

## Required improvement

Separate database migration from deployment permanently.

Reason: if a migration succeeds but the application build or deploy fails, the old app may continue running against a newer schema.

Preferred future release model:

1. CI validates branch.
2. Review migration compatibility.
3. Apply migration deliberately.
4. Deploy application.
5. Run smoke checks.
6. Mark release complete in `PROGRESS.md`.

## CI target

Add GitHub Actions that runs on pull requests and pushes to protected branches:

```text
install
  ↓
typecheck
  ↓
lint
  ↓
tests
  ↓
build
```

Do not automatically run production D1 migrations from ordinary PR CI.

## Smoke checks after deployment

### Public
- homepage loads;
- contact form works;
- creator application works.

### Admin
- `/admin` login works;
- dashboard loads;
- leads load;
- creators load;
- clients load;
- campaigns load;
- campaign workspace opens.

### Creator portal
- approved creator can request OTP;
- creator dashboard loads;
- assigned campaign is visible;
- deliverable submission works.

### Client portal
- active linked client can request OTP;
- client sees linked campaign only;
- shared content is visible;
- approval action works.

### Reporting
- metrics load;
- client visibility gate is respected;
- PDF report generation works.

## Rollback principles

- Prefer backwards-compatible migrations.
- Never assume application rollback can reverse a destructive schema migration.
- Back up/export important production data before risky migrations.
- Keep schema changes small and reviewable.

## Current release state

The live deployment currently follows `main`.

Campaign Workspace V2 has been built on `feature/campaign-workspace-v2` but should not merge to `main` until typecheck, lint and build have been run successfully or equivalent CI exists.
