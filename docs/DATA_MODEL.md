# Vira Media Data Model

This document describes the current Cloudflare D1 model and known cleanup work.

## Current tables

### creators
Creator application/profile record.

Important fields:
- `id`
- `status`
- `full_name`
- `email`
- `phone`
- `city`
- `tiktok`
- audience/profile fields
- `niches`
- `formats`
- `rate_range`
- `portfolio`
- `notes`

Current issue: creator email is not unique. Add a case-insensitive uniqueness strategy before scale increases.

### shortlists
This is currently the campaign table despite its legacy name.

Important fields:
- `id`
- `name`
- `client`
- `objective`
- `client_objective`
- `creator_brief`
- `budget`
- `status`
- `start_date`
- `end_date`
- `notes`
- `lead_id`
- report narrative fields

Planned cleanup: rename to `campaigns`.

### shortlist_creators
Many-to-many relationship between the current campaign table and creators.

Planned cleanup: rename to `campaign_creators`.

### leads
Brand enquiries and sales pipeline records.

Important fields:
- identity/contact fields;
- service;
- budget;
- brief;
- status;
- notes;
- timestamps.

### deliverables
Campaign work items assigned to creators.

Important fields:
- `campaign_id`
- `creator_id`
- `title`
- `due_date`
- `status`
- `instructions`
- submission fields
- internal feedback
- approval timestamps
- creator fee
- payment fields
- client approval fields
- client feedback

### clients
Structured client accounts.

Important fields:
- `company`
- `contact_name`
- `email`
- `phone`
- `status`

Client email is case-insensitive and unique.

### campaign_clients
Many-to-many relationship between campaigns and client accounts.

A campaign can be visible to one or more linked client contacts.

### creator_login_codes / client_login_codes
Stores hashed one-time login codes, expiry and failed-attempt counts.

### creator_sessions / client_sessions
Stores hashed session tokens and expiry timestamps.

### admin_login_attempts
Tracks admin login rate limiting by IP.

### creator_notification_log
Deduplicates selected creator notifications such as deadline reminders.

### performance_metrics
One mutable metric row per deliverable.

Fields include:
- views
- reach
- impressions
- likes
- comments
- shares
- saves
- clicks
- conversions
- spend

## Current relationships

```text
leads
  └── shortlists (campaigns)
        ├── shortlist_creators ── creators
        ├── deliverables ──────── creators
        │     └── performance_metrics
        └── campaign_clients ──── clients

creators
  ├── creator_login_codes
  ├── creator_sessions
  └── creator_notification_log

clients
  ├── client_login_codes
  └── client_sessions
```

## Planned schema improvements

### P0 cleanup
1. Rename `shortlists` to `campaigns`.
2. Rename `shortlist_creators` to `campaign_creators`.
3. Make creator email unique/case-insensitive.
4. Make relational `clients` the campaign client source of truth and retire legacy free-text duplication where safe.

### Submission history
Add `deliverable_submissions`:
- `id`
- `deliverable_id`
- `version`
- `submission_url` or storage key
- `submission_note`
- `submitted_at`
- `review_status`
- `feedback`
- `reviewed_at`

### Activity/audit log
Add `activity_events` or `audit_log`:
- actor type/id
- event type
- entity type/id
- campaign id where relevant
- metadata JSON
- created timestamp

### Metric history
Add `metric_snapshots`:
- `deliverable_id`
- metric values
- `captured_at`

Keep a latest/current aggregate if useful for fast dashboard reads.

### Payouts
Add `payouts` and a settlement relationship so a single creator payment can cover multiple deliverables.

Potential fields:
- creator id
- amount
- method
- reference
- status
- paid at
- notes

## Data rules

- Client portal queries must always scope by `campaign_clients`.
- Creator portal queries must always scope by creator assignment/deliverable ownership.
- Internal notes must never be included in client or creator responses unless deliberately transformed into public-facing fields.
- Client approval state and internal approval state remain separate.
- Financial margin/internal commercial data should remain admin-only.
