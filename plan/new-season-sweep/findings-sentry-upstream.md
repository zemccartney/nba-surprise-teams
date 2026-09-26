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

## 1. Highest priority: premature map deletion across environment uploads

**Likely first destination:** [getsentry/sentry-javascript](https://github.com/getsentry/sentry-javascript),
package `@sentry/astro`, which supplies the upload glob and default cleanup policy.
Cross-link or transfer to
[getsentry/sentry-javascript-bundler-plugins](https://github.com/getsentry/sentry-javascript-bundler-plugins)
if upload coordination belongs there. Backend artifact selection may require
Sentry-maintainer investigation; do not assume all ownership is in the uploader.

Suggested title: **Astro multi-environment builds re-upload server scripts without their source maps after early cleanup**.

### Impact and observed sequence

This is more than redundant upload traffic: a hosted error had correct debug IDs
but missing source maps despite successful build/upload logs. Prioritize this
report over the documentation and typing findings below.

1. The installed integration registers its upload plugin across Vite build passes
   with a shared `dist/**/*` scan.
2. One pass uploads server JavaScript and its matching maps successfully.
3. Default per-upload cleanup deletes those maps from disk.
4. A later pass scans the complete output again, uploading the same server debug
   IDs **without their maps**, alongside newer output.
5. The received server event reports `missing_sourcemap` and unresolved frames.

The original diagnostic log shows the two uploads approximately two seconds apart.
For example, debug ID `a5afabd5-126b-44ff-b1f3-c5ba7c4f779e` appears with its map
in the first upload and with `no sourcemap found` in the second. All five modules
in the exported failing event had valid debug IDs but missing-map errors.

### Controlled correction and verification

We disabled per-upload deletion with `sourcemaps.filesToDeleteAfterUpload: []`,
then deleted maps once all uploads finished, before sealing/deploying artifacts.
The new diagnostic module appeared **with its map in both uploads**. A fresh
received event resolved every frame, including the original TypeScript throw,
using the map from the second upload. Runtime release was still null in both
tests, so fixing release tagging was not required for that successful resolution.
Local map inspection also verified nonempty sources/content/mappings and correct
position resolution. See [full lifecycle evidence](sentry-source-maps.md).

This verifies the faulty upload sequence and the working lifecycle correction.
It does **not** by itself establish the backend's complete bundle-selection rules
or prove that a later upload physically deletes previously uploaded maps. Describe
later incomplete artifacts masking earlier complete artifacts as the suspected
backend mechanism, not a confirmed universal overwrite rule.

### Reproduction to prepare for upstream

- Start with the baseline versions above, the Cloudflare adapter, a browser script
  and a small dynamic server endpoint. Use a disposable Sentry project for hosted
  verification; no application database or production bindings are necessary.
- Keep default upload/cleanup behavior for the failing control. Record per-pass
  artifact listings showing repeated debug IDs, map presence and cleanup timing.
- Trigger an error only after upload processing/deployment. Export sanitized
  processing errors, relevant debug metadata and frame-resolution fields.
- Repeat with delayed cleanup; verify the deployed output contains no `.map`
  assets and capture a **fresh** error. Do not rely on retroactive reprocessing.
- Check current SDK/adapter versions in isolation and identify the version/output
  layout boundary if possible. Do not claim this affects every Astro deployment.

### Related reports and follow-up

[Bundler issue #626](https://github.com/getsentry/sentry-javascript-bundler-plugins/issues/626)
explicitly describes repeated uploads in multi-stage builds, primarily as a
performance problem. A maintainer suggests a single post-build CLI upload as an
alternative. Its closed status does not establish that this source-map-loss case
is fixed. Our searches have not identified an exact confirmed report of this
Astro/Cloudflare failure; that is not evidence that nobody has encountered it.

Different output layouts, deletion settings or upload ordering could avoid the
problem. That is a plausible reason for differing reports, not a verified account
of upstream test coverage or when this behavior first shipped.

- [ ] Search current SDK/bundler issues and inspect fixes linked to #626.
- [ ] Reproduce the incomplete second upload with a minimal multi-environment app.
- [ ] Verify fresh-event failure/success in a disposable Sentry project.
- [ ] File the correctness bug first, attaching sanitized before/after evidence.
- [ ] Link the report here; remove our workaround only after an upstream fix is
      adopted and the same hosted regression check passes.

## 2. Documentation gap: custom Worker entry imported into Node prerendering

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

## 3. Integration gap: automatic middleware misses static output with dynamic routes

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
from finding 2: even without disabling server initialization, that output-mode
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

## 4. Packaging bug: middleware export points to a missing declaration file

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

- File the source-map lifecycle correctness issue first. Keep it, the documentation,
  output-mode registration and declaration packaging reports separate unless
  maintainers request consolidation; cross-link related reports.
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
- Preserve the distinction between directly observed incomplete uploads and the
  backend-selection hypothesis when filing the first finding.
