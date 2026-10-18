# cf migration — hosted Preview verification

Branch: `chore/cloudflare-cli-migration`. Owner approved branch publication and
hosted verification, **not production promotion**.

Preview: <https://chore-cloudflare-cli-migration-76bab265d209-nba-surprise-teams.zemccartney.workers.dev>

## Verified

- Initial CI `39097109237` failed before deployment: the real SQLite CLI test
  completed its assertions in 5.138 seconds, exceeding the five-second limit.
  Commit `e95801e` gives only this subprocess-heavy test 15 seconds, retaining
  all assertions and the suite default. No deployment gate was bypassed.
- [CI 39097244385](https://github.com/zemccartney/nba-surprise-teams/actions/runs/39097244385)
  installed the patched frozen lockfile on Linux, passed 279 tests/type/lint
  checks, uploaded Sentry maps twice, removed 83 maps after uploads, passed the
  artifact/preview guards and deployed the native branch Preview.
- API inspection of the actual Preview deployment confirmed `GAMES_KV` points
  to `6a0d30705c634691873dd1dd122969e3`, `PUBLIC_DEPLOY_ENV=preview`, and Preview
  URLs are workers.dev only. Production's active version remained
  `749faac0-00e2-4628-9b8d-4ccf2f48a8d5` (deployed before this pass).
- Hosted Chromium checked Home, 2026 season, 2026 Showdown and 2025 Showdown:
  HTTP 200, all images eagerly loaded, correct preview `og:url` metadata,
  no browser exceptions or HTTP failures. The site has no canonical link tag;
  this verifies its existing URL metadata rather than introducing new SEO.
- Real clicks Home → Showdown → Back land on Home. Archived Showdown still
  links to its season detail. Live server islands render successfully.
- A direct call to the deployed real NBA loader returned **622 scheduled
  candidate-team games, zero completed games** (preseason). This bypassed KV;
  no diagnostic KV writes/deletes or cache clearing were performed.

## Temporary probe controls

Diagnostic commit `b4752d597b2defa525cc0827f2138b6e7277acab` added two
non-prerendered routes. Both required the actual preview environment binding,
a random 256-bit bearer and an unexpired two-hour deadline. Only SHA-256 of
the bearer was committed; the bearer lived in a local mode-0600 temporary file.
No new Cloudflare secret or binding was created. Seven temporary gate tests
passed; missing and wrong credentials returned 404 on both hosted routes.
Worker event request data was removed before capture; browser authentication
was injected only into the diagnostic document request, not Sentry requests.

[Diagnostic CI 39097666778](https://github.com/zemccartney/nba-surprise-teams/actions/runs/39097666778)
passed 286 tests, uploaded maps twice and removed 92 maps after all uploads.

## Sentry evidence — mapping still pending

Both probes report an enabled client, `environment=preview`, successful flush,
and release `b4752d597b2defa525cc0827f2138b6e7277acab`, matching the CI upload.
The browser's Sentry envelope responses were HTTP 200. Worker capture/flush
is not independently confirmed receipt or symbolication.

| Probe   | Event ID                           | Expected original application frame          |
| ------- | ---------------------------------- | -------------------------------------------- |
| Worker  | `841420cd0ebd4cf78723ed7db5f235f3` | `src/pages/migration-check/worker.ts:52`     |
| Browser | `2055c06c714740c1a7ea6a39b686462a` | `src/pages/migration-check/browser.astro:39` |

Markers:

- `NBASTT cf migration worker smoke 2026-10-18T04:38:12.202Z`
- `NBASTT cf migration browser smoke 2026-10-18T04:38:14.038Z`

**Required next:** inspect/export these two events from Sentry organization
`grepco`, project `nba-surprise-team-tracker`. Confirm original application
file/line mapping, debug-ID resolution, correct release/environment and no
missing-sourcemap processing errors. Event-read credentials are unavailable
locally; successful uploads and ingestion are not claimed as mapping proof.
Probe removal does not prevent inspecting these events and their uploaded maps.

## Cleanup / promotion gate

- [x] Remove both diagnostic routes, helper and seven temporary tests.
- [x] Delete the local bearer file. No remote secret/key cleanup is necessary.
- [x] Publish the cleanup and recheck normal pages, missing probe routes,
      preview bindings and unchanged active production version.
      Cleanup commit `b3b3a76`, [CI 39097876783](https://github.com/zemccartney/nba-surprise-teams/actions/runs/39097876783),
      Preview deployment `73fdde6a-c780-46d9-9553-19c84a5e81bd`: 279 tests and
      all build gates pass. Both probe URLs serve the normal HTML 404 page;
      normal browser smoke checks still pass. API inspection confirms preview
      KV isolation and unchanged production version, KV and both custom domains.
- [ ] Inspect the two Sentry event exports before considering production.

CI also reports existing mise-action Node 20 deprecation and the upcoming
ubuntu-latest image migration. Neither blocked this run; neither was silently
changed during the CLI migration.
