# D2: latest-season action boundary

Checkpoint `1fa273b` committed the approved data/chart/tooling work and deferred
verification-definition consolidation. Its hooks passed 65 tests. Nothing was
pushed. The work below is subsequent and remains uncommitted.

## Consequence and correction

The live loader selects the latest configured season, but the action previously
accepted any existing season ID. An older-season request could therefore fetch
current games and store them under the older season's KV key.

`src/actions/index.ts` now rejects non-latest seasons with `BAD_REQUEST` before
any KV access or loader call. Unknown seasons retain `NOT_FOUND`. Archive pages
already use static data; this does not change archived page rendering or the
supported latest-season action response. The preseason empty response remains.

## Verification

`tests/live-action.test.ts` invokes the actual handler with controlled time and
explicitly mocked action transport, content lookup, loader, Sentry and bindings:

- Older season: rejected with no KV read, upstream load or KV write.
- Unknown season: NOT_FOUND, likewise no live access.
- Latest season before opening night: empty games without live access.
- Latest season after opening night: current-season result written to its key.

The Node-only `cloudflare:workers` alias points to a fail-fast module that requires
an explicit mock. This is not a Worker emulator or verification of real KV,
Astro's HTTP action transport, or hosted bindings. No content synchronization
machinery was added.

**69 tests in 9 files and a full credential-free build pass.** No application JSON
or production data was changed. No subsequent commit, push or deployment.

## Feed finality and eligibility remain open

The existing loader still uses positive scores as a proxy for finality and has
an acknowledged Cup-final eligibility gap. This patch does not resolve those.
Both result selection and next-refresh calculation need to use consistent,
verified completion/eligibility rules; changing selection alone can still leave
partial data cached indefinitely. Cache versioning must be considered when
changing those semantics.

Read-only requests to the actual configured NBA CDN schedule endpoint returned
HTTP 403 from this machine, including with the loader's Accept header. That does
not establish how production Workers are treated or what the current JSON feed
contains. No game-status or competition-ID guesses were shipped. Next step is
obtaining authoritative field semantics/a representative payload and exercising
those rules with controlled fixtures before live operation.
