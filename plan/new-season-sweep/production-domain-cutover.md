# Production domain cutover — 2026-09-26

## Serving state

- **Canonical app:** https://nbastt.grepco.net — Worker `nba-surprise-teams`.
- **Legacy alias:** https://nba-surprise-teams.grepco.net — same Worker domain
  association, but the existing Cloudflare Bulk Redirect executes first: **301 to
  canonical, preserving path and query string**. Keep that rule unchanged.
- Both associations are now declared in `wrangler.jsonc`. The production target
  guard requires exactly these two Custom Domains and the production KV namespace;
  missing, duplicate, foreign or non-custom-domain routes fail closed.
- Production `GAMES_KV`: `6061594acc5c4fb6b3846b0c78f9e5a3`. Native Previews retain
  explicit test KV. Direct workers.dev verification remains available.
- Pages has no custom-domain associations and no Git connection. Its original
  deployment `c005800c-5863-4495-b64a-fb5c36a78014` is intact and returns 200 at
  https://c005800c.nba-surprise-teams.pages.dev. Do not delete it yet.

## Canonical verification

- Both domain associations and production KV verified through API readback.
- Full chart harness passes at 1440/390/320px; tooltip safety and all six
  blocked/stalled/delayed-font cases pass on canonical.
- Home, Stats, archive, About and archived team: 200; unknown route: 404.
- Same-origin actions: latest preseason empty payload 200; historical 400;
  unknown season 404. No production test data or forced refreshes introduced.
- `/stats` → `/stats/`: 307. Hashed assets retain immutable one-year caching.
- Canonical has no `noindex` response directive or robots meta tag.
- Browser SDK options: environment `production`, release matches deployed Git SHA;
  no page errors. Production server capture/mapping was separately confirmed in
  [the received diagnostic event](production-worker-verification.md).
- HSTS and `X-Content-Type-Options: nosniff` remain supplied by the zone.
  Pages' explicit `Referrer-Policy` was missing after transfer, so `public/_headers`
  now preserves `strict-origin-when-cross-origin`; canonical browser response
  readback confirms it. No wildcard CORS policy was added merely to copy Pages'
  default headers; the app's tested actions and asset requests are same-origin.
- Alias root, `/stats/` and a test query retain the existing 301 behavior. These
  validate the redirect, not application execution behind the alias.

## Controlled configuration deployment

[Run 36271931226](https://github.com/zemccartney/nba-surprise-teams/actions/runs/36271931226)
was manually dispatched from main with automatic publishing still off:

- Commit: `4782251e4f9a6f72f5599c7ff3f05dd08e2f7df1`
- Worker version: `494390f9-959d-45bd-a180-dc101b92d69e`
- **219 tests**, 376-file artifact audit; generated production and preview guards pass.
- Both custom domains preserved by deployment; no diagnostic secrets remain.
- Browser environment/release, referrer header, alias redirect and retained Pages
  URL checked again afterward. Deployment credentials can manage the domain
  configuration; this is no longer only a manual dashboard association.

## Seven-day rollback window

Observation window: **2026-09-26 21:12 UTC through at least 2026-10-03 21:12 UTC**.
Keep Pages and production KV intact. Extend the window if a regression appears.
Deletion still requires explicit approval, not merely the passage of seven days.

Use the [rollback procedure](production-cutover-checklist.md#e-rollback--per-hostname-or-both-if-necessary).
Normally restore only canonical to Pages and preserve the legacy Bulk Redirect.
The old/new cache versions differ, but the latest-season action skips KV before
2026-10-20; this agreed window ends before opening night. Reassess if dates change.

## Automatic deployment proof — passed

Enabled `DEPLOY_ENABLED` only after the controlled checks, then merged the
`verify-auto-deploy` branch with a real merge commit. Its diff contained only
README and cutover documentation, no runtime/configuration changes.

[Run 36272421438](https://github.com/zemccartney/nba-surprise-teams/actions/runs/36272421438)
was triggered by **push**, not workflow dispatch:

- Merge/release: `b257eee88219b5f77e01f4578a198bb742d47dda`
- Worker version: `f0e3ea75-afe9-44f8-a45e-770b6c21159e`
- **219 tests**, 376-file artifact audit; both custom domains and production KV
  verified by API readback afterward.
- Canonical browser SDK reports that exact merge SHA and `production`; no page
  errors, no noindex directive, and the referrer policy is intact.

## Normal workflow after cutover

Removed the temporary gate and `preview_deploy` / `production_deploy` bootstrap
inputs. Pushes deploy production only for exact `main`, native Previews for other
branches. Manual dispatch uses that same classifier and generated-config guards.
Per-ref concurrency serializes publishes without cancelling an active deployment;
deleted-branch push events and non-branch refs are skipped.

The old `DEPLOY_ENABLED` variable is no longer a pause switch. To stop publishing,
disable the `deploy.yml` workflow and inspect/cancel or await any in-flight runs
before changing domain associations. See the rollback checklist. Pages retirement
is still separately gated by the seven-day window and explicit approval.

Normal-workflow push [run 36273016320](https://github.com/zemccartney/nba-surprise-teams/actions/runs/36273016320)
then passed **220 tests** and the 376-file artifact audit: commit `ccdcb1c`, version
`063b9fce-06f8-4577-a584-d8e43c5206de`. API bindings/domains and canonical browser
release/environment/header checks passed again. Removed the unused repository
variable after that success. The latest successful Actions run remains the source
of truth for newer automatically published commits.

## Merged-work cleanup

Removed only the fully merged local/remote `workers-cutover` and
`verify-auto-deploy` branches. Retired their unused cutover Preview
`workers-cutover-63d134855ea4` after verifying its unchanged deployment ID.
Production deployment history was unchanged by Preview deletion; shared preview KV
and Pages remain intact. New feature branches can create fresh native Previews.
Unrelated branches/worktrees and personal files were left alone. Existing work
branches should incorporate current main before publishing to inherit the new
workflow rather than the obsolete cutover gate.

Screen-reader review remains explicitly deferred. Performance/font work,
season-activation checks and upstream Sentry reports remain separate follow-ups.
