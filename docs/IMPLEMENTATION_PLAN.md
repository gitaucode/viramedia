# Vira Implementation Plan

Status: Active development plan

## Current priority

P0: Finish workspace theme audit
P1: Core Operating Loop Big Build
P2: Real-world campaign testing
P3: UX and workflow optimization
P4: Advanced integrations
P5: Growth and marketplace features

---

# P1 Core Operating Loop Big Build

Goal: Run a real creator campaign from assignment through payment and client reporting without leaving Vira.

## PR 1: Foundation repair

### Data model
- [ ] Replace campaign semantics currently stored in `shortlists` with a canonical `campaigns` model.
- [ ] Replace `shortlist_creators` campaign usage with `campaign_creators`.
- [ ] Preserve/migrate existing production campaign records safely.
- [ ] Add campaign creator states: shortlisted, invited, accepted, assigned, declined, removed.
- [ ] Establish one canonical campaign-client relation.
- [ ] Add unique creator email protection after checking production duplicates.
- [ ] Add indexes and constraints required by the new workflow.

### Security
- [ ] Replace deterministic admin cookie with random revocable admin sessions.
- [ ] Add expiry/cleanup for admin sessions.
- [ ] Preserve existing creator/client OTP session security.

### Activity
- [ ] Add `activity_events` table.
- [ ] Record campaign creation and updates.
- [ ] Record creator assignment/removal.
- [ ] Record submission/review events.
- [ ] Record publication, metrics and payment events.

### Engineering
- [ ] Add test runner.
- [ ] Add critical API/database tests.
- [ ] Update README and architecture/product documentation.
- [ ] Remove or deprecate legacy shortlist API only after migration is complete.

Exit criteria:
- Existing production campaigns still load correctly.
- New campaigns use the canonical model.
- Activity is event-backed rather than reconstructed only from timestamps.
- Admin sessions are revocable.

## PR 2: Content pipeline and R2

- [ ] Add Cloudflare R2 binding for campaign media.
- [ ] Add `submission_versions` model.
- [ ] Implement secure direct upload flow.
- [ ] Store media metadata, creator note and submission timestamp.
- [ ] Preserve every submission version.
- [ ] Add media preview/download access rules.
- [ ] Keep external URL submission as an optional fallback where useful.

Exit criteria:
- Creator can upload actual campaign media.
- V1/V2/V3 remain independently accessible.

## PR 3: Review workflow

- [ ] Add `review_events` model.
- [ ] Internal approve/request-changes workflow.
- [ ] Client approve/request-changes workflow.
- [ ] Structured feedback tied to a submission version.
- [ ] Enforce valid state transitions.
- [ ] Surface full revision history to Ops and appropriate history to Creator/Client.

Exit criteria:
- Vira and client decisions are tied to specific content versions.

## PR 4: Publishing

- [ ] Add `publications` model.
- [ ] Add Publishing tab to Campaign Workspace.
- [ ] Record platform, account, URL, publish date and publication type.
- [ ] Support one deliverable being published to multiple platforms.
- [ ] Move performance metrics toward publication-level attribution.

Exit criteria:
- Approved content can progress formally to published content.

## PR 5: Workflow automation

Events to support:
- [ ] Creator assigned.
- [ ] Deadline approaching.
- [ ] Creator submitted.
- [ ] Changes requested.
- [ ] Internal approval.
- [ ] Client review requested.
- [ ] Client approval/changes requested.
- [ ] Creator payment recorded.

Implementation:
- [ ] Central notification service.
- [ ] Idempotent notification log.
- [ ] Email first via Resend.
- [ ] Scheduled reminder cleanup/extension.

Exit criteria:
- Key users are notified at the right workflow transitions without duplicate emails.

## PR 6: Commercial and finance

Campaign-level:
- [ ] Client campaign value.
- [ ] Production costs.
- [ ] Media spend.
- [ ] Transport/other campaign costs.
- [ ] Total costs.
- [ ] Gross margin and margin percentage.

Client payment:
- [ ] Not invoiced / invoiced / part paid / paid.
- [ ] Amount invoiced.
- [ ] Amount received.
- [ ] Outstanding balance.

Creator payment:
- [ ] Preserve per-creator/per-deliverable payment tracking.
- [ ] Improve outstanding-payment queue.

Exit criteria:
- Campaign Workspace shows true commercial position without becoming accounting software.

## PR 7: Command Centre V2

Replace KPI-first dashboard emphasis with an action queue.

Examples:
- content waiting for internal review
- client approval overdue
- campaign starting soon
- creator deadline approaching
- creator payments outstanding
- client balance outstanding

Also retain secondary summaries:
- active campaigns
- recent leads
- creator pipeline
- upcoming deadlines

Exit criteria:
- The Overview page answers "what requires my attention now?"

## PR 8: End-to-end stabilization

- [ ] End-to-end test of the full operating loop.
- [ ] Responsive UI audit.
- [ ] Light/dark/system theme audit.
- [ ] Accessibility pass.
- [ ] Remove obsolete CSS/API paths after verifying migration.
- [ ] Update all product and technical docs.
- [ ] Validate Cloudflare deployment and migrations.

Full exit scenario:
Lead → Campaign → Creator assignment → Brief → V1 upload → Changes requested → V2 upload → Internal approval → Client approval → Publication → Performance → Creator payment → Client report.

---

# P2 Real-world campaign testing

Use Vira on real agency work and log friction rather than adding speculative features.

- [ ] Run at least one complete campaign through Vira.
- [ ] Capture steps that still require WhatsApp/email/spreadsheets.
- [ ] Record time-consuming manual tasks.
- [ ] Fix workflow blockers before advanced features.

# P3 UX and workflow optimization

- shared component migration
- faster creator selection
- bulk operations where real usage proves they are needed
- better mobile/tablet workflows
- improved empty/error/loading states

# P4 Advanced integrations

Only after the core loop is stable:
- selected social platform integrations
- automated performance collection
- enhanced exports/reporting
- optional WhatsApp/SMS notifications

# P5 Growth and marketplace features

Only after internal agency operations are proven:
- creator discovery expansion
- AI-assisted matching
- client self-service where valuable
- multi-agency/multi-tenant product exploration

## Development rules

1. One coherent PR per workstream/checkpoint.
2. No production data migration without a migration plan and validation step.
3. Every PR must pass typecheck, lint and production build.
4. Critical workflow PRs require targeted tests.
5. New workspace UI follows `docs/DESIGN_SYSTEM.md`.
6. Update this file when scope or completion changes.
7. Do not add advanced features while a critical Core Operating Loop item remains unfinished unless it fixes an active production blocker.
