# Vira Media

Vira Media is a Kenya-focused creator marketing and short-form creative agency supported by its own operating platform.

## Product surfaces

- **Vira Media website** — public brand and creator acquisition site.
- **Vira Ops** — internal operations for leads, creators, clients, campaigns, deliverables, approvals, reporting and creator payments.
- **Creator Portal** — creator access to assigned campaigns, deliverables, submissions, feedback and payment status.
- **Client Portal** — client access to linked campaigns, shared content, approvals and reporting.

## Brand architecture

- **Vira Media** — B2B agency for brands.
- **Vira Network** — vetted creator network for paid UGC and creator-led campaigns.
- **Vira Ops** — the internal operating system used to run campaigns.

## Core workflow

`Lead → Client → Campaign → Creator assignment → Deliverable → Creator submission → Internal review → Client review → Approval → Performance → Creator payment → Campaign report`

## Stack

- Next.js 16
- React 19
- TypeScript
- Cloudflare Workers
- OpenNext for Cloudflare
- Cloudflare D1
- Resend
- pdf-lib

## Public routes

- `/`
- `/services`
- `/work`
- `/creators`
- `/creators/apply`
- `/about`
- `/contact`
- `/privacy`
- `/terms`

## Application routes

- `/admin` — Vira Ops
- `/portal` — Creator Portal
- `/client` — Client Portal

## Local development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Environment

Copy `.env.example` to `.env.local` for local development and provide the required values.

Production secrets such as the admin password and Resend API key should be configured as Cloudflare secrets/environment configuration and must not be committed.

## Database and deployment

The application uses Cloudflare D1 through the `VIRA_DB` binding and deploys to Cloudflare Workers through OpenNext.

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) before changing production deployment or applying schema migrations.

## Project documentation

The maintained documentation lives in [`docs/`](./docs/README.md).

Start with:

- [Product](./docs/PRODUCT.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Workflows](./docs/WORKFLOWS.md)
- [Data model](./docs/DATA_MODEL.md)
- [API](./docs/API.md)
- [Security](./docs/SECURITY.md)
- [Deployment](./docs/DEPLOYMENT.md)
- [Roadmap](./docs/ROADMAP.md)
- [Progress tracker](./docs/PROGRESS.md)

## Current development state

Campaign Workspace V2 is being developed separately from production. Consult [docs/PROGRESS.md](./docs/PROGRESS.md) for the current release checkpoint, blockers and next actions.
