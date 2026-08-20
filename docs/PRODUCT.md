# Vira Media Product

## Vision

Vira Media is a Kenya-focused creator marketing and short-form creative agency supported by its own operating platform.

The software is not intended to become a generic creator marketplace in the near term. Its primary job is to help Vira run creator campaigns reliably from enquiry to final reporting while giving creators and clients a professional portal experience.

## Brand architecture

- **Vira Media** — the client-facing agency brand.
- **Vira Network** — the vetted creator network used for creator-led campaigns and paid UGC.
- **Vira Ops** — the internal operating system used by the agency team.

## Primary users

### Agency operator
Needs to:
- capture and qualify leads;
- review and approve creator applications;
- manage clients;
- create campaigns;
- assign creators;
- create and track deliverables;
- review creator submissions;
- share approved content with clients;
- manage feedback and approvals;
- enter performance metrics;
- track creator fees and payments;
- prepare final campaign reports.

### Creator
Needs to:
- sign in securely;
- see assigned campaigns;
- read creator-facing briefs;
- understand deliverables and deadlines;
- submit content;
- receive feedback;
- see approval status;
- see fee/payment status.

### Client
Needs to:
- sign in securely;
- see only campaigns linked to their account;
- review content intentionally shared by Vira;
- approve or request changes;
- see campaign performance;
- access campaign reporting.

## Core workflow

`Lead → Client → Campaign → Creator shortlist/assignment → Brief → Deliverable → Submission → Internal review → Client review → Approval → Publishing/performance → Payment → Report`

## Product principles

1. **Operations first.** Build features that reduce campaign coordination work.
2. **Controlled visibility.** Internal information must stay internal; clients and creators see only what is relevant to them.
3. **Manual before automated.** Automate repetitive proven workflows, not hypothetical ones.
4. **Campaign-centric design.** The campaign workspace is the main operational unit.
5. **Professional portals, not marketplaces.** Creator and client portals support real agency relationships.
6. **Low infrastructure overhead.** Prefer Cloudflare-native services where they fit.
7. **Auditability.** Important workflow changes should eventually be traceable.

## Current scope

### Public website
- Homepage
- Services
- Work/case-study concepts
- Creator network landing page
- Creator application wizard
- About
- Contact/campaign enquiry
- Privacy
- Terms

### Vira Ops
- Admin authentication
- Command centre/dashboard
- Leads
- Creator directory and review
- Clients
- Campaigns
- Creator assignment
- Deliverables
- Submission review
- Creator fees/payment tracking
- Client content sharing
- Performance reporting
- PDF report generation

### Creator Portal
- Email OTP login
- Dashboard
- Assigned campaigns
- Campaign brief and deliverables
- Submission workflow
- Feedback and status visibility

### Client Portal
- Email OTP login
- Dashboard
- Linked campaigns
- Shared content review
- Approval/changes workflow
- Performance visibility

## Explicitly deferred

Do not prioritize until the core campaign operating loop is mature:
- public creator marketplace;
- generic multi-agency SaaS tenancy;
- AI creator matching;
- complex team roles/permissions;
- platform-wide chat/messaging;
- automated M-Pesa payouts;
- deep social API integrations;
- subscription billing.

## Success criteria

Vira should be able to run a real creator campaign end-to-end without relying on scattered spreadsheets, WhatsApp threads and manual status reconstruction.
