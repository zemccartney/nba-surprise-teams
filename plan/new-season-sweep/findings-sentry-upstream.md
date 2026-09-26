# Sentry/Astro/Cloudflare upstream findings

Status: **TODO — revisit and file upstream issues or documentation PRs.**
These follow-ups are not production cutover blockers. No upstream reports have
been filed by this work.

## Verified baseline

- `@sentry/astro` and `@sentry/cloudflare`: **10.27.0**
- Astro **7.3.1**, `@astrojs/cloudflare` **14.3.0**, Vite **8.2.2**
- Wrangler **4.129.0**, compatibility date **2026-09-10**
- Default Astro `output: "static"`, with on-demand endpoints/actions/islands
- Explicit `prerenderEnvironment: "node"` for our SQLite build boundary
- Custom Worker entry wrapping the adapter handler with `withSentry`

These findings concern the installed versions, not necessarily current upstream
HEAD or the newest release. Reproduce against current versions in an isolated
fixture before filing; do not upgrade the application simply to prepare reports.

Detailed evidence and historical deployment references:

- [Astro middleware experiment](sentry-astro-middleware.md)
- [Worker entry migration](sentry-worker-entry.md)
- [Source-map lifecycle investigation](sentry-source-maps.md)
- Permanent hook-contract tests: `tests/sentry-integration.test.ts`

## 1. Documentation gap: custom Worker entry imported into Node prerendering

**Likely destination:** [getsentry/sentry-docs](https://github.com/getsentry/sentry-docs),
covering the [Cloudflare/Astro recipe](https://docs.sentry.io/platforms/javascript/guides/cloudflare/frameworks/astro/#configure-custom-entry-point).
If changing integration behavior is preferable, cross-reference an issue in
[getsentry/sentry-javascript](https://github.com/getsentry/sentry-javascript).

Suggested title: **Document Astro Node prerendering with a custom Cloudflare Sentry entry point**.

### Reproduction

Use a minimal Astro project with the Cloudflare adapter and at least one
prerendered page; no SQLite database or NBA application data is needed.

1. Set `cloudflare({ prerenderEnvironment: "node" })`.
2. Point Wrangler `main` at `./sentry.server.config.ts`.
3. In that file, follow the Cloudflare recipe: import the adapter's Worker handler
   and export `Sentry.withSentry(optionsCallback, handler)` from `@sentry/cloudflare`.
4. Enable the Astro integration's server side (the default). Uploads can be
   disabled; no real DSN or upload token is required for this build reproduction.
5. Build a prerendered page.

The pinned integration discovers `sentry.server.config.ts` and calls
`injectScript("page-ssr", 'import ".../sentry.server.config.ts";')` independently
of middleware registration. The Worker entry's dependency graph therefore enters
Node prerendering, which fails with:

```text
Only URLs with a scheme in: file, data, and node are supported by the default
ESM loader. Received protocol 'cloudflare:'
```

Both the emitted initialization import and the actual build failure were verified.
Do not attribute the unsupported import specifically to Sentry's dependencies:
the custom entry also imports Astro's Cloudflare handler.

### Desired outcome and current mitigation

Document the Node-prerender variation and which layer owns initialization. The
adapter defaults to workerd prerendering; this recipe gap concerns its supported
Node alternative, not proof that the default recipe is universally broken.

We use `enabled: { client: true, server: false }` on the Astro integration while
`withSentry` initializes the Worker. Browser initialization and map uploads remain
integration-owned. The setting does not globally disable server error reporting.

- [ ] Recheck current docs/SDK and search for an existing report.
- [ ] Publish a minimal credential-free reproduction.
- [ ] File a docs issue/PR; link any implementation issue if appropriate.

## 2. Integration gap: automatic middleware misses static output with dynamic routes

**Likely destination:** [getsentry/sentry-javascript](https://github.com/getsentry/sentry-javascript),
package `@sentry/astro`.

Suggested title: **Astro request middleware is not registered for static output with on-demand routes**.

### Reproduction and evidence

The installed integration only adds middleware when:

```js
config.output === "server" || config.output === "hybrid";
```

Modern Astro's default static output can contain on-demand routes, while the old
hybrid setting has been removed. A direct hook test with `output: "static"` and
server initialization enabled confirms no `addMiddleware` call. This is distinct
from finding 1: even without disabling server initialization, that output-mode
condition skips registration.

Use a minimal static-output app with a `prerender = false` endpoint. Compare
integration registration with an otherwise equivalent server-output fixture.
Avoid conflating an explicitly disabled server SDK with the independent static
output condition; investigate intended upstream support before calling this a
regression or assigning a version boundary.

Our local workerd A/B checks demonstrate why the middleware matters:

- The outer Worker wrapper captures explicit `captureException` events.
- If an endpoint throws and Astro converts the exception to a 500 response, the
  outer wrapper alone did not receive an exception to capture.
- SDK Astro middleware captured it once as `auto.middleware.astro`, handled false,
  and enriched the existing request span with the Astro route.
- Concurrent requests retained independent tags.

The hosted follow-up confirms automatic capture, matching release, original
source frames and transaction `POST /cutover/middleware` with no processing
errors. One hosted event export does not prove absence of all duplicate events;
exact-once capture was checked in the local collector.

### Desired outcome and current mitigation

Clarify supported static/on-demand configurations and register middleware where
appropriate, while maintaining correct prerender behavior. We explicitly export
the SDK's `onRequest` from `@sentry/astro/middleware` in `src/middleware.ts`.
That is framework enrichment/error capture, not a second application-owned SDK
initializer or request wrapper.

- [ ] Reproduce registration on the newest compatible SDK in isolation.
- [ ] Search existing static-output/server-island instrumentation reports.
- [ ] File or extend an SDK issue with a small endpoint-based reproduction.

## 3. Packaging bug: middleware export points to a missing declaration file

**Likely destination:** [getsentry/sentry-javascript](https://github.com/getsentry/sentry-javascript),
package `@sentry/astro`.

Suggested title: **@sentry/astro middleware types export references missing index.types.d.ts**.

### Reproduction and evidence

In the published 10.27.0 package, `exports["./middleware"].types` points to:

```text
./build/types/integration/middleware/index.types.d.ts
```

That file is absent. The shipped declaration is:

```text
./build/types/integration/middleware/index.d.ts
```

It declares `onRequest: MiddlewareResponseHandler`. The JavaScript implementation
and its public export exist and work. In a strict TypeScript/Astro project:

```ts
export { onRequest } from "@sentry/astro/middleware";
```

fails typechecking with TS7016 (no declaration file). Verify the actual published
tarball, not only repository source, when reproducing this on newer versions.

Importing `handleRequest` from the package root is not an equivalent workaround
for our Worker build: its Cloudflare export conditions select `index.client.js`,
which has no `handleRequest` export. This was reproduced as a build-time missing
export error. Include that context only if useful; it does not establish a
separate packaging bug in the intended browser export.

### Desired outcome and current mitigation

Correct the public declaration target or publish the referenced file, with a
package-export/type-resolution regression test. We currently use one documented
`@ts-expect-error` on the re-export. Remove it when the declaration is fixed;
unused suppression should fail typechecking rather than silently lingering.

- [ ] Inspect a current published package and search existing issues/PRs.
- [ ] File a small packaging issue or fix with a typecheck reproduction.
- [ ] After adopting a fixed release, remove the suppression and rerun workerd checks.

## Filing checklist and related work

- Keep documentation, output-mode registration and declaration packaging reports
  separate unless maintainers request consolidation; cross-link related reports.
- Confirm actual repository issue templates and ownership before submitting.
  There is no demonstrated Astro adapter defect here that independently warrants
  an Astro issue; involve Astro maintainers if a minimal repro identifies one.
- Include exact versions, relevant config, expected/actual behavior and sanitized
  logs. Use fake DSNs. Do not attach tokens, raw production event JSON, account
  configuration, private request headers or the application's database.
- Record issue/PR URLs here and in the existing Sentry status item once filed.
- Related [SDK issue #21901](https://github.com/getsentry/sentry-javascript/issues/21901)
  discusses newer adapters' automatic Worker wrapping. Do not claim it is the same
  implementation or failure as these pinned-version findings.
- Duplicate source-map uploads/deletion are a separate investigated lifecycle
  problem; see the source-map notes and
  [bundler issue #626](https://github.com/getsentry/sentry-javascript-bundler-plugins/issues/626).
  Do not fold the earlier bundle-selection hypothesis into these proven findings.
