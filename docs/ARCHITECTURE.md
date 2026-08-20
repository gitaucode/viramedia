# Vira Media Architecture

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Cloudflare Workers
- OpenNext for Cloudflare
- Cloudflare D1 for relational data
- Cloudflare cron triggers for scheduled reminders
- Resend for transactional email
- `pdf-lib` for campaign PDF report generation

## Runtime model

The Next.js application is built through OpenNext and served by a Cloudflare Worker. Static assets are served from the OpenNext assets output. D1 is bound as `VIRA_DB`.

A custom `worker.mjs` wraps the generated OpenNext worker so scheduled Cloudflare events can run deadline reminder jobs in addition to normal HTTP requests.

## Application areas

### Public website
Located under `src/app` and public routes such as `/`, `/services`, `/work`, `/creators`, `/contact` and legal pages.

### Vira Ops
Routes under `/admin` with internal components under `src/components/admin`.

Main areas:
- command centre;
- leads;
- creators;
- clients;
- campaigns;
- reporting.

### Creator Portal
Routes under `/portal` with components under `src/components/portal`.

### Client Portal
Routes under `/client` with components under `src/components/client`.

### API layer
Route Handlers under `src/app/api` provide public form endpoints and authenticated admin/client/creator operations.

### Data access
Current D1 access is primarily concentrated in:
- `src/lib/creator-db.ts`
- `src/lib/ops-db.ts`

Authentication logic is split into:
- `src/lib/admin-auth.ts`
- `src/lib/creator-auth.ts`
- `src/lib/client-auth.ts`

Transactional email lives in `src/lib/email.ts`.

## Current architectural strengths

- Small infrastructure footprint.
- D1 fits the current relational workload.
- Creator and client sessions are server-side verifiable.
- Portals are separated by route and authentication context.
- Campaign reporting and client visibility are gated rather than exposing all internal data.
- Scheduled deadline reminders are already Cloudflare-native.

## Current architectural debt

### Campaign naming
The database table used as the campaign source of truth is still named `shortlists`, inherited from the original creator-shortlisting prototype. It should eventually become `campaigns`.

Likewise, `shortlist_creators` functions as `campaign_creators`.

### Client duplication
Campaigns currently have a legacy free-text `client` column while a relational `clients` + `campaign_clients` model also exists. The relational client model should eventually become authoritative.

### Large client components
Several admin workspaces are large client-side components with UI, fetching and mutation logic together. As complexity grows, extract reusable hooks/data functions and smaller view components.

### Admin sessions
Admin login currently derives its cookie token from the admin password rather than using a random persisted session. Move admin auth toward the creator/client session model.

### Deployment coupling
The current deploy script performs remote D1 migrations before building/deploying the application. Separate migration and release steps before migrations become destructive or non-additive.

## Intended architecture direction

Keep the monolithic Next.js application for now. Do not split into microservices.

Recommended boundaries:

- `domain/campaigns` — campaign operations and policies
- `domain/creators` — creator lifecycle and assignments
- `domain/clients` — client accounts and campaign access
- `domain/deliverables` — submission/review lifecycle
- `domain/reporting` — metrics and report generation
- `domain/payments` — creator payout records when separated from deliverables
- `auth` — shared session primitives
- `notifications` — transactional email and scheduled notifications

These can remain modules inside the same application until scale requires otherwise.

## Future Cloudflare additions

### R2
Recommended for creator media uploads and generated files when direct upload support is added.

### Queues
Consider only when email/notification retries or background processing become complex enough to justify them.

## Non-goals

- No microservice split for the current scale.
- No premature event bus.
- No generic multi-tenant SaaS abstraction until Vira itself proves the operating model.
