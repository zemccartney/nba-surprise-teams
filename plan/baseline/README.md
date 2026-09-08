# Baseline / regression capture

Throwaway-but-reusable tooling for the 2026 new-season sweep. Captures what a
deployed (or locally served) build of the site actually ships, so each round of
changes can be compared against a known-good reference.

## Setup

```sh
cd plan/baseline && npm install
```

Uses the system Google Chrome via Playwright's `channel: "chrome"`. Override with
`--chrome /path/to/binary` or `CHROME_PATH`.

## Capture

```sh
node plan/baseline/capture.mjs --base https://nbastt.grepco.net --label prod
node plan/baseline/capture.mjs --base http://localhost:8788 --label main-local
```

Writes `plan/baseline/runs/<YYYY-MM-DD>-<label>/`:

- `summary.json` / `summary.md` — per page: status, redirect chain, HTML bytes,
  script + stylesheet inventory, JS/CSS bytes shipped, server-island endpoints
  and their response headers, console errors, navigation timing
- `html/<page>.html` — served HTML as fetched (no browser)
- `screens/<page>-<viewport>.png` — full-page screenshots per viewport

Flags: `--pages /,/about` (override page list), `--no-screenshots`,
`--third-party` (let the browser load cross-origin resources; off by default so
screenshots are deterministic), `--out <dir>`.

## Compare

```sh
node plan/baseline/compare.mjs --a plan/baseline/runs/2026-09-07-main-local --b plan/baseline/runs/2026-09-08-tailwind-local
```

Prints size deltas per page and pixel-diff percentages per screenshot; writes
diff images to `<b>/diff/`.

## Local reference build

The comparison target for foundation work (group 1) is committed `main` plus the
2025 archive, built and served the way Pages serves it. Recipe (throwaway dir):

```sh
mkdir -p /tmp/main-baseline && git archive main | tar -x -C /tmp/main-baseline
cp src/content/games.json /tmp/main-baseline/src/content/games.json
cd /tmp/main-baseline && npm ci && npx astro build
npx wrangler pages dev dist --port 8788 --compatibility-date 2025-03-21 --compatibility-flags nodejs_compat --kv GAMES_KV
```

Then `node plan/baseline/capture.mjs --base http://localhost:8788 --label <name>`.

Known, expected deltas vs prod:

- Prod pages carry ~150 KB more JS: the Sentry client SDK, bundled only when
  `SENTRY_AUTH_TOKEN` is present at build time. Local builds never include it.
- Prod injects Cloudflare scripts (Web Analytics beacon everywhere, email
  obfuscation decoder on `/about`, bot-challenge loader). Local has none.
- Server-island `Cache-Control` only appears while a season has upcoming games.
  Out of season the action returns no `expiresAt`, so no header is set.
