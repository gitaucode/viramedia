# Controlled Release Plan: Core Operating Loop

Status: PREPARED, NOT EXECUTED

This plan is for releasing the Core Operating Loop Big Build to production without a schema/code incompatibility window.

## Why a controlled cutover is required

Production `main` still reads and writes the legacy `shortlists` and `shortlist_creators` names. Migration `0006_canonical_campaign_model.sql` renames those tables to `campaigns` and `campaign_creators`. Applying the rename without compatibility support would break the old production app before the new app deploy completes. Deploying the new app before the rename would break the new app for the opposite reason.

The safe solution is to keep the canonical rename while adding writable legacy compatibility views and triggers in migration 0006. That allows both old and new application code to operate against the same canonical rows during the release window.

## Release gates

Do not start the production cutover unless all gates are green:

1. Final release branch passes `npm run validate`.
2. Migration 0006 includes legacy compatibility views/triggers for `shortlists` and `shortlist_creators`.
3. Remote D1 preflight confirms no case-insensitive duplicate creator emails.
4. Remote D1 migration state is confirmed and the expected pending migrations are known.
5. A fresh D1 export/backup is captured before applying migrations.
6. Production R2 bucket `vira-media` exists before deploying code that can accept direct media uploads.
7. The final release commit SHA is recorded before deployment.
8. No unrelated changes are merged to `main` during the cutover window.

## Read-only preflight

Run from the final release branch. These commands are read-only.

```powershell
npx wrangler d1 migrations list vira-creators --remote --config wrangler.jsonc
```

Check for duplicate creator email identities before migration 0007:

```powershell
npx wrangler d1 execute vira-creators --remote --config wrangler.jsonc --command "SELECT LOWER(TRIM(email)) email_key, COUNT(*) n, GROUP_CONCAT(id) creator_ids FROM creators GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1;"
```

Expected result: zero rows.

Record basic production counts before migration:

```powershell
npx wrangler d1 execute vira-creators --remote --config wrangler.jsonc --command "SELECT 'creators' item, COUNT(*) n FROM creators UNION ALL SELECT 'shortlists', COUNT(*) FROM shortlists UNION ALL SELECT 'shortlist_creators', COUNT(*) FROM shortlist_creators UNION ALL SELECT 'deliverables', COUNT(*) FROM deliverables UNION ALL SELECT 'clients', COUNT(*) FROM clients UNION ALL SELECT 'campaign_clients', COUNT(*) FROM campaign_clients;"
```

If duplicate creator emails exist, STOP. Resolve the records deliberately before running migration 0007.

## Backup checkpoint

Before any production mutation, export D1 to a timestamped file and retain the final pre-release application commit SHA.

Example:

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
npx wrangler d1 export vira-creators --remote --config wrangler.jsonc --output "backups/vira-creators-$stamp.sql"
git rev-parse HEAD
```

Do not continue unless the export succeeds and the file exists locally.

## Infrastructure checkpoint

The application declares the private production R2 binding:

- binding: `VIRA_MEDIA`
- bucket: `vira-media`

Create the bucket before application deployment if it does not already exist:

```powershell
npx wrangler r2 bucket create vira-media
```

This is a production mutation and requires explicit approval immediately before execution.

## Database-first cutover

Once migration 0006 contains writable compatibility views, the database can be upgraded while the old production application remains online.

Apply pending migrations:

```powershell
npm run db:migrate:remote
```

Expected production migrations are 0005 through 0012 if production currently ends at 0004. Confirm the actual list first; never assume it.

Immediately verify canonical and compatibility access:

```powershell
npx wrangler d1 execute vira-creators --remote --config wrangler.jsonc --command "SELECT (SELECT COUNT(*) FROM campaigns) campaigns, (SELECT COUNT(*) FROM shortlists) legacy_shortlists, (SELECT COUNT(*) FROM campaign_creators) campaign_creators, (SELECT COUNT(*) FROM shortlist_creators) legacy_shortlist_creators;"
```

The canonical and legacy-view counts must match pairwise.

Verify writable compatibility without changing business data by using only schema inspection during the release unless a dedicated disposable production fixture exists. Do not create fake production records merely to test triggers.

## Application release

After migrations and R2 are green, merge/deploy the final release commit to `main` in one controlled action. Because Cloudflare is connected to GitHub `main`, merging the release PR can start the production deployment automatically.

Do not merge the stacked implementation PRs one-by-one during the release window. Use one final release PR from the fully validated release branch to `main`, so Cloudflare receives a single coherent application version.

## Post-deploy smoke

After Cloudflare reports the new deployment healthy, verify without modifying real campaign content:

1. Public site loads.
2. Admin login works.
3. Command Centre loads.
4. Campaign list and one existing campaign workspace load.
5. Creator portal login/request-code route responds normally.
6. Client portal login/request-code route responds normally.
7. Finance tab loads for an existing campaign.
8. Publishing route loads.
9. Activity route loads.
10. No new server errors appear in Cloudflare observability.

Only perform a real creator upload/client-review loop with an approved test campaign or disposable fixture.

## Rollback strategy

### If database migration fails before application deploy

STOP. Do not merge/deploy the new application. Investigate the failed migration from the old application state. Restore from the D1 export only if a corrective forward migration is not safer.

### If database migration succeeds but new application deploy fails

Keep or restore the old application deployment. The writable compatibility views preserve the old `shortlists` / `shortlist_creators` interface, so the old app remains compatible with the migrated database.

### If the new application deploy succeeds but application behavior is broken

Roll back the Worker/application to the recorded pre-release commit/deployment first. Do not immediately reverse the database migrations. Compatibility views are specifically intended to make application rollback possible without destructive schema reversal.

### If data integrity is compromised

Stop writes if possible, preserve logs, and use the pre-release D1 export as the recovery checkpoint. Prefer a reviewed forward repair when possible; destructive restore is the last resort.

## After the release is stable

Keep the legacy compatibility views for at least one release cycle. Remove them only in a later dedicated migration after confirming no deployed code, worker path, script, or operational tool still references `shortlists` or `shortlist_creators`.

## Explicit approvals required

The following actions remain blocked until explicitly authorized at release time:

- production D1 read-only preflight, if production access itself is being held
- production D1 export
- R2 bucket creation
- remote D1 migrations
- final PR merge to `main`
- Cloudflare production deployment/release
- any rollback that mutates production data
