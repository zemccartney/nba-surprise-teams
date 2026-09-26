# Production cutover checklist

Prepared 2026-09-26. Zack approved the main-first, manual-production deployment
sequence, deferred screen-reader testing and agreed a seven-day rollback window.
Neither Worker nor Pages has a Git connection. Automatic publishing was disabled
for initial deployment/domain coordination; the docs-only merge subsequently
proved it works, and the temporary bootstrap controls are now removed.

## Current execution state

Canonical now serves the Worker; the legacy alias retains its existing 301 Bulk
Redirect. Both associations are persisted in config and required by the production
guard. [Domain verification and rollback window](production-domain-cutover.md):
Pages remains through at least **2026-10-03 21:12 UTC**, pending retirement approval.
Sections B/C below record the completed initial bootstrap, not the current
production route configuration. Never redeploy the earlier no-routes config.
Automatic publishing was verified by docs-only merge `b257eee`, push-triggered
run 36272421438. Normal publishing now uses the same ref/resource guards without
the temporary gate or bootstrap inputs.

## Prepared target

| Setting                      | Value                                                         |
| ---------------------------- | ------------------------------------------------------------- |
| Worker                       | Existing `nba-surprise-teams` (do not recreate)               |
| Initial verification URL     | `https://nba-surprise-teams.zemccartney.workers.dev`          |
| Canonical production origin  | `https://nbastt.grepco.net`                                   |
| Additional public hostname   | `nba-surprise-teams.grepco.net` (preserve)                    |
| Production `GAMES_KV`        | Existing `nbastt-prod`, `6061594acc5c4fb6b3846b0c78f9e5a3`    |
| Native Preview `GAMES_KV`    | Existing test namespace `6a0d30705c634691873dd1dd122969e3`    |
| Production build environment | `PUBLIC_DEPLOY_ENV=production`; no named Wrangler environment |
| Sentry release               | Build Git SHA, shared by browser, server and map uploads      |

Source `wrangler.jsonc` supplies production KV and `workers_dev: true` for
initial verification. **The approved initial production deployment is now live
at that URL**; see [execution evidence](production-worker-verification.md).
Native Previews still use their explicit test
bindings; publishing a Preview does not deploy these production settings.

No production routes/custom domains are in the initial config. That is deliberate:
the first deployment must not move either public hostname. Do not promote a native
Preview deployment as production: its compiled environment and KV are for testing.

## Preparation validation

Local production-mode build passed dependency audit, full verification (**202 tests**)
and the **375-file** artifact audit. Generated configuration was checked for the
exact production Worker/KV, enabled workers.dev, absence of domain routes and
separate native Preview KV; the preview-target guard also passes. This local build
had no Sentry upload token and is **not** the instrumented CI release candidate.
Repository variable readback confirms `DEPLOY_ENABLED` is still absent. No Cloudflare
mutations, production deployments or workflow dispatches were performed in this step.

## A. Decisions and authorization before execution

- [x] User confirms both Cloudflare Git integrations disconnected.
- [x] User explicitly deferred manual screen-reader review for now.
      Check VoiceOver/Safari or another real screen reader: navigation/reading order,
      chart descriptions and table alternatives, live loading/error/empty-state
      announcements, and whether changing views leaves focus understandable.
      Keyboard/focus and automated checks already passed; this is not a request to
      redesign charts. No screen-reader pass is claimed yet.
- [x] Agreed rollback window: **seven days after both domains pass**;
      extend if errors appear. Do not delete Pages automatically on a timer.
- [ ] Approve the exact production revision, initial Worker deployment, then the
      separate domain move. Approval of this checklist is not execution approval.
- [x] Agreed first-production publishing mechanics. The workflow only
      permits production from `main`, and its automatic gate is off. Recommended:
      approve merging the reviewed branch into main with that gate still off, then
      add/use an explicitly authorized **main-only manual production dispatch**.
      The main-only `production_deploy` dispatch is now implemented, with an
      initial generated-config guard rejecting custom-domain routes. Do not use
      `preview_deploy=true`, loosen the ref classifier, or open automatic publishing
      just to bootstrap. This requires adjusting the earlier merge-after-cutover
      sequence; Zack approved this adjustment. Branch deletion/cleanup remains
      after cutover.

## B. Capture rollback state immediately before deploying

- [ ] Confirm `DEPLOY_ENABLED` remains absent/off and no unexpected deploy is running.
- [ ] Re-read Worker production version/settings, Pages deployment and both domain
      associations; stop if they differ unexpectedly from the recorded inventory.
- [ ] Record DNS screenshots for **both** names: currently proxied CNAMEs targeting
      `nba-surprise-teams.pages.dev`, TTL Auto. Confirm both are active on Pages.
- [ ] Retain Pages project `nba-surprise-teams` and its production deployment
      `c005800c-5863-4495-b64a-fb5c36a78014` (commit `f5382f3`). Verify the fallback
      `https://c005800c.nba-surprise-teams.pages.dev` and project Pages URL still work.
- [ ] Keep production KV intact. Pages and the new production Worker intentionally
      use the same namespace, but their cache versions **differ**:
      retained Pages `SCHEMA_ID=fe5ae574-bb2d-478e-a2b5-d9b9f1458cc0`, new Worker
      `LIVE_DATA_VERSION=07423eeb-1ebb-4cf1-89b7-ab05795b5ac1`. Both key by season ID
      and reject the other version; Pages cannot use the new envelope as stale fallback.
      Both latest-season paths return before KV access until **2026-10-20**. Confirm
      actual cutover/rollback dates still fall in preseason. If the window crosses
      opening night, reassess shared-cache writes and snapshot the affected keys
      read-only before deployment; agree a targeted data recovery procedure separately.
      Do not seed test games or clear the namespace.

## C. Initial production deployment — no custom domains yet

Only after the publishing mechanism and deployment are approved:

- [x] Build the approved `main` revision in the audited CI environment with all four
      existing repository secrets. Set `PUBLIC_DEPLOY_ENV=production`, unset
      `CLOUDFLARE_ENV` and preview-origin overrides. Keep source-map upload/cleanup
      and artifact sealing enabled; do not substitute an uninstrumented local build.
- [x] Pass installation audit, full verification, build and artifact audit. Inspect
      generated `dist/server/wrangler.json`: correct Worker name, production KV,
      `workers_dev: true`, no custom-domain routes; native preview overrides remain
      test-only. Confirm production origin and release identity in the built output.
- [x] Deploy the **production build** with `wrangler deploy`. Record its version,
      commit and CI run. API-read back actual production bindings and URL settings.
- [x] At the initial workers.dev URL check home, Stats, archive, About, an archived
      team, unknown-route 404, `/stats` → `/stats/` 307, immutable fingerprinted assets,
      images, chart interactions at desktop/mobile widths, keyboard and tooltips.
- [x] Check same-origin actions: latest preseason empty result 200, historical 400,
      unknown 404. At preseason this does not exercise a live refresh/stale fallback.
      Those remain season-activation checks; never fabricate games in production KV.
- [x] Verify browser/server Sentry environment `production`, matching Git SHA and
      mapped original source. If a temporary server-error probe is needed, agree it,
      authenticate it, keep it off normal routes, then remove its route and secret
      and verify a clean deployment **before domain transfer**. Do not add a public
      deliberate-crash route or mutate production data to manufacture an error.
- [x] Confirm Pages and both public hosts still serve the old production unchanged.
- [ ] Stop on unexpected bindings, unmapped errors, functional failures or traffic
      changes. Successful Worker URL testing does not itself authorize domain transfer.

## D. Coordinated custom-domain transfer

**Existing redirect policy confirmed by Zack:** `nba-surprise-teams.grepco.net`
is a redirect-only legacy alias. Preserve its existing Cloudflare Bulk Redirect
(301 to `https://nbastt.grepco.net`, retaining path/query). `nbastt.grepco.net`
is the only canonical application hostname. Do not disable the rule for testing
or add a competing application redirect. A redirect response does not exercise
the Worker behind the alias; full custom-domain app checks must use the canonical
hostname after its transfer.

Use **Worker Custom Domains**, not a blind DNS CNAME edit or a broad zone route.
The old Pages association must be released before the same name can be attached
to the Worker. This is not assumed atomic; allow for certificate provisioning and
coordinate a maintenance window. If the dashboard cannot establish the expected
association, stop and restore Pages rather than guessing at DNS records.

- [ ] Approve transfer of both names and recheck the rollback snapshot.
- [x] Move the alias `nba-surprise-teams.grepco.net` first: remove only that Pages
      custom-domain association. Inspect DNS: if its old Pages CNAME remains, remove
      **only that exact recorded CNAME** immediately before adding the Worker Custom
      Domain. Cloudflare does not allow a Custom Domain over an existing CNAME.
      Add the hostname under Worker → Settings → Domains & Routes → Custom Domain.
      Let Cloudflare provision its record/certificate; do not delete the Pages project.
- [x] Verify alias HTTPS and existing redirect behavior: root and `/stats/` return
      301 to canonical; a test query string is preserved. API confirms the alias is
      attached to the production Worker and removed from Pages. This verifies the
      association and redirect, not execution of the Worker behind the redirect.
- [x] On failure, follow rollback below. On success, explicitly proceed with
      `nbastt.grepco.net` using the same sequence. Keep its canonical-origin role;
      do not introduce a new alias redirect policy during the migration.
- [x] Verify the canonical app: routes, same-origin actions, assets, security/cache
      headers, charts, keyboard behavior, Sentry release/environment and error rates.
      Verify the legacy alias still redirects to it, preserving path/query.
      Screen-reader testing remains explicitly deferred. Record timestamps, version,
      DNS and domain state; then start the agreed seven-day rollback window.
- [x] Before any subsequent production deployment, persist the two verified
      associations in `wrangler.jsonc` as `routes` entries:

  ```json
  [
    { "pattern": "nbastt.grepco.net", "custom_domain": true },
    { "pattern": "nba-surprise-teams.grepco.net", "custom_domain": true }
  ]
  ```

  Do not deploy a stale no-routes production configuration after manual attachment.
  Do not include these routes in the initial pre-transfer deployment.

## E. Rollback — per hostname, or both if necessary

Trigger rollback for persistent 5xx/action failures, broken assets/charts, TLS or
routing failures, unsafe binding/data behavior, or an agreed observability failure.

Preserve the Bulk Redirect throughout rollback. Normally restore only the canonical
hostname to Pages: the legacy alias can remain attached to the Worker and redirect
to the restored canonical site. Restore the alias association too only if needed;
its expected behavior remains a redirect, never a second app hostname.

1. Disable the GitHub workflow: `mise x -- gh workflow disable deploy.yml`.
   Inspect running/queued deployments and ensure they cannot race the rollback
   before changing domain associations. Disabling does not cancel an active run.
   The old `DEPLOY_ENABLED` variable was retired and is no longer a pause switch.
2. For each transferred hostname, remove **only** its Worker Custom Domain. Check
   whether its Worker-managed DNS record was removed; clear any remaining
   conflicting record for that exact hostname before restoring the saved CNAME.
3. Re-add that hostname to Pages project `nba-surprise-teams`. Restore/verify the
   recorded proxied CNAME to `nba-surprise-teams.pages.dev`, TTL Auto, following
   Pages' custom-domain setup. A CNAME alone is not a complete Pages association.
4. Wait for active Pages domain/TLS status and verify routes, actions and assets.
   Confirm the retained Pages deployment is serving. The Pages URL is the fallback
   while custom-domain provisioning completes; propagation may not be immediate.
5. Leave KV intact. A code/domain rollback does not undo KV writes. If the Worker
   has written active-season data, Pages will reject its different cache version
   and may need a successful NBA refresh; its stale fallback is not compatible.
   Assess targeted recovery from the pre-deploy snapshot before any KV mutation.
   Do not bulk-clear or blindly restore the namespace. Keep the Worker for diagnosis.
6. Reconcile source `routes` with the restored live state before any redeployment.

The parent's previous Hello World version is **not** the site's rollback target.
For an app regression after a successful Worker launch, a previously verified
production Worker version may be usable; record its binding/config compatibility
before rolling it back. Never substitute a native Preview's test configuration.

Reference: [Worker Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
Deleting a Worker Custom Domain does not automatically delete its generated
certificate. Audit unused certificates later; never delete a certificate still
needed by the restored site as part of a rushed rollback.

## F. Observation and retirement

- [ ] Monitor both hostnames, Sentry and Worker errors through the agreed window.
- [ ] At season activation, check real refresh/expiry/stale fallback behavior with
      authentic NBA data; keep performance/font and dev-only Sentry work separate.
- [ ] Obtain approval before deleting Pages. Keep Git disconnected throughout.
- [x] After both domains are stable, enable automatic publishing and merge a
      small useful docs-only change into main, without a manual dispatch. Verify
      that the push-triggered run deploys that SHA, production bindings remain
      correct, Sentry release matches, and both domains pass smoke checks. Disable
      publishing again if this fails. This is the agreed automatic-deployment test.
- [x] After successful cutover, reconcile any remaining branch changes, remove
      temporary deployment gates/bootstrap controls, and retain ref/isolation checks.
- [x] Retire the merged branch's native Preview if no longer needed; retain the
      parent Worker and shared preview KV. Preserve useful unmerged branches/worktrees.
