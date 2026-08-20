# Vira Media Security

## Security goals

The highest-risk failures for Vira are authorization mistakes, session weaknesses, data leakage between clients/creators, and unsafe production changes.

## Authentication

### Admin
Current model:
- single admin password stored as environment secret;
- successful login sets an HTTP-only cookie;
- cookie token is deterministically derived from the admin password;
- failed logins are rate-limited by IP in D1.

Current protection:
- HTTP-only cookie;
- secure cookie in production;
- SameSite strict;
- 12-hour lifetime;
- IP attempt throttling.

Priority improvement:
- replace deterministic token derivation with random server-side admin sessions;
- support explicit session revocation;
- consider multiple admin users only when operationally required.

### Creator
Current model:
- approved creators request a six-digit emailed code;
- code is hashed before storage;
- code expires after 10 minutes;
- max failed attempts are enforced;
- random session token is sent to browser;
- only token hash is stored in D1;
- session expires after seven days.

### Client
Client authentication mirrors creator authentication and is limited to active client accounts.

## Authorization rules

### Admin
Admin routes require `isAdminAuthenticated()` or equivalent server-side authorization.

### Creator
Every creator data operation must derive creator identity from the authenticated session, not from a caller-supplied creator ID alone.

A creator may only access:
- campaigns they are assigned to;
- deliverables assigned to them or explicitly visible within their assigned campaign context;
- creator-facing briefs/instructions;
- their own fee/payment status where intended.

### Client
Every client data operation must derive client identity from the authenticated session and prove campaign linkage using `campaign_clients`.

A client may only access:
- campaigns linked to that client account;
- content intentionally shared with the client;
- client-facing performance/reporting data.

A client must never receive:
- internal notes;
- internal creator feedback not meant for the client;
- other clients' campaign data;
- creator negotiation details beyond explicitly client-visible information;
- internal agency margin/profit information.

## Input/output safety

- Continue parameterized D1 queries.
- Sanitize/limit public form strings before storage and email rendering.
- Escape user-generated values inserted into HTML email.
- Validate status values against allowlists.
- Validate IDs as positive integers.
- Validate external URLs before future direct-download/proxy features.

## Email OTP protections

Current good practices:
- unknown creator/client email does not reveal account existence during code request;
- login codes expire quickly;
- failed attempts are counted;
- request frequency is throttled;
- successful verification deletes the login code.

Recommended improvements:
- add IP-level OTP request throttling;
- add global/email-level daily ceilings to prevent email abuse;
- log suspicious authentication activity without storing plaintext codes/tokens.

## Session handling

- Cookies should remain HTTP-only.
- Production cookies should remain secure.
- Logout should delete the persisted hashed session where applicable.
- Expired sessions should be periodically pruned.
- Sensitive session/token material must never appear in logs.

## Data protection priorities

Vira stores creator contact details and professional profile information. Treat these records as private operational data.

Recommended controls:
- minimize public exposure of creator data;
- document retention/deletion procedures;
- keep production database access limited;
- review privacy/terms language against actual production behavior;
- never commit production secrets.

## Production safeguards

1. Keep `VIRA_ADMIN_PASSWORD`, `RESEND_API_KEY` and sender configuration as secrets/env configuration.
2. Never hardcode production credentials into the repo.
3. Keep admin, portal and client pages excluded from search indexing.
4. Add automated authorization tests before introducing multiple agency users.
5. Separate database migration and application deployment before non-additive schema changes.

## Security test cases to automate

- unauthenticated admin route returns 401;
- invalid admin attempts are throttled;
- inactive client cannot log in;
- unapproved creator cannot log in;
- Client A cannot access Client B campaign IDs;
- Creator A cannot access Creator B deliverables;
- client cannot see internally unshared content;
- client cannot see internal notes;
- creator cannot change payment status;
- malformed/unsupported statuses are rejected;
- expired OTP/session is rejected.

## Incident response baseline

If an access-control issue is discovered:
1. disable affected feature/route if necessary;
2. rotate relevant secrets/session material;
3. identify affected entities and time window;
4. patch authorization server-side;
5. invalidate exposed sessions if appropriate;
6. document the incident and add a regression test.
