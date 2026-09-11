# Vira Media

Vira Media is a Kenya-focused creator marketing agency with an internal operating system for running creator campaigns from lead intake through creator management, content review, client approval, reporting and payment tracking.

## Product architecture

- **Public Vira**: agency website for brands and creator applications.
- **Vira Ops**: internal agency workspace for leads, creators, campaigns, deliverables, review, reporting and finance.
- **Creator Portal**: creator-facing workspace for assignments, briefs, submissions, feedback and payment visibility.
- **Client Portal**: client-facing workspace for campaign visibility, content review, approvals and reporting.

The product direction and implementation roadmap are documented in:

- `docs/PRODUCT.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/DESIGN_SYSTEM.md`

## Core operating loop

Lead → Client → Campaign → Creator selection → Assignment → Brief → Content submission → Internal review → Client review → Approval → Publishing → Performance → Creator payment → Campaign report.

The current product implements substantial parts of this loop. The active development priority is the **Core Operating Loop Big Build**, which completes the foundation, versioned media submissions, publishing, automation, commercial tracking and action-oriented Command Centre.

## Stack

- Next.js 16 / React 19
- Cloudflare Workers via OpenNext
- Cloudflare D1
- Resend email
- Cloudflare cron/scheduled Worker
- Cloudflare R2 planned for versioned campaign media uploads

## Main routes

### Public

- `/`
- `/services`
- `/work`
- `/creators`
- `/creators/apply`
- `/about`
- `/contact`
- `/privacy`
- `/terms`

### Vira Ops

- `/admin`
- `/admin/leads`
- `/admin/campaigns`
- `/admin/campaigns/[id]`
- `/admin/reporting`
- `/admin/clients`
- `/admin/creators`

### Creator Portal

- `/portal/login`
- `/portal/dashboard`
- `/portal/campaigns/[id]`

### Client Portal

- `/client/login`
- `/client/dashboard`
- `/client/campaigns/[id]`

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Database

The application uses Cloudflare D1 with migrations in `migrations/`.

Apply locally with Wrangler when local schema setup is required. Production migrations should only be applied as part of an explicitly reviewed deployment/migration step.

## Email and authentication

Resend is used for transactional email. Creator and client portals use email-based access codes and server-side sessions. Vira Ops currently uses an admin password session mechanism, scheduled for replacement with random revocable admin sessions during the Core Operating Loop foundation work.

Environment values are documented in `.env.example`.

## Deployment

Production is deployed through Cloudflare's Git integration from the `main` branch. Merging to `main` triggers the Cloudflare build/deployment workflow.

The repository also contains local/manual deployment scripts, but normal production deployment should use the established Git integration unless intentionally changing the deployment process.

## Development principles

- Keep the campaign as the central operating object.
- Preserve submission/review history rather than overwriting it.
- Keep client visibility controlled by Vira.
- Keep finance operational and campaign-specific rather than building full accounting software.
- Favor action-oriented dashboards over vanity metrics.
- Follow `docs/DESIGN_SYSTEM.md` for all workspace UI changes.
- Update `docs/IMPLEMENTATION_PLAN.md` as milestones are completed or changed.
