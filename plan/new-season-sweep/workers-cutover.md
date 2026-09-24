# Workers cutover

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

Configuration now selects `nbastt-preview` and the existing preview namespace
with `CLOUDFLARE_ENV=preview`. Its origin is the workers.dev URL below. An explicit
non-main `preview_deploy` workflow dispatch bootstraps/updates this Worker without
turning on `DEPLOY_ENABLED`. Normal future preview version uploads target the
same isolated preview Worker. A generated-config guard rejects production KV,
wrong Worker names and domain routes. Local preview build, dry-run, artifact
audit and **192 tests** pass; hosted execution is the next gate.

### Approved next step

Prepare a separate `nbastt-preview` Worker using the existing preview KV and
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
