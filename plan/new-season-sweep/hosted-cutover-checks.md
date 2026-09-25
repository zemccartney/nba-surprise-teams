# Hosted cutover checks — 2026-09-24

## Results

- **Browser Sentry:** user confirmed receipt of
  `NBASTT preview cutover smoke 2026-09-24T03:09:03.937Z`.
  Triggered with a one-shot browser `setTimeout` throwing an Error, handled by
  the installed SDK; no application change was needed. Ingestion returned 200,
  environment preview and the correct release.
- **Real preview KV:** wrote an expired, empty versioned envelope under a unique
  `__cutover_smoke:` key, read it through the real binding, and validated it with
  `decodeLiveCache`. Deleted in `finally`, with a five-minute TTL as backup.
  API inspection later confirmed no probe keys remained. No real season keys,
  fictional games, authoring records or production KV were modified.
- **Server Sentry:** captured a labelled exception inside the real Worker request
  middleware; flush completed. Event `c0867439996b40d79b8f11a26ec8148c`, marker
  `NBASTT server cutover smoke 2026-09-24T03:43:08.657Z`.
  The user's exported event confirmed receipt but **failed mapping**:
  `missing_sourcemap` errors despite valid debug IDs; runtime release was null.
  See [source-map investigation and fresh preview test](sentry-source-maps.md)
  for the delayed-cleanup fix. The fresh event export confirms all seven frames
  mapped, including `src/pages/cutover/sourcemaps.ts:42:39`, with no processing
  errors. The hosted server source-map check now passes.
- **NBA access:** the original hosted loader failed with HTTP 403 even though
  the same URL/headers fetched the expected 2026-27 schedule locally.
  A bounded request comparison found:

  | Hosted request                        | Result                      |
  | ------------------------------------- | --------------------------- |
  | Existing Accept + Referer             | 403                         |
  | Explicit Node User-Agent              | 403                         |
  | Application-identifying User-Agent    | 520                         |
  | Node User-Agent + NBA Origin          | 403                         |
  | Browser-style User-Agent + NBA Origin | 200; validated 2026-27 feed |

  This does not isolate which CDN policy caused the denial or establish a
  supported upstream contract. It demonstrates that the tested header set works
  where the previous one failed.

- **Actual loader after fix:** added Origin and the tested User-Agent to the
  shared `NBA_SCHEDULE_HEADERS`. Two hosted calls to the real `LiveLoader("2026")`
  then passed, including its normal timeout, schema and season validation.
  Both returned zero games, consistent with current preseason/candidate data.
  No data filtering, versioning, cache policy or date windows changed.

## Diagnostic controls and cleanup

The temporary route was preview-only and required a random bearer secret. Tests
covered missing/wrong credentials, production rejection, reserved-key use and
cleanup on validation failure. Request headers/body were removed from the
intentional Sentry smoke event. The token was never committed or printed.

Setup corrections, retained for operational clarity:

- Astro excludes underscore-prefixed page directories. The first probe was
  therefore absent until moved to a normal route directory.
- `wrangler secret put --name nbastt-preview --env preview` appended the suffix
  again, creating an unintended empty `nbastt-preview-preview` stub. That stub
  was deleted; the intended secret was set through the exact preview API target.
  Do not combine an already-suffixed name with `--env` for these operations.
- One CI attempt rejected a formatting mismatch after concurrent hook auto-fixes.
  It did not publish. Formatting was corrected and full verification rerun.

The probe route, temporary tests and secret are removed after checking. The local
token file is deleted and temporary KV keys are absent. The only permanent
application change is the tested shared NBA header set and its regression test.
[Cleanup deployment 35953718772](https://github.com/zemccartney/nba-surprise-teams/actions/runs/35953718772)
passed with **192 tests** and a 375-file artifact audit. Deployed commit `6f833db`,
Worker version `c7311ac7-558c-4a0b-a413-c8c54446c876`. Post-deploy checks confirm the
route is absent (normal 404 page), the secret and extra stub are absent, preview
KV remains isolated, the preseason action is unchanged, and Pages production is
still the original deployment. The automatic production gate remains off.

## Scope still requiring coordination

This tests real Worker network/KV access plus normalization and cache decoding.
It does **not** replay the actual action's post-opening-night cache-refresh/stale
fallback path: preseason intentionally bypasses that branch. Those contracts have
unit coverage; observe real scheduled/in-progress/final data at season activation.

Server Sentry receipt and source-map resolution were verified after the cleanup
fix. The subsequent [Worker entry migration](sentry-worker-entry.md) now supplies
the matching runtime release; its fresh received event still needs confirmation.
Screen-reader review and the production domain/rollback decision remain separate. Production Worker bindings,
production KV, Pages deployment and both custom domains are unchanged.
