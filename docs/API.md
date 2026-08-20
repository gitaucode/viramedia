# Vira Media API

This is a practical map of the current API surface. It is not a generated OpenAPI specification.

## Access levels

- **Public** — no authenticated session required.
- **Admin** — requires valid Vira Ops admin session.
- **Creator** — requires valid creator session.
- **Client** — requires valid client session.

## Public endpoints

### `POST /api/contact`
Receives brand/campaign enquiries.

Expected responsibilities:
- validate/sanitize input;
- save lead where D1 is configured;
- send enquiry email through Resend.

### `POST /api/creator-application`
Receives creator applications.

Expected responsibilities:
- validate/sanitize application data;
- save creator application to D1;
- send notification email.

## Admin authentication

### `POST /api/admin/login`
Authenticates the admin password and sets the admin cookie.

Protection:
- IP-based failed-attempt tracking;
- maximum attempts within a time window;
- production cookie is HTTP-only and secure.

### `/api/admin/logout`
Clears admin authentication.

## Admin operations

### `/api/admin/dashboard`
Returns command-centre statistics and operational summaries.

### `/api/admin/leads`
Lists and updates leads.

### `/api/admin/creators`
Lists/reviews creator records and status.

### `/api/admin/clients`
Responsibilities:
- list all clients;
- list clients linked to one campaign;
- create clients;
- update clients;
- link/unlink clients to campaigns;
- send portal access notifications when linked.

### `/api/admin/campaigns`
Responsibilities:
- list campaigns;
- create campaigns;
- update campaign fields/status.

Current implementation still uses the legacy `shortlists` table underneath.

### `/api/admin/campaign-creators`
Responsibilities:
- list creators assigned to campaign;
- assign approved creator;
- remove creator;
- send assignment notification on new assignment.

### `/api/admin/deliverables`
Responsibilities:
- list deliverables globally or by campaign;
- create deliverables;
- validate campaign creator assignment;
- update status, feedback, fee and payment fields;
- notify creator when changes are requested or content is internally approved.

### `/api/admin/reporting`
Responsibilities:
- fetch campaign report data and performance metrics;
- save report narrative;
- update performance metrics;
- control whether internally approved content is shared with clients;
- notify linked clients when content becomes ready for review.

## Creator portal API

Routes under `/api/portal` support creator authentication and creator-scoped campaign actions.

Rules:
- only approved creators may authenticate;
- creator queries must be scoped to the authenticated creator;
- creators may only see campaigns/deliverables assigned to them;
- internal notes and client-only information must not leak into responses.

Authentication uses emailed one-time codes and persisted hashed sessions.

## Client portal API

Routes under `/api/client` support client authentication and client-scoped campaign/review operations.

Rules:
- only active client accounts may authenticate;
- campaign access must be proven through `campaign_clients`;
- client dashboard/report metrics should include only content deliberately shared/eligible for client visibility;
- internal agency notes, creator negotiations and margin data remain hidden.

## Response conventions

Current routes generally return JSON with patterns such as:

```json
{ "ok": true }
```

or:

```json
{ "error": "Human-readable message" }
```

Common statuses:
- `400` invalid request;
- `401` unauthenticated;
- `404` entity not found;
- `429` rate-limited;
- `503` database/configuration unavailable.

## API priorities

1. Keep authorization checks server-side on every protected route.
2. Add shared validation/schema helpers as the request surface grows.
3. Reduce duplicate inline SQL by moving campaign/domain operations into dedicated data/domain modules.
4. Add integration tests for cross-client and cross-creator isolation.
5. Document new endpoints here whenever product work adds them.
