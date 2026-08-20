# Vira Media Roadmap

## Roadmap principle

Prioritize the complete campaign operating loop before adding marketplace or generic SaaS features.

## P0 — Foundation and reliability

Goal: make the current product safe to evolve.

### Schema cleanup
- [ ] Rename `shortlists` to `campaigns`.
- [ ] Rename `shortlist_creators` to `campaign_creators`.
- [ ] Add case-insensitive uniqueness for creator email.
- [ ] Reduce legacy free-text client duplication and make relational clients authoritative.

### Authentication/security
- [ ] Replace deterministic admin cookie token with random persisted admin sessions.
- [ ] Add reusable authorization tests.
- [ ] Add stronger OTP request throttling.

### Engineering workflow
- [ ] Add GitHub Actions CI.
- [ ] Add automated tests.
- [ ] Separate D1 migration and app deployment scripts.
- [ ] Keep documentation current.

## P1 — Campaign Workspace V2

Goal: make each campaign the main operating workspace.

Planned/implemented workspace areas:
- [x] Overview
- [x] Creators
- [x] Deliverables
- [x] Client Review
- [x] Performance
- [x] Finance
- [x] Report
- [x] Activity

Release requirements:
- [ ] typecheck passes;
- [ ] lint passes;
- [ ] production build passes;
- [ ] merge into `main`;
- [ ] deploy;
- [ ] smoke-test all existing admin/portal flows.

## P2 — Submission workflow V2

Goal: make creator content review professional and traceable.

- [ ] Add Cloudflare R2 media storage.
- [ ] Add direct creator upload flow.
- [ ] Add versioned `deliverable_submissions`.
- [ ] Preserve revision history.
- [ ] Support structured feedback per submission version.
- [ ] Show V1/V2/V3 status history to admin and creator.
- [ ] Add file validation and upload limits.

## P3 — Operational automation

Goal: reduce manual coordination.

Already present:
- [x] creator campaign assignment email;
- [x] deliverable assignment email;
- [x] internal approval/change-request email;
- [x] client content-ready notification;
- [x] daily creator deadline reminder cron.

Next:
- [ ] payment status notification;
- [ ] campaign start notification;
- [ ] overdue reminder rules;
- [ ] notification retry/logging strategy;
- [ ] optional weekly internal operations digest;
- [ ] audit/activity event model.

## P4 — Reporting and finance

Goal: make results and campaign economics useful to Vira and clients.

### Reporting
- [ ] Add metric snapshots over time.
- [ ] Add performance charts/trends.
- [ ] Add engagement-rate and cost-efficiency calculations.
- [ ] Improve report export/PDF presentation.
- [ ] Add campaign comparison/history where useful.

### Finance
- [ ] Introduce payout records.
- [ ] Allow one payout to settle multiple deliverables.
- [ ] Add outstanding creator balance view.
- [ ] Add campaign creator-cost totals.
- [ ] Add internal campaign margin fields only if required operationally.

## P5 — Public proof and acquisition

Goal: make the agency website reflect real operating capability.

- [ ] Replace representative work concepts with verified case studies.
- [ ] Add measurable campaign results to case studies.
- [ ] Improve conversion paths from site to campaign brief.
- [ ] Improve creator recruitment funnel based on real creator-network needs.

## Deferred until justified

- public creator marketplace;
- brand self-service creator browsing;
- generic multi-agency tenancy;
- complex RBAC/team management;
- AI creator matching/recommendations;
- automated creator payouts;
- native messaging/chat;
- deep TikTok/Instagram/YouTube API integrations;
- subscriptions/billing as SaaS.

## Decision rule for new ideas

Before building a new feature, ask:

1. Does this help Vira win a campaign, run a campaign, pay creators, or prove campaign performance?
2. Does it reduce a repeated manual task?
3. Does it improve client or creator trust?
4. Can the current workflow handle the need without added complexity?

If the answer to the first three is mostly no, defer it.
