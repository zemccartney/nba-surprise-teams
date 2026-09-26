# Initial production Worker verification — 2026-09-26

## Approved sequence and scope

Zack deferred the manual screen-reader check, agreed **seven days of Pages
rollback retention after both domains pass**, and approved main-first merge,
manual production deployment, then coordinated domain transfer. After domains
are stable, enable automatic publishing and prove it with a real docs-only merge
into main (not a manual dispatch). The rollback clock has **not started**.

- Both Cloudflare Git integrations are disconnected.
- `main` was fast-forwarded to `cff76cb`; the push run
  [36268495530](https://github.com/zemccartney/nba-surprise-teams/actions/runs/36268495530)
  correctly **skipped** deployment. `DEPLOY_ENABLED` remains absent.
- Added explicit `production_deploy` manual input, allowed only on main, with
  runtime ref checks and a generated production-target guard. The initial guard
  rejects all custom-domain routes. Update it alongside the exact two approved
  route entries after domain transfer, before another production deployment.
- Preserved personal files, unrelated branches and worktrees. `workers-cutover`
  was retained through initial verification, then retired after the completed
  [domain cutover and automatic-deployment proof](production-domain-cutover.md).
  Subsequent production work is on main.

## Initial deployment and clean current deployment

Initial [run 36268506232](https://github.com/zemccartney/nba-surprise-teams/actions/runs/36268506232):
commit `cff76cb3ba1c3a07bcbce792f5c815c7632e9ad0`, version
`d645d402-16e6-4597-a021-d13fa0f347dd`.

Current clean [run 36269258345](https://github.com/zemccartney/nba-surprise-teams/actions/runs/36269258345):
commit **`499ee33d3668bfcbeae4e21633d83b28209778be`**, version
**`4f372575-6416-46ae-ab79-9cd48ed62794`**.

Both passed **213 tests**, uploaded source maps before removing 73 maps, and
passed the **376-file** artifact audit. Production URL:
**https://nba-surprise-teams.zemccartney.workers.dev**.

API readback confirms exactly `ASSETS` and production `GAMES_KV`
(`6061594acc5c4fb6b3846b0c78f9e5a3`), with workers.dev enabled. No probe secret
remains. The original parent Worker was updated in place, not recreated.

## Hosted checks

- Chart application passes at 1440/390/320px; tooltip safety and all six
  blocked/stalled/delayed-font cases pass.
- Home, Stats, archive, About and an archived team return 200; unknown path 404.
- Latest preseason action: normal empty payload, 200. Historical 400, unknown 404.
  No fake data, KV probes or NBA fetches were used to manufacture production tests.
- Browser SDK active options confirm `production` and the actual build SHA.
  Final clean deployment: release `499ee33d3668bfcbeae4e21633d83b28209778be`, no
  page errors. All browser sessions closed.
- Final removed diagnostic returns the normal application's HTML 404.

## Production server Sentry check — received and mapped

Diagnostic [run 36268914983](https://github.com/zemccartney/nba-surprise-teams/actions/runs/36268914983)
deployed `841e8912e34e3eb16cc81a1b69c50c305b80f484`: 220 tests, 75 maps cleaned,
379-file artifact audit. A temporary POST endpoint was gated by a random secret,
production environment and the exact workers.dev hostname. It never accessed KV
or the NBA feed. It stripped request headers/body from the event before throwing;
there was **no explicit captureException call**.

- Unauthorized request returned 404; authenticated request returned the expected 500.
- Marker: **`NBASTT production middleware smoke 63e8b5260db0c23366018f49`**.
- Received event **`848c64873c7844559c9e3fb8fba6f679`**: environment `production`, release
  `841e8912e34e3eb16cc81a1b69c50c305b80f484`, automatic Astro middleware mechanism,
  original `src/pages/cutover/production.ts:44`, no source-map processing errors.
- User-supplied event JSON confirms all **three frames mapped** with original
  source context, including the throw at line 44:9. Mechanism
  `auto.middleware.astro`, `handled: false`, transaction `POST /cutover/production`.
  No processing errors reported; request headers/body are absent. This establishes
  received automatic capture and mapping, not a project-wide duplicate-event audit.
- First attempt shortly after secret publication still returned 404. Retried
  after a longer propagation wait; only the successful attempt threw the error.
  Every secret was deleted in `finally`. No token was logged or committed.
- Removed the route and its seven temporary tests, then deployed the clean commit
  above. The temporary secret is gone; the endpoint is now a normal HTML 404.
  Secret updates generated additional Worker versions, but the Sentry release is
  the diagnostic **Git SHA**, not those deployment IDs. Do not select diagnostic
  or secret-update versions as rollback targets; use a recorded clean app version.

## Domain handoff — legacy alias transferred, canonical still on Pages

Zack removed the legacy alias from Pages and attached it to the Worker. No leftover
Pages CNAME was visible. API readback confirms `nba-surprise-teams.grepco.net`
belongs to Worker `nba-surprise-teams`, environment `production`; Pages retains
`nbastt.grepco.net` and its project URL. Pages deployment
`c005800c-5863-4495-b64a-fb5c36a78014` remains intact.

Zack clarified the longstanding **Bulk Redirect**: the old hostname is redirect-only;
`nbastt.grepco.net` is the sole canonical app hostname. Preserve this rule unchanged.
Direct HTTPS checks confirm 301 for `/` and `/stats/`, and preservation of the query
in `/stats/?cutover_check=1`. These responses are edge redirects, not Worker app
execution. Earlier HTTP checks that followed redirects to 200 did not establish
that the alias independently served the app. Canonical still returns 200 from Pages.
Unrelated Worker domains were left untouched.

Next: transfer the canonical hostname using the [cutover checklist](production-cutover-checklist.md),
then verify the app there and recheck the alias redirect. Keep automatic publishing
off, and do not deploy the stale no-routes config during this partial handoff.
Persist both associations and update the production guard before another deployment.
The seven-day rollback window starts only after canonical app and alias redirect
checks pass.
