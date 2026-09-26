# Astro middleware alongside the Worker wrapper — 2026-09-26

## Corrected conclusion

The user questioned excluding Astro's own middleware. Controlled local workerd
checks show it works with our pinned SDK/runtime and adds useful coverage:

| Check                              | Worker wrapper only                    | Wrapper + SDK Astro middleware                                     |
| ---------------------------------- | -------------------------------------- | ------------------------------------------------------------------ |
| Explicit capture                   | One error                              | One error                                                          |
| Endpoint throws, Astro returns 500 | No error event                         | One error, `auto.middleware.astro`, handled false                  |
| Sampled HTTP span                  | `auto.http.cloudflare`, no Astro route | Same request span enriched with `auto.http.astro` and `http.route` |
| Concurrent request tags            | Not tested in control                  | Two distinct tags, each on exactly its own error                   |

The successful explicit capture in the previous Worker-entry experiment did not
prove automatic framework-error coverage. Excluding the middleware solely because
it imports `@sentry/node` was overly conservative. These checks validate the used
middleware path, **not every Node SDK API** on Cloudflare.

## Why integration server initialization stays disabled

A direct invocation of the installed integration's `astro:config:setup` hook with
server initialization enabled emitted:

```js
injectScript("page-ssr", 'import ".../sentry.server.config.ts";');
```

A real isolated build with that setting failed during prerendering:

```text
Only URLs with a scheme in: file, data, and node are supported by the default
ESM loader. Received protocol 'cloudflare:'
```

Our adapter explicitly uses **Node prerendering** for the SQLite build boundary;
the Cloudflare adapter defaults to workerd prerendering. This distinction matters:
we must not inject the Worker entry and its Cloudflare imports into Node page
initialization. This is verified for this app, not a universal rule for every
Cloudflare/Astro project. Two new SDK-hook contract tests cover the import and
its absence when server initialization is disabled.

`enabled.server: false` prevents integration-owned initialization/registration;
it does not disable the Cloudflare SDK or an explicitly imported Astro middleware.
The redundant `autoInstrumentation.requestHandler: false` option is removed.

## Minimal framework layer

`src/middleware.ts` re-exports the SDK's `onRequest` from the public
`@sentry/astro/middleware` subpath, the same entrypoint its integration registers.
There is no application-owned request wrapper, SDK initialization or scope logic.
`withSentry` still initializes once at the Worker boundary; the Astro middleware
adds framework route/trace context and catches exceptions before Astro converts
them into responses.

Two pinned-package details were verified rather than assumed:

- The SDK still skips automatic middleware registration for `output: static`,
  even though modern Astro supports on-demand routes in that mode. Explicit
  registration is therefore needed in this app.
- Importing `handleRequest` from the package root fails in the Worker build:
  Cloudflare conditions select `index.client.js`, which does not export it.
  The public middleware subpath works. Its package `types` target mistakenly names
  `index.types.d.ts`; the shipped declaration is `index.d.ts` and declares
  `onRequest: MiddlewareResponseHandler`. A narrow `@ts-expect-error` documents
  this packaging defect; it must be removed when fixed (unused suppression fails
  typechecking). No dependency changes or runtime patches were made.

## Local evidence

An isolated archive of the repository reused existing dependencies without
installing/upgrading them. Local workerd used the configured compatibility date;
all envelopes went to an HTTP collector bound to **127.0.0.1**, not Sentry.
The local-only diagnostic used explicit capture and an uncaught endpoint throw.
Sampling was 1 only in this experiment so route/span assertions were observable;
application sampling remains 0.1. The concurrent check interleaved slow/fast
requests and asserted separate error tags. All test servers/browser sessions
were stopped. No production storage or public routes were involved.

Local temporary evidence: `/tmp/nbastt-with-astro-middleware.json`,
`/tmp/nbastt-without-astro-middleware.json`,
`/tmp/nbastt-astro-middleware-runtime-result.json`,
`/tmp/nbastt-server-init-enabled-build.log`, and
`/tmp/nbastt-astro-middleware-root-import-build.log`.

## Hosted preview check

[Run 36259672771](https://github.com/zemccartney/nba-surprise-teams/actions/runs/36259672771)
deployed diagnostic commit `902bfb7`, Worker version
`7099b9b3-58d7-4806-a115-51ae7a7a4aad`: **205 tests**, 75 maps cleaned after uploads,
379-file artifact audit. Worker upload: 1224.44 KiB raw / 311.40 KiB gzip.
Chart application checks passed at 1440/390/320px.

A preview-only authenticated temporary POST endpoint deliberately **threw**, with
no `captureException` call. Missing/wrong credentials returned 404. One authorized
call returned the expected 500 at 2026-09-26T17:39:00Z, with marker:

`NBASTT Astro middleware smoke 6376e95f4dd00b98b4cba422`

A request-isolation event processor removes headers/body before transmission.
The token existed only in memory and the exact preview Worker secret, which was
deleted immediately afterward and absence verified. No KV operations were used.
The 500 alone does not prove ingestion: await the received event JSON to confirm
`auto.middleware.astro`, release, original frames and no duplicate error event.
The temporary endpoint and six safety tests are removed in the cleanup commit;
its deployment result will be recorded after completion.

## Prior Worker-entry event is verified

The user-exported event `2d342e0ee0454740b1576e829f9bff41` confirms environment
`preview`, release `12fe6758170a12cfb4ebfd765a5235cad40f7a90`, all seven frames
symbolicated and no processing errors. The application frame resolves to
`src/pages/cutover/sourcemaps.ts:42`; the Cloudflare async-context frames also map.
This completes the prior explicit-capture check, independently of the new
middleware's automatic-capture test.
