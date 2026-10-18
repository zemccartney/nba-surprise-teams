# Cloudflare CLI migration — implementation and verification

## Approved scope

Migrate this Astro project from Wrangler tooling to cf on
`chore/cloudflare-cli-migration`. Owner approved Astro 7.4 and the necessary beta
adapter/tooling, including release-age exceptions. Add build `--timings`.
Preserve rendering, images, Sentry, SQL boundaries, production bindings/domains
and isolated preview KV. No push/deploy without approval.

## Implementation

- [x] Astro 7.4.0 and adapter 15.0.0-beta.1, both exact pins; cf 1.0.0-beta.18
      and the adapter's matching Vite plugin 2.0.0-beta.sha-52b0dc0e9.
- [x] Direct Vite updated from 8.3.2 to 8.3.4 to match Astro's resolved Vite types.
- [x] Exact release-age exclusions for Astro/cf and their release-coupled
      dependencies; provenance and other supply-chain policies retained.
- [x] Generated config consolidated into `cloudflare.config.ts`; `ctx.isPreview`
      selects preview KV and **no production domains**. Removed Wrangler config
      and direct dependency. Production Worker name, KV and both domains unchanged.
- [x] CLI tasks use cf. Local state is `.cloudflare/state`; seed task explicitly
      uses that path, not cf's user-global default. Startup resets only that state,
      leaving generated types/build output alone. Old Wrangler state is not migrated.
- [x] Build Output, audits, SVG optimization and source-map cleanup target
      `.cloudflare/output/v0/workers/default/{assets,bundle}`. The hash inventory
      remains outside deployable directories, alongside worker.config.json.
- [x] CI builds preview with `CLOUDFLARE_PREVIEW_BUILD=true`, inspects generated
      build context/bindings/domains, then uses cf's `--prebuilt --mode production`.
      Only exact main selects production. Publishing still requires approval here.
- [x] Existing Vitest runtime-plugin filter also excludes the newly introduced
      top-level `vite-plugin-cloudflare`; unit tests remain Node-only.
- [x] Deployment target, build-output audit, SVG-output and configuration tests
      updated against real new formats; failure observed before fixes.
- [x] Updated maintenance/development/data documentation.

## Actual roadblock: Astro #18387

Cold-start local dev returned 200 for its first island page, then 500 for the
other page (`Could not find server component name`). Both Home→Showdown and
Showdown→Home reproduced this. Built output worked.

This matches [Astro #18387](https://github.com/withastro/astro/issues/18387),
introduced in 7.3.6 and also reproduced upstream with the Node adapter. It is
separate from both cf migration and the NBA CDN 403. The CSS walk consumes the
manifest invalidation before the module runner sees it.

A Node-prerender-only Vite warmup was tried and removed: it passed one request
order but not the reverse. The branch instead backports the two runtime JS
changes from pending [PR #18399](https://github.com/withastro/astro/pull/18399)
using a checked-in, version-specific pnpm patch. See [patch rationale and
removal instructions](../patches/README.md). No unreviewed experimental package
URL or silent node_modules edit is used.

Ruling: retain the minimal upstream dev-only patch for this migration candidate,
rather than a flaky warmup or an application-level dependency workaround. Cost:
one explicit temporary dependency patch until upstream publishes the fix.

## Verification (2026-10-17)

- `pnpm install --frozen-lockfile`: passes, including patch application policy.
- Full production and preview `pnpm run build`: both pass, including types
  (zero errors/warnings), formatting, lint, workflow lint, **274 tests / 36 files**,
  build timings, and final audit of **423 artifacts**.
- Actual production/preview Build Output passes its respective target guard.
- `cf deploy --prebuilt --mode production --dry-run`: accepted production
  output without uploading. `cf deploy --prebuilt --dry-run` correctly refused
  preview-marked output and directed us to `cf previews deploy`.
- New `pnpm run test:dev-islands`: patched cold starts pass both request orders.
  It is separate from Vitest and must not run alongside dev/build/tests.
- Browser checks on dev and built local preview: Home, 2026 season, 2026
  Showdown and 2025 Showdown render; eager-loading all images confirms SVG/logo
  responses. Dev also accepts `/2026` without the slash. No page errors observed
  in the final dev check. Showdown used the previously downloaded KV snapshot;
  these checks do not establish working local NBA access.
- cf local KV put/read path works with `.cloudflare/state` and the base namespace
  ID. No remote KV writes or deletions were performed.
- Existing audit policy reports **14 production dependency vulnerabilities**
  (9 moderate, 5 high), none critical; it passes its existing critical-only gate.
  This migration does not change that policy or claim the advisories are resolved.

## Remaining before production promotion

- Approved branch Preview publication and Linux CI checks have passed, including
  hosted resource isolation, URL metadata, fresh NBA fetching and Sentry uploads.
- Owner exports confirm both Sentry events received and symbolicated via debug
  IDs with matching release/environment and no reported processing errors.
  Worker maps exactly to the original source line; browser maps to the correct
  extracted Astro script statement, but not its original `.astro` line number.
- Diagnostic cleanup and final hosted rechecks passed. See the
  [hosted verification record](cf-hosted-verification.md) for event IDs and
  evidence. Consider the browser line-number limitation and explicit Astro patch
  tradeoff before approving merge/production promotion.

## Requested follow-up pass

- [x] Latest-season Showdown returns to Home; archived seasons keep detail links.
- [x] Integrations read final Vite output paths; standalone commands share cf layout.
- [x] Put Astro patch monitoring at the top of follow-ups.
- [x] Trace the Docker probe and verify static prerendering; document hosted checks.
- [x] Run tests, types, production/preview builds and output guards. No deployment.
      Both final builds pass: **279 tests / 37 files**, zero type errors/warnings,
      343 prerendered pages, 423 audited artifacts. Both cold-start island orders
      also pass. Generated HTML confirms 2026 Showdown links home while 2025
      Showdown links to its season detail. Self-review only; no subagent available.

### Output path follow-up

`scripts/build-output.ts` retains the resolved Vite configuration and reads its
client/SSR paths only when build hooks run, after Cloudflare's configResolved
mutations. SVG optimization consumes the actual client directory; cleanup and
auditing verify the expected sibling assets/bundle layout before touching files.
Standalone deployment guards/audit share the cf v0 layout in that same module.

Sentry's Astro integration independently defaults to `dist/**/*`, so it also
needed an explicit upload glob targeting the shared cf worker directory.
Its string-only glob setting is evaluated before Vite resolution. All environments
scan both assets and bundle, with map deletion still delayed until all uploads
finish. Configuration coverage passes; real upload/mapping remains a hosted gate.

### Docker diagnostic

An instrumented local build traced the stderr line to the beta Cloudflare Vite
plugin's `buildAndWriteContainerOutput → cleanupPreviousBuildOutputImageTags`.
It invokes `docker image ls --filter reference=cloudflare-build/<project-hash>/*`
even with no configured containers. The listing failure is caught, but Docker's
stderr is printed. This is upstream container cleanup, not containerized Astro
rendering and not a Docker requirement for this project. No extra dependency
patch or stderr suppression was added.

### Static versus server output

The actual build logs distinguish `output: "static"` from `mode: "server"`.
Astro's adapter registration selects a server build; the timings footer labels
that build mode as output. The installed adapter does not change the configured
static prerender default. Both contexts emit **343 HTML pages** (including Home,
season details, and Showdown) alongside the runtime Worker for islands/actions.
The Cloudflare framework guide's blanket claim about forcing `output: server`
does not describe this installed Astro 7.4 / adapter 15 configuration.

### Hosted preview / Sentry checklist (approved for this branch)

Owner approved this hosted verification pass. Initial commit `74a4334` was pushed.
CI run `39097109237` stopped before deployment: the existing SQLite CLI test
completed its assertions in 5.138 seconds but exceeded Vitest's five-second limit.
Ruling: give only that subprocess-heavy test 15 seconds; preserve all assertions
and the global timeout. No application or deployment gate is bypassed.

1. Commit the reviewed changes, then explicitly approve a branch push. Any branch
   push triggers CI deployment; keep this off main. No production promotion yet.
2. Let Linux CI install the patched frozen lockfile, build with the preview
   context and Sentry secrets, pass the isolation guard, upload source maps,
   and deploy the inspected prebuilt output as a native branch Preview.
3. Inspect the actual hosted Preview bindings/domain configuration: preview KV
   only, no production domains. Check preview canonical URLs, static pages,
   images, latest/archived Showdown back links, and server-island loading.
4. Verify a genuinely fresh NBA schedule fetch through the deployed loader, not
   merely a previously seeded cache hit. Do not delete production KV keys.
   If the UI cannot exercise a fresh fetch, agree on a scoped preview-only probe.
5. Send clearly labelled browser and Worker test errors on Preview. Use a bundled
   application frame for source-map proof; a browser-console throw alone only
   proves ingestion. Check event environment/release/debug IDs, original source
   file/line mapping, and absence of missing-sourcemap processing errors.
   A deliberate Worker error may need a temporary authenticated preview-only
   probe, following the existing hosted-cutover controls.
6. Remove any temporary probe/secret/keys, republish Preview, verify cleanup,
   and record event IDs and CI/deployment evidence. Only then discuss approval
   for production promotion; successful uploads alone are not mapping proof.

## Hosted execution log

- `e95801e` / CI `39097244385`: Linux install, 279 tests, build, two Sentry
  source-map uploads and delayed deletion of 83 maps all pass. Native Preview
  deployed as `a8c0a450-7a74-4407-a441-447cc0ba94a7`.
- API inspection confirms only preview KV `6a0d30705c634691873dd1dd122969e3`
  and `PUBLIC_DEPLOY_ENV=preview`; Preview exposes only workers.dev URLs.
  Production remains on `749faac0-00e2-4628-9b8d-4ccf2f48a8d5`, deployed before
  this verification pass.
- Hosted Chromium: Home, 2026 detail, 2026/2025 Showdown, all eager images,
  islands and Home→Showdown→Back→Home pass without browser/HTTP errors.
  The site's URL metadata uses `og:url`, not a canonical link element; all
  four URLs point at this Preview. No new SEO behavior was introduced.
- Temporary probe: two non-prerendered routes, preview-binding gate, two-hour
  expiry and SHA-256 validation of a random 256-bit bearer. Only the hash is
  committed; the token stays in a mode-0600 local temporary file. No extra
  Cloudflare secret/binding or diagnostic KV key is needed. Seven gate tests
  cover correct/wrong/missing tokens, non-preview environments and expiry.
  Fresh NBA verification calls the real loader directly, bypassing KV without
  clearing any season cache. Browser and Worker errors originate in bundled
  source; Worker event request data is stripped. Remove all probe code/tests
  and the local token after capture.
- Sentry event read credentials are unavailable locally. Successful uploads and
  ingestion will not be claimed as source-mapping proof; request exported events
  from the owner if dashboard/API inspection cannot be performed.

## Review

Self-review only (no subagent tool available). Confirmed generated preview uses
only test KV and no domains; both build contexts are checked before publishing;
CLI uses prebuilt output and explicit production mode; SQL stays Node-only;
state resets do not delete builds/types; temporary warmup removed; only intended
Astro runtime files remain in the patch. Hosted verification remains separate.
