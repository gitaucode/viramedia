# Vira Media Project Documentation

This directory is the working source of truth for Vira Media's product and engineering documentation.

## Documents

- [PRODUCT.md](./PRODUCT.md) — product vision, users, scope and principles
- [ARCHITECTURE.md](./ARCHITECTURE.md) — application architecture and technical boundaries
- [WORKFLOWS.md](./WORKFLOWS.md) — operational workflows from lead to final campaign report
- [DATA_MODEL.md](./DATA_MODEL.md) — current D1 schema and planned cleanup
- [API.md](./API.md) — API surface and access rules
- [SECURITY.md](./SECURITY.md) — authentication, authorization and security priorities
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Cloudflare deployment model and release process
- [ROADMAP.md](./ROADMAP.md) — prioritized product roadmap
- [PROGRESS.md](./PROGRESS.md) — living build and release tracker

## Product surfaces

Vira currently has three connected surfaces:

1. **Vira Ops** — internal agency operations for leads, creators, clients, campaigns, deliverables, reporting and payments.
2. **Creator Portal** — creator access to campaign briefs, deliverables, submissions, feedback and payment status.
3. **Client Portal** — client access to campaign progress, shared content, approvals and reporting.

## Core product spine

`Lead → Client → Campaign → Creator assignment → Deliverable → Creator submission → Internal review → Client review → Approval → Performance → Creator payment → Campaign report`

## Documentation rule

Update `PROGRESS.md` whenever meaningful product work is completed, merged, deployed, blocked or deferred. Update the relevant technical document whenever a schema, API, authentication or deployment assumption changes.
