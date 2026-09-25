# Sentry source-map lifecycle — 2026-09-25

## Evidence and scope

The user exported server event `c0867439996b40d79b8f11a26ec8148c`. It contains
correct debug IDs but `missing_sourcemap` errors for all five server modules;
frames have `symbolicated: false`. Its release is **null**, not `f351486`:
that commit identifies the diagnostic build, not a runtime release tag.

The diagnostic build uploaded the matching server scripts/maps, then uploaded
those same debug IDs again without maps approximately two seconds later.
The pinned Astro integration registers the Sentry Vite plugin with a shared
`dist/**/*` scan and automatic per-upload map deletion. This proves duplicate
uploads and premature deletion, but not which bundle Sentry's backend selected.

A local hidden-map build produced 71 maps (60 server, 11 client), all with
nonempty sources/mappings and no missing source-content entries. Resolving the
NBA error statement in the server chunk correctly reached
`src/loaders/live/index.ts:59`. A browser chart position also resolved to the
expected TanStack source statement. This checks map generation, not Sentry's
injected/uploaded map processing.

## Narrow change

- `astro.config.mjs`: explicitly retain maps through Sentry uploads with
  `sourcemaps.filesToDeleteAfterUpload: []`.
- `scripts/clean-build-sourcemaps.ts`: an Astro integration deletes maps at
  `astro:build:done`, after all Vite uploads and **before** tracker-data seals the
  artifact inventory. Resolve the complete output from `config.outDir`, not the
  build-done hook's client-only directory.
- Three permanent tests cover server/client cleanup, unchanged scripts,
  directory-symlink isolation and integration/audit ordering.
- No dependency upgrade, runtime release change, dev-Sentry rework, production
  configuration change or retained public diagnostic endpoint is intended.

The first attempt cleaned after `astro build`, too late for our already-sealed
artifact inventory. CI run `36076203549` correctly failed closed with
`Missing audited artifacts`; **nothing deployed**. Moving cleanup ahead of the
seal preserved the strict audit. A local hidden-map build then removed 72 maps
and passed the 376-file audit, with no maps remaining.

## Hosted preview experiment

[Run 36076478095](https://github.com/zemccartney/nba-surprise-teams/actions/runs/36076478095)
deployed diagnostic commit `dc803df` after 200 tests and a 377-file artifact
audit. It removed 73 maps after the uploads. The probe's debug ID,
`c5cf46a9-e5b3-4528-b2cc-75b87ae5173e`, appears **with its map in both uploads**.
Four scripts lack maps in both passes (Rolldown runtime, client shim, virtual
session driver and virtual server-island manifest); these warnings are not the
previous second-pass loss of application maps.

A temporary preview-only, bearer-authenticated POST route captured one event:

- Marker: `NBASTT server source-map lifecycle smoke 2026-09-25T00:18:55.973Z`
- Event: `00d6680115c0404fa60b511738d133ac`
- Expected original frame: `src/pages/cutover/sourcemaps.ts` from `dc803df`
- Capture and flush succeeded. Dashboard mapping confirmation is pending.

Missing/wrong credentials and production/missing-secret rejection were tested.
Hosted unauthenticated/wrong-token calls returned 404. The request used the
preview Origin and JSON content type; Astro's normal origin checks remain on.
The random token existed only in memory and the exact preview Worker secret;
headers/body were removed from the event. The secret was deleted immediately
after capture and its absence confirmed through the API. No KV calls were made.
[Cleanup run 36077104299](https://github.com/zemccartney/nba-surprise-teams/actions/runs/36077104299)
deployed `0e3cc34` as version `41d9429f-5c81-4b2b-a63c-6e17912756a6`:
195 tests, 72 maps removed and a 375-file artifact audit. The temporary route and
five temporary tests are removed. Post-deploy checks confirmed the normal 404
page at its URL, absent secret, isolated preview KV, unchanged original Pages
deployment, main pages returning 200 and the normal empty preseason action.

Production KV, domains and Pages remain untouched. The separate dashboard
Worker's Git build failed on `npm run build` because this repo requires pnpm;
that is not our GitHub Actions deployment. Its configuration was not changed.

## Upstream research

- [Bundler plugins #626](https://github.com/getsentry/sentry-javascript-bundler-plugins/issues/626):
  explicitly describes duplicate uploads across framework build passes. A
  maintainer suggests CLI injection/upload once after all builds as an alternative.
  Closed status does not establish a fix for our pinned Astro configuration.
- [SDK #24527](https://github.com/getsentry/sentry-javascript/issues/24527): open
  Cloudflare upload proposal discussing multi-environment builds and cleanup.
- [SDK #14247](https://github.com/getsentry/sentry-javascript/issues/14247): similar
  debug-ID symptoms, but caused by empty maps; not our confirmed local behavior.

No exact confirmed upstream report of the later incomplete bundle masking an
older complete one was found. Do not claim the hosted issue resolved until the
fresh event's original frames are verified. Runtime release tagging is a separate
known omission and was deliberately left unchanged for this experiment.
