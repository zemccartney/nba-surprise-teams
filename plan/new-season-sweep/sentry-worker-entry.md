# Sentry Worker entry — 2026-09-25

## Decision and implementation

The user approved replacing the manual request-wrapper middleware with the
[documented Cloudflare/Astro custom entry point](https://docs.sentry.io/platforms/javascript/guides/cloudflare/frameworks/astro/#configure-custom-entry-point).

- `wrangler.jsonc` now selects `sentry.server.config.ts`.
- That file wraps `@astrojs/cloudflare/entrypoints/server` with the pinned
  `@sentry/cloudflare` SDK's `withSentry<Env>`. The SDK receives the real Worker
  execution context, initializes per request and installs its async-context strategy.
- Removed `src/middleware.ts`, including its prerender guard and type suppression.
  Worker entry code is no longer injected into Node prerender initialization.
- Astro integration uses `enabled: { client: true, server: false }` and explicitly
  disables `autoInstrumentation.requestHandler`. It still initializes the browser
  and uploads maps for both outputs. Keep the upload options supported by the
  pinned SDK; moving auth/project to top-level worked but elicited its legacy
  runtime-option warning, so those fields stay under `sourceMapsUploadOptions`.
- Runtime DSN/environment belong to the respective client and Worker init files,
  not the Astro integration. No dependency upgrades or sampling-rate changes.
- The Worker reads the plugin-injected `globalThis.SENTRY_RELEASE.id` per request
  and passes it explicitly as `release`. This is the same Git SHA used for browser
  events and uploads, not a different Cloudflare deployment UUID. Missing local
  DSN/release values are omitted. No new version-metadata binding is required.
- The verified delayed source-map cleanup integration and artifact seal remain.

Two permanent tests cover wrapping the adapter once, deferred release lookup,
existing environment/DSN/sample rate and explicit exclusion of the second server
initialization/instrumentation path. Local full build/audits passed.

## Why the old middleware existed

Git history: `01cfb17` (2025-01-20) replaced Toucan with `wrapRequestHandler`;
`ef36dfd` eight minutes later externalized `node:async_hooks` for Sentry/Cloudflare.
This supports the user's recollection of an Astro 5/Cloudflare compatibility
workaround, without proving the exact historic failure.

The pinned Astro SDK only adds automatic request middleware for `output: server`
or the old `hybrid` mode. This app uses default `static` with runtime actions and
islands, so it was not automatically adding that middleware. It does not detect
an existing user middleware and opt out. Its independent server initialization
injection is now explicitly disabled too.

## Preview verification

[Diagnostic run 36135934908](https://github.com/zemccartney/nba-surprise-teams/actions/runs/36135934908)
deployed `12fe6758170a12cfb4ebfd765a5235cad40f7a90` after **202 tests**, a 376-file
artifact audit and removal of 71 maps after uploads. Worker version before secret
operations: `f6e56024-46d5-48ef-805a-8e83c9682e18`.

A temporary authenticated preview-only route captured and flushed one event:

- Marker: `NBASTT Worker entry smoke 2026-09-25T12:38:55.282Z`
- Event: `2d342e0ee0454740b1576e829f9bff41`
- Active SDK environment: `preview`
- Active SDK release: `12fe6758170a12cfb4ebfd765a5235cad40f7a90`
- Expected original source: `src/pages/cutover/sourcemaps.ts` from that commit

A real Chrome session on hosted Stats reported the **same browser release**.
The full hosted chart application harness passed at 1440/390/320px, including
interaction, tooltip settlement and layout bounds. All browser sessions closed.

Missing/wrong credentials returned 404 before the probe. The token lived only in
memory and in the exact preview Worker secret; headers/body were removed from
the event, and no KV operations were used. The secret was deleted immediately
after the event and absence verified.

[Cleanup run 36136581744](https://github.com/zemccartney/nba-surprise-teams/actions/runs/36136581744)
deployed `2ab844a2082386a611de2a2e755da62d2a505d5a` as Worker version
`bbd21a27-21d1-49ba-a00c-9b04ff68913a`. **197 tests**, 70 maps removed and a
374-file artifact audit passed. The temporary route and five temporary tests
are removed. The earlier additional-runtime-options warnings are absent.

Post-deploy checks confirm normal 404 at the probe URL, absent secret, preview KV
isolation, unchanged Pages production, main pages returning 200 and the empty
preseason action returning 200. A browser Home check has no page errors or HTTP
5xx responses and reports the cleanup build SHA. Personal-file hashes are intact.

The response verifies runtime options and flushing, **not Sentry's received event**.
User-exported event JSON is still needed to confirm release, source mapping and
processing errors after this entry-point change. This intentional capture does
not establish capture of every framework-handled 500 response.

Production deployment/bindings, KV, Pages and domains remain untouched. Dev-only
Sentry enablement and the historical cross-request-promise warning remain separate
follow-ups; do not assume the old middleware's behavior is unchanged after moving
initialization to the Worker boundary.
