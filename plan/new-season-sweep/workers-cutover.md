# Workers cutover

## Current checkpoint — production Worker live, public domains still on Pages

[Production verification](production-worker-verification.md) and
[execution/rollback checklist](production-cutover-checklist.md).
Main-first merge and manual deployment are complete. Current clean production:
**https://nba-surprise-teams.zemccartney.workers.dev**, commit `499ee33`, version
`4f372575-6416-46ae-ab79-9cd48ed62794`; **213 tests**, 73 maps cleaned, 376-file
audit. Production KV and hosted charts/actions/browser Sentry options verified.
Temporary server-error route and secret removed. Received production Sentry event
`848c64873c7844559c9e3fb8fba6f679` confirms automatic Astro capture, the diagnostic
Git release and all three mapped frames with no processing errors reported.
Both public domains remain on retained Pages, and automatic publishing stays off.
Zack deferred screen-reader review and agreed a seven-day rollback window after
both domains pass; that window has not started. Both Git integrations are disconnected.

### Earlier native Preview checkpoint (before production deployment)

- URL: **https://workers-cutover-63d134855ea4-nba-surprise-teams.zemccartney.workers.dev**
- Current deployed commit: `66de885`; native deployment
  `86545e05-8516-49bc-82f6-caf4ff493f6e`.
- [Native Previews migration](native-previews.md): Wrangler 4.137.0; branch
  Previews under the existing `nba-surprise-teams` Worker with explicit test KV.
  The parent's production code/deployments/bindings remain unchanged. Only its
  preview URLs were enabled; production workers.dev stays disabled.
- [Deployment 36265152847](https://github.com/zemccartney/nba-surprise-teams/actions/runs/36265152847)
  passed **202 tests**, removed 73 maps before artifact sealing and passed the
  376-file audit. Hosted chart/tooltip/font checks and actions pass; API readback
  confirms preview KV. The old `nbastt-preview` Worker was deleted after native
  verification; its KV namespace remains for the native Previews. No diagnostic
  routes, secrets or fake data were introduced by this migration.
- Earlier [source-map experiment](sentry-source-maps.md): the user's fresh event export
  confirms all seven frames mapped, including the original TypeScript error
  statement, with no processing errors.
- [Worker entry migration](sentry-worker-entry.md): the server now explicitly
  receives the same build SHA as browser events/uploads. Active runtime options
  and browser release match; the received event confirms the release, all seven
  frames mapped and no processing errors.
- [SDK Astro middleware](sentry-astro-middleware.md): local workerd controls prove
  route enrichment and automatic capture of errors Astro handles as 500s. A fresh
  hosted event export confirms automatic capture, release, route naming and all
  three frames mapped, with no processing errors. Integration
  server initialization remains disabled: enabling it demonstrably breaks our
  Node prerender build by importing the Worker entry.
- [GitHub/Linux run 35945190784](https://github.com/zemccartney/nba-surprise-teams/actions/runs/35945190784)
  passed: installation audit, full verification, **192 tests**, build,
  375-file artifact audit (Sentry-enabled build), target guard and deployment.
- Hosted application checks pass at 1440/390/320px; tooltip-safety and all six
  blocked/stalled/delayed-font cases pass. The first application run measured
  one tooltip during remote logo resizing; the harness now waits for image
  decoding and native repositioning before checking settled clearance, without
  lowering the threshold or changing application rendering.
- Home, Stats, archive, About and archived team routes return 200; unknown routes
  return 404 after slash normalization. `/stats` redirects 307 to `/stats/`.
  Fingerprinted assets have immutable one-year caching.
- Actual hosted action: latest preseason returns empty games without expiry;
  historical and unknown seasons return 400 and 404 respectively.
- API readback confirms preview-only KV and no preview custom domains. Pages
  production deployment remains unchanged and Git-disconnected. Production
  deployment gate is still absent/off. No production KV or DNS changes.

### Subsequent checks and deferred performance work

- The DNS screenshot confirms both custom hostnames are proxied CNAMEs to
  `nba-surprise-teams.pages.dev`, TTL Auto. No DNS changes were made.
- Browser Sentry smoke event `bbae8c8b7a194cd382579dec3ea07468` was accepted
  by ingestion (HTTP 200), environment `preview`, release
  `93ce78c98b0628f58556fae3c6b7e0f1261190da`. Marker:
  `NBASTT preview cutover smoke 2026-09-24T03:09:03.937Z`.
  Zack confirmed receipt. This deliberately injected browser error does not
  prove application source-map mapping or server error delivery.
- Zack deferred focused performance work until after season start. The unshipped
  CSS/preload experiments were reverted; deployed preview is unchanged. See
  [performance audit notes](../performance/README.md). No performance blocker
  is being added to this cutover.

**Hosted Worker checks:** preview KV round-trip/decoding/cleanup passed. The
original NBA request failed with 403 from the Worker; tested browser-compatible
headers fixed access, and the actual loader passed twice. A server Sentry smoke
event was captured/flushed. See [full results and diagnostic cleanup](hosted-cutover-checks.md).

**Still before production cutover:** screen-reader review and domain routing/rollback. Real
in-progress/final-game behavior and the actual post-preseason action refresh path
remain season-activation checks, with current unit coverage. The original server
event had valid debug IDs but missing maps and no runtime release. Delayed
cleanup now preserves application maps in both uploads; the fresh exported event
confirms successful debug-ID mapping using the second upload, without a release
value. That hosted source-map check and the subsequent Worker-entry event with
release tagging both passed. The middleware automatic-capture event is also verified. Runtime init now lives in the respective
client/Worker config files, removing the integration's runtime-option warnings.
Dev-only instrumentation behavior remains deferred. Compare final custom-domain
security headers; workers.dev does not share the production zone's settings.

The following sections preserve the preparation sequence.

## 2026-09-24 — Main merged; read-only Cloudflare inventory

Zack disconnected the Pages Git integration and authorized merging the approved
stack. Cloudflare confirms the project has no Git source. `main` was advanced
without rewriting history from `f5382f3` to `a9a7952`; the consolidated stack
includes the missing SVG documentation commit. The separate light-mode and
image-service experiments remain unmerged. Local personal files are unchanged.
The merged stack passed dependency audit, Astro check and 180 tests.

The GitHub Workers deployment gate remains absent/off; the main deployment run
was **skipped**. No Worker deployment, binding change, DNS change or Pages
teardown has occurred. Follow-up work is on `workers-cutover`.

### Verified inventory

- Account Workers subdomain: `zemccartney.workers.dev`.
- Pages project: `nba-surprise-teams`; domains:
  - `nba-surprise-teams.pages.dev`
  - `nbastt.grepco.net`
  - `nba-surprise-teams.grepco.net` (preserve this alias unless deliberately retired).
- Current Pages production deployment:
  `c005800c-5863-4495-b64a-fb5c36a78014`, built from `f5382f3`.
  Retained URL: `https://c005800c.nba-surprise-teams.pages.dev`.
- Existing Pages `GAMES_KV` bindings:
  - production: `nbastt-prod`, ID `6061594acc5c4fb6b3846b0c78f9e5a3`;
  - preview: `nbastt-preview`, ID `6a0d30705c634691873dd1dd122969e3`.
- Configured Worker `nbastt` does **not** exist.
- Existing Worker `nba-surprise-teams` was created via `dash_template` on
  September 13. It has no bindings, workers.dev and preview URLs disabled,
  and no custom domains. Do not repurpose or delete it without agreement.
- No Worker routes were returned for the `grepco.net` zone.
- The four required GitHub secrets exist; values and CI token permissions
  have not been verified. Secret values were not printed or recorded.
- OAuth works for the account inventory, but DNS-record reads return **403**.
  Public DNS only reveals proxied Cloudflare addresses, not the underlying
  records. Dashboard confirmation of both custom-domain DNS records is still
  needed before defining the exact cutover/rollback procedure.

### Confirmed preparation gaps

1. `wrangler.jsonc` still has a placeholder KV ID and no preview-binding
   separation. Production and preview must not accidentally share cache writes.
2. `astro.config.mjs` still uses the old Pages preview origin.
3. Pinned Wrangler explicitly rejects `versions upload` for a nonexistent
   Worker: an initial `deploy` is required. The current branch workflow cannot
   bootstrap `nbastt` as written.
4. The actual GitHub/Linux verification and publishing path has not run.

### Preview deployment authorized

Zack approved isolated preview deployment and requested merged-branch cleanup.
Deleted 5 local and 11 remote branches fully contained in main; preserved main,
workers-cutover, light-mode and the separate image-service worktree.

The initial standalone configuration selected `nbastt-preview` and the existing preview namespace
with `CLOUDFLARE_ENV=preview`. Its origin is the workers.dev URL below. An explicit
non-main `preview_deploy` workflow dispatch bootstraps/updates this Worker without
turning on `DEPLOY_ENABLED`. Normal future preview version uploads target the
same isolated preview Worker. A generated-config guard rejects production KV,
wrong Worker names and domain routes. Local preview build, dry-run, artifact
audit and **192 tests** pass; hosted execution is the next gate.

### Approved next step

Original staging plan (superseded by [native Previews](native-previews.md)):
prepare a separate `nbastt-preview` Worker using the existing preview KV and
only its workers.dev address (`nbastt-preview.zemccartney.workers.dev`). Keep
production KV, both public domains, the existing dashboard Worker and Pages
untouched. Update preview configuration/origin and provide an explicit initial
preview-deployment path, then exercise the GitHub/Linux pipeline and hosted
checks. Do not enable automatic main deployment merely to bootstrap preview.

### Manual DNS inspection and eventual cutover

In Cloudflare, open the `grepco.net` zone → DNS → Records. Filter for
`nbastt.grepco.net` and `nba-surprise-teams.grepco.net`. Record each record's type,
content/target, proxy status and TTL (a screenshot is fine). Do not change or
delete them yet. Pages → nba-surprise-teams → Custom domains should still show
both names. These details establish the rollback recipe; they are not required
to deploy the workers.dev preview.

The current Wrangler OAuth login cannot read DNS records. Manual dashboard
operation is sufficient. Alternatively, create a separate custom API token
restricted to the `grepco.net` zone with Zone / DNS / Read. DNS / Edit is only
needed if authorizing API changes later. A DNS-only token should not replace the
working deployment credential; use it only for DNS API requests. Do not paste
tokens into chat or commit them to the repository.

After hosted NBA/KV/cache/chart/accessibility/Sentry checks, agree on domain
routing and rollback, deploy production, transfer traffic, observe, and only
then retire Pages after an agreed rollback window. Dev-only Sentry rework and
unrelated feature work remain deferred.
