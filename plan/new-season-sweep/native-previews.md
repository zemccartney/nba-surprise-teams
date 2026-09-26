# Native Worker Previews — 2026-09-26

## Decision and toolchain

The user chose Cloudflare's new native branch Previews rather than a separate
QA Worker or aliased Version URLs. Upgraded Wrangler **4.129.0 → 4.137.0**,
released 2026-09-23 and eligible under the existing three-day pnpm cooldown.
Audits pass; no cooldown, trust-policy, hook or audit bypasses. The adapter and
Vite versions are unchanged. `pnpm why wrangler` resolves one version, 4.137.0.

The current [Previews documentation](https://developers.cloudflare.com/workers/previews/)
requires Wrangler 4.135.0+. The old CLI labelled the command private beta;
4.137.0 labels it open beta. The earlier assertion that resource-isolated previews
necessarily need a separate Worker was incomplete: it omitted this newer feature.

## Configuration and workflow

- Keep the user's existing **`nba-surprise-teams`** Worker as the parent. No
  deletion/recreation or production code deployment is needed to create a Preview.
- `previews.kv_namespaces` explicitly binds `GAMES_KV` to the existing test
  namespace `6a0d30705c634691873dd1dd122969e3`. Production's namespace configuration
  remains a placeholder until coordinated production preparation.
- `previews.vars.PUBLIC_DEPLOY_ENV` is `preview`. The build also uses the preview
  environment so Astro's compiled public settings and Sentry agree.
- Branches share that preview namespace. Native Previews do **not** automatically
  clone KV per branch. Production KV is not used.
- The workflow uses `wrangler preview --name <safe-branch-name> --ignore-base-config`.
  It does not use `versions upload`, `--env preview`, or deploy the parent Worker.
- Compute the existing hashed/DNS-safe branch name before building and pass its
  URL through `PUBLIC_PREVIEW_ORIGIN`. The generated-config guard verifies the
  parent name and exact Preview binding/variable settings before upload. Unknown
  Preview binding/config additions fail closed for review.
- The parent's preview URLs were disabled. Enabled **only** `previews_enabled`
  through its subdomain API while keeping production `enabled: false`. Source
  config now explicitly has `preview_urls: true` and `workers_dev: false`.
- The temporary manual dispatch gate remains until production cutover; automatic
  production deployment is still disabled. No extra Git build integration was added.

`env.preview` was the old separately deployed QA Worker, not this new feature.
It is removed from source configuration after successful native verification.

## First hosted deployment

[Run 36264560856](https://github.com/zemccartney/nba-surprise-teams/actions/runs/36264560856)
deployed commit `330aa08bf5be7643ebfba7f75793abd246345da5`:
**202 tests**, 73 maps removed after uploads, 376-file artifact audit.

- Parent: `nba-surprise-teams`
- Preview: `workers-cutover-63d134855ea4`
- Preview ID: `d80bbba63f0e435fb8ddb8cb188a46df`
- Stable URL: **https://workers-cutover-63d134855ea4-nba-surprise-teams.zemccartney.workers.dev**
- Deployment: `93591a70-7738-470f-a390-e832eece7997`
- Immutable deployment URL: https://93591a70-nba-surprise-teams.zemccartney.workers.dev

API readback of the deployed Preview confirms exactly:

- `ASSETS`: native assets binding
- `GAMES_KV`: preview namespace ID above
- `PUBLIC_DEPLOY_ENV`: `preview`

Before/after comparison confirms the parent's **production deployment list,
code-module hashes and bindings are unchanged**. Its production version remains
`9a5b6c59-b46b-4c40-b782-d4d5d1cfb5e1`, with no production bindings. The retained
Pages production deployment remains `c005800c-5863-4495-b64a-fb5c36a78014`.
Only the preview-URL enablement flag changed on the parent.

## Hosted checks

- Full chart application harness passes at 1440/390/320px.
- Tooltip safety passes; all six blocked/stalled/delayed-font cases pass.
- Home, Stats, archive, About and archived team return 200; unknown route 404.
- `X-Robots-Tag: noindex` is present on the checked Preview responses.
- Latest preseason action returns the normal empty games payload (200);
  historical season returns 400 and unknown season 404.
- Browser Sentry release matches the build SHA; no page errors observed.
- No new diagnostic routes, secrets or fake data were needed. All browser
  sessions closed. This is deployed-binding readback and current-season behavior,
  not a replay of post-opening-night refresh/stale-cache paths.

The old `nbastt-preview` Worker was retained during verification. Retirement and
final configuration deployment results will be recorded after completion. Its
KV namespace must remain: the native branch Preview intentionally reuses it.

## Production remains separate

Pages and both production custom domains are untouched. The parent Worker's
existing production code is untouched. A production deployment still needs
approved production KV/configuration and the agreed domain/rollback sequence.
Native Preview success does not authorize or perform that cutover.
