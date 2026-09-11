# Vira Product

## Product definition

Vira is the operating system for running a creator-marketing agency.

It is not a generic CRM, not a creator marketplace, and not accounting software. The product should help Vira run the work that happens after a brand enquiry becomes a real creator campaign.

## Core operating loop

Lead → Client → Campaign → Creator selection → Assignment → Brief → Content submission → Internal review → Client review → Approval → Publishing → Performance → Creator payment → Campaign report.

The product is successful when a real campaign can move through this loop without relying on WhatsApp, email threads, spreadsheets, or Drive as the system of record.

## Product surfaces

### Vira Ops
Internal agency workspace for leads, creators, campaigns, reviews, publishing, reporting and finance.

### Creator Portal
Creator-facing workspace for assignments, briefs, deadlines, submissions, revision feedback and payment visibility.

### Client Portal
Client-facing workspace for campaign visibility, content review, approvals and reporting.

### Public Vira
Marketing website for brand enquiries and creator applications.

## Primary users

### Agency operator
Needs to know what requires attention, which campaigns are at risk, which creators are waiting, what clients need to review, and what money is outstanding.

### Creator
Needs a clear brief, due dates, upload workflow, revision history, approval status and payment visibility.

### Client
Needs controlled visibility into approved campaign content, review actions, published work and campaign results.

## Product principles

1. The campaign is the central operating object.
2. Every important workflow transition should be recorded as an event.
3. Content versions must never overwrite prior submissions.
4. Client visibility is controlled by Vira.
5. Finance stays campaign-specific and operational, not general accounting.
6. Automation follows workflow events rather than adding unrelated notifications.
7. Dashboards should prioritize actions over vanity counts.
8. Public Vira can be expressive; Vira Workspace should stay calm and operational.

## Core domain model

Target model:

- campaigns
- campaign_creators
- campaign_clients
- deliverables
- submission_versions
- review_events
- publications
- performance_metrics
- campaign_costs
- creator_payments
- client_payments
- activity_events
- notification_log
- admin_sessions

### Campaign creator states

- shortlisted
- invited
- accepted
- assigned
- declined
- removed

### Deliverable workflow

- pending
- in_progress
- submitted
- changes_requested
- approved
- ready_to_publish
- published
- done

### Client review states

- not_ready
- awaiting_client
- approved
- changes_requested

## Product boundaries

The Core Operating Loop build does not include:

- public creator marketplace
- creator bidding
- client self-service campaign creation
- AI creator matching
- social platform API integrations
- automatic TikTok/Instagram analytics
- WhatsApp automation
- native mobile apps
- multi-agency SaaS
- full accounting/general ledger
- complex CRM automation

## Definition of a complete core product

The core product is operationally complete when this can happen entirely inside Vira:

1. A lead becomes a campaign.
2. Creators are shortlisted and assigned.
3. A creator receives the brief.
4. The creator uploads Version 1.
5. Vira requests changes.
6. The creator uploads Version 2.
7. Vira approves the content.
8. The client approves the content.
9. The content is recorded as published.
10. Performance is recorded against the publication.
11. Creator payment is recorded.
12. Client campaign value and payment status are visible.
13. A client report is generated.
14. Every important transition appears in Activity.
