# Review notes: new-season sweep

One running document for the exhaustive review at the end of the batch (Zack,
2026-09-09: "better to have all things to review in front of me rather than
slow-walking this"). One section per round, newest first. Each section has the
state (branch, commits, preview), the files to read in order, the surprises
and what each means for review, the deliberate deviations, a manual test
checklist, and the comparison artifacts. The full record of every round is in
`log.md`; this file is the checklist. Steps 1 to 3 were reviewed round by
round and have no section here.

**Branch stack, oldest first.** `tooling` → `react-removal` → `eslint-10` →
`deps` → `trailing-slash` → `astro-7`. Each branch is stacked on the previous
one, so merging any of them takes everything below it; merge the top one for
the lot, or bisect by checking out an intermediate branch.

## Step 8: Astro 7 and the Cloudflare Workers adapter

**State.** Branch `astro-7` on `trailing-slash`. **No Pages preview**: the
Pages build cannot build an Astro 6+ branch, so everything here was verified
locally. Nothing was created in the Cloudflare account, and the deploy workflow
is inert until you set a repository variable. Two commits: `08a6471` is the
upgrade, and the one after it is this write-up plus the comparison artifacts.
Both carry `[CF-Pages-Skip]`, because a Pages build of this branch would only
fail; the deployment Cloudflare records for it sits at "Idle" and never runs.

### Files to read, in order

1. `astro.config.mjs`: `imageService`, `compressHTML`, `session`, the two
   things that are gone (`platformProxy`, the `vite.ssr.external` list), and
   the `devImageEndpoint` integration at the top, which is the fix for the
   broken-images bug you hit.
2. `wrangler.jsonc`: this is the deploy config now. The `GAMES_KV` id is a
   placeholder you have to fill in.
3. `src/layouts/typography.astro`: the `:global(...)` on the three layout
   rules, and `src/components/table.astro`: the deleted `color` inside
   `&.compact`. These two are the visual regressions the upgrade caused, both
   from the same compiler change, and both carry a comment explaining why.
4. `src/actions/index.ts`, `src/middleware.ts`, `src/env.d.ts`: the three
   places `Astro.locals.runtime` used to appear.
5. `archiver/api.ts` and `archiver/script.ts`: the write moved out of the route
   and into the node script.
6. `.github/workflows/deploy.yml`: what a real deploy would do, and the
   `DEPLOY_ENABLED` gate that stops it doing anything today.
7. `vitest.config.ts`: why the Cloudflare vite plugins are filtered out.

### Astro 6 and 7 features: what I took

Forced by the upgrade, nothing to decide: Vite 8 and Rolldown, the Rust
compiler, queued rendering, Zod 4 through `astro/zod`, workerd for dev,
prerendering and preview, and the wrangler file as the build config.

Chosen:

- **`session: false`** — no `SESSION` KV namespace gets provisioned on deploy,
  and `unstorage` leaves the worker.
- **`imageService: "compile"`** — keeps today's behaviour, sharp at build time.
  The adapter's new default routes every processed image through the
  Cloudflare Images binding at runtime.
- **`compressHTML: true`** — 5.x whitespace, so the HTML diff stayed readable.
  Astro 7's default is `'jsx'`, which collapses newlines between inline
  elements.
- **Immutable `Cache-Control` on `/_astro/*`** — the adapter writes it into
  `_headers` by itself. Free, and the Pages build never did it.

### Astro 6 and 7 features: what I left out, and why

You asked for the omissions, so here they are, roughly most to least worth
revisiting.

1. **Content Security Policy** (`security.csp`, stable since 6.0). Deliberately
   held for the session you and I do together. Worth knowing going in: it emits
   a `<meta>` policy with hashes for Astro-processed scripts and styles, it is
   not applied in dev, external scripts and styles need hashes added by hand
   (which is where Cloudflare's injected beacon comes in), and 7.1 added `kind`
   scoping so inline `style` attributes can be allowed without loosening the
   `<style>` policy.
2. **Fonts API** (`fonts: [...]`, `<Font />`, stable since 6.0). Would replace
   the two `@fontsource/*` CSS imports with declarative config that also emits
   preloads and metric-matched fallbacks. Real but cosmetic, and it changes how
   every font on the site is delivered, so it wants its own round.
3. **Route caching** (`cache.provider`, `routeRules`, `Astro.cache`, stable in
   7.0). This is the platform-agnostic version of the manual `Cache-Control`
   the two server islands set today. I left it because the providers don't fit:
   `memoryCache()` is per-isolate memory, which on Workers means almost
   nothing, and `cacheCloudflare()` needs the Workers Cache private beta, which
   the docs say not to use without access.
4. **`experimental_getFontFileURL()`** (6.2). The documented way to build a
   satori OG image. Only useful once the Fonts API is in, and its docs example
   rasterizes with sharp, which will not run in workerd — so the OG endpoint
   would have to prerender or use `prerenderEnvironment: 'node'`. Flagging it
   now because the OG image is on your list.
5. **`prerenderEnvironment: 'node'`** (adapter 13.1). The escape hatch for
   prerendering pages that need Node APIs. Not needed today; the thing that
   needed Node was the archiver route, and that moved to the node script.
6. **`CF_VERSION_METADATA` binding** (adapter 14.2.5). Adds a version cache tag
   and a weak ETag, and it is also how Sentry detects releases. Belongs with
   the Sentry rework.
7. **Cloudflare preview deployments** (adapter 13.2). Could replace the
   separate preview environment, but it is a Cloudflare private beta and I
   could not verify availability without touching your account.
8. **`image.service.config.{jpeg,webp,avif,png}`** (6.1). Per-codec sharp
   settings. Only worth it if logo output size or quality ever bothers you.
9. **`experimental.svgOptimizer`** (6.2, still experimental). The site's SVGs
   go through `getImage` and `import.meta.glob` as assets rather than as
   components, which is not what this optimizes.
10. **`experimental.incrementalBuild`** (7.2) and
    **`experimental.collectionStorage: 'chunked'`** (7.1). Both aimed at big
    sites; ours builds in about forty seconds and the data store is one file.
11. **Custom and JSON logging** (`logger`, stable in 7.0). Worker logs go to
    Cloudflare observability, which is already enabled in `wrangler.jsonc`.
12. **Advanced routing** (`src/fetch.ts`, `astro/fetch`, the Hono middleware,
    `cf()` helpers). Composing the request pipeline by hand. Nothing here needs
    it, and the Sentry wrapper wraps the default entrypoint anyway.
13. **`astro dev --background`** and the matching preview commands (7.0/7.2).
    Turned off in `pnpm start` rather than adopted; see the log entry.

Not applicable, listed so you know they were looked at: live content
collections, the Sätteri Markdown pipeline, `@astrojs/db` (removed), i18n
fallback routes, `<ClientRouter />`, `paginate({ format })`, the Container API,
session drivers, resilient hydration for framework islands, and remote image
redirects.

### Surprises, and what each one means for review

1. **Scoped-CSS selectors changed meaning, and that is the thing to look at
   hardest.** Astro 7 scopes every compound of a scoped selector; Astro 5 left
   descendants alone. Two consequences here, and both were silent — the build
   was green and only the pixel comparison caught them. The lesson for future
   components: a scoped selector's specificity in Astro 7 is one attribute per
   compound, so nested rules are heavier than they read.
   - Rules reaching into slotted content stopped matching, because slotted
     children carry the page's attribute rather than the component's. That is
     the typography regression; fixed with `:global(...)`. Check `/about/`,
     `/`, and any team page: paragraphs should have a gap between them and
     headings a bigger gap above than below.
   - Rules that were safely below a consumer's specificity moved up to tie
     with it, and then lost or won on source order. That is the table one.
     Check a team page: the row labels in the small stats table (Record,
     Over/Under, Record Needed…) should be lime, and the values beside them
     green.
2. **Images were broken in dev and the harness could not see it.** You found
   this, not me, and the reason it got past every check is worth stating
   plainly: everything I verified ran against built output, where these images
   are static files that never touch `/_image`. In dev they do, and under
   `imageService: "compile"` the adapter routes `/_image` to the Cloudflare
   Images binding, which rejects SVG. All 45 assets here are SVG. The fix is
   dev-only and the 421 files of build output are byte-identical before and
   after it, so the 44/44 result still stands. `plan/baseline/dev-smoke.mjs` is
   the new check that would have caught it; run it whenever a round touches
   dev, the adapter or images.
3. **A Node shim ships to the browser.** Every page's inline script now starts
   with `globalThis.process ??= {}`. It comes from the adapter setting a
   Rolldown banner at the top level instead of per environment. Harmless, 62
   bytes, and removable — see the decisions below.
4. **Two stylesheets instead of one**, and the order differs per page. Check
   the network panel on `/2024/TOR/` and `/stats/`. This is what made the table
   specificity tie visible rather than harmless, so it is not purely cosmetic.
5. **Trailing-slash redirects go from 308 to 307.** Pages answers `/about` with
   a permanent redirect; the Workers asset layer answers it with a temporary
   one, and `assets.html_handling` cannot change that (I tried
   `"force-trailing-slash"`). Paths with no asset behind them still get Astro's
   own permanent redirect from the worker. Same destination, one hop either
   way; what changes is the signal to crawlers. See the decisions below.
6. **The server-island bootstrap was rewritten.** Astro 7 preloads the island
   endpoint from `<head>` and swaps the markup through a shared helper keyed by
   `data-island-id`. Behaviour is unchanged and the rendered pages are
   pixel-identical, but if you ever read that markup it will look nothing like
   what you remember.
7. **No preview build for this branch.** Pages cannot build Astro 6+. Merging
   this to `main` without the Workers cutover would break the deployed site, so
   this branch and the cutover have to land together.

### Decisions you may flip

- `compressHTML: true` keeps 5.x whitespace. Dropping it takes Astro 7's `jsx`
  default and a smaller page, at the cost of checking every inline-element
  boundary for a lost space.
- The `globalThis.process` banner could be cleared for the client environment
  in `astro.config.mjs`. Nothing in the client references `process` today, but
  the adapter pairs the banner with `define: { "process.env": "process.env" }`,
  and a production build with Sentry bundled might. I left it; it is a safe
  thing to revisit during the Sentry round.
- Sentry logs a workerd cross-request promise warning on some dev requests.
  It is dev only: zero occurrences across twelve on-demand island requests
  against `astro preview`, because a production build short-circuits the
  middleware on prerendered routes. The underlying question is whether the
  Sentry middleware should run in dev at all, which is your call and belongs to
  the Sentry round, so I left it. The alternative, the
  `no_handle_cross_request_promise_resolution` compatibility flag, would
  silence it in production too and is the wrong tool.
- `imageService` stays `"compile"` with a dev-only endpoint override rather
  than `"passthrough"`. Passthrough fixes dev in one line, but it makes every
  prerendered page request `/_image` at runtime, so every image becomes a
  worker invocation instead of a static asset. Related and worth a look
  sometime: `compile` emits 98 SVG files for 45 sources and every one is
  byte-identical to its source, so build-time processing is currently buying
  nothing here.
- The 307 on trailing-slash redirects is left as it is. The alternatives are
  a Cloudflare redirect rule in the dashboard, or `assets.html_handling: "none"`
  plus running the worker first, which would put every HTML request through a
  worker invocation and give up the asset cache. Neither is worth it for a
  permanence signal on one hop, but it is your call and it belongs to the
  cutover round, not this one.
- `compatibility_date` is pinned to `2025-03-21`, the date the Pages build
  used. The adapter would otherwise default it to the installed workerd's date.
- The deploy workflow builds through `pnpm run build`, which runs the full
  verify (check, format, lint, test) before every deploy. Slower CI, but it
  matches what the local build does.
- `wrangler.jsonc` rather than `wrangler.json` or `.toml`, so the file can
  carry comments. It costs a `.prettierrc` override to stop prettier and the
  linter fighting over trailing commas.

### Manual test checklist

- [ ] `pnpm start`: dev server stays in the foreground, `concurrently` shows
      both processes, `/stats` 404s and `/stats/` serves.
- [ ] With that running, the `dev-smoke.mjs` script under `plan/baseline/`
      exits 0 when pointed at the dev server with `--base`. Team logos and
      emoji should be visible on `/2024/`, a team page and `/stats/`.
- [ ] Images in a browser other than Chrome, if you care to. SVG in an `<img>`
      needs a correct content type and the dev endpoint now sends
      `image/svg+xml`, but I only checked Chrome.
- [ ] `/about/` and `/`: paragraphs and headings have spacing. This is the
      first regression that was fixed; it is the thing most worth a human eye.
- [ ] Any team page, e.g. `/2024/TOR/`: the stats-table row labels are lime and
      the values green. That is the second regression.
- [ ] `node archiver/script.ts 2099`: prints "Processing season 2099...", then
      "Archive request failed: 404 Not Found". The endpoint runs in workerd
      now, so this proves the route still works there.
- [ ] `pnpm run archive:latest` if you want the real path: it should rewrite
      `src/content/games.json` from the node script, after which the
      `archive:diff` script should report nothing changed.
- [ ] `pnpm exec astro preview`: the built worker serves, including a server
      island if you add a 2026 team season.
- [ ] `pnpm test` and `pnpm run check` both pass.

### Comparison artifacts

- `plan/baseline/runs/2026-09-09-astro-7-local` vs
  `runs/2026-09-09-trailing-slash-local`, both served by
  `plan/baseline/serve-dist.mjs`: 44/44 pixel-identical, 0 console errors.
- `runs/2026-09-09-astro-7-scratch-island` vs
  `runs/2026-09-09-trailing-slash-scratch-island`, both served by
  `astro preview` on real workerd: 8/8 pixel-identical, both islands 200,
  0 console errors.
- `plan/baseline/dev-smoke.mjs` against a running dev server: 47 images across
  seven pages, none failing to render, no console errors or failed requests.
- The two CSS regressions before their fixes, for scale: `/about/` differed by
  22–27% at every viewport, and the twelve team-page shots by 0.15–0.46%.

## Step 7: trailing slashes

**State.** Branch `trailing-slash` on `deps`. Preview:
https://trailing-slash.nba-surprise-teams.pages.dev. Commits listed at the end
of this section.

### Files to read, in order

1. `astro.config.mjs`: the `build.format` block and the `trailingSlash` line,
   each with the comment that ties it to the other.
2. `src/layouts/subpage.astro`: the nav-highlight script (three lines shorter)
   and the three nav links.
3. Everything else is one character per link. The whole change is
   `git diff deps..trailing-slash -- src/ archiver/`.

### Surprises, and what each one means for review

1. **Dev 404s where production redirects.** Astro's dev server answers a
   slash-less request with the 404 page instead of a redirect, so a link
   written without the slash breaks under `pnpm dev` and still works deployed.
   That asymmetry is the point of the round: it makes a missed link loud
   locally. Check: `pnpm dev`, visit `/stats` (404) and `/stats/` (200).
2. **The island endpoint gained a slash.** Astro now writes
   `fetch('/_server-islands/StandingsTable/?…')`. Nothing to change, but it is
   the one URL in the app that Astro writes for you, so it is the one that
   could have gone wrong silently. Verified with a scratch 2026 team season,
   which is still the only way to see an island at all until the odds land.
3. **Nothing changes for the deployed site today.** Cloudflare already 308s
   `/about` to `/about/`. Check the response line for `/about` on the live
   site and on the preview; both should be a 308.

### Decisions you may flip

- `build.format: "directory"` is written out even though it is the default.
  Drop it if you would rather the config only carry non-defaults; the comment
  is the reason it is there.
- The nav highlight matches the full path against the `href`. It would also
  work to compare normalized paths on both sides, which would survive a future
  link written without the slash. I took the stricter version so a bad link
  shows up as a missing highlight.
- `archiver/script.ts` calls the endpoints with the slash. The alternative is
  leaving them slash-less and letting the dev server redirect, which it will
  not do — it 404s.

### Manual test checklist

- [ ] `pnpm dev`: `/stats` 404, `/stats/` 200. Click every nav link from every
      page; none should hit a 404.
- [ ] On `/archive/`, `/stats/`, `/about/`: the current nav link is
      highlighted. On `/` and on a season page, none is.
- [ ] `/2024/` → click a team → back link returns to `/2024/`. Both URLs keep
      the slash in the address bar with no redirect flash.
- [ ] `node archiver/script.ts 2099` still reaches the route: "Processing
      season 2099…", "Entry seasons → 2099 was not found", then the 404 throw.
- [ ] On the preview, `curl -sI …/about | head -3` shows a 308 to `/about/`.

### Comparison artifacts

- `plan/baseline/runs/2026-09-09-trailing-slash-local` vs
  `runs/2026-09-09-deps-static`: 44/44 pixel-identical, 0 console errors.
  Both were captured through `plan/baseline/serve-dist.mjs` rather than
  `wrangler pages dev`, which died partway through three runs out of three.
- `runs/2026-09-09-trailing-slash-scratch-island` vs
  `runs/2026-09-09-deps-scratch-island`: 8/8 pixel-identical, islands 0 → 1
  (the capture fix), HTML 13–38 B smaller.
- HTML diff of the two builds: exactly two changes per page, the nav script and
  the slashed hrefs.

## Step 6: dependency round

**State.** Branch `deps` on `eslint-10`. Preview:
https://deps.nba-surprise-teams.pages.dev. Commits listed at the end of this
section.

### Files to read, in order

1. `package.json`: the `archive:*` scripts (`node`, not `tsx`), the `deps`
   script, and the version lines.
2. `README.md`, "Held back on purpose": five packages the `deps` script will
   keep offering, and what each waits for.
3. `pnpm-workspace.yaml`, the `peerDependencyRules` block: a second allowed
   peer mismatch (wrangler's optional `@cloudflare/workers-types` 5).

### Surprises, and what each one means for review

1. **Team pages inline their own stylesheet now.** Astro 5.18's CSS chunking
   put the 4.1 KB team stylesheet under the 4 KB inline limit. Check: view
   source on `/2024/TOR/`: one `<link rel="stylesheet">` (was two) and a
   `<style>` block of about 4 KB near the top; DevTools shows one CSS
   request.
2. **Sentry 10.40+ treats this repo as Workers**, because the wrangler config
   lacks `pages_build_output_dir`, and would wrap the worker entry on the
   Pages build too. Held at 10.22; nothing to check, but it's the reason the
   Sentry rework can't be separated from the adapter move.
3. **Prettier 3.9 reflows `.astro` paragraphs past 80 columns** with the
   current plugin. Pinned to 3.6.2. If you'd rather take 3.9's output now,
   unpin, `pnpm update prettier`, `pnpm run fmt`, and commit the two
   paragraphs in `about.astro`.
4. **No server island exists on the site until the 2026 odds land**, so the
   baseline captures never exercise the island path. The trailing-slash round
   verifies islands with a scratch team season instead.

### Decisions you may flip

- prettier pinned exact (`3.6.2`) rather than `^3.6.2` with the lockfile held,
  so that a plain `pnpm update` can't move it.
- `--format group` dropped from the `deps` script (ncu 23's default).
- sharp, vite, TypeScript, Sentry left for the Astro 7 round.

### Manual test checklist

- [ ] `node archiver/script.ts 2099`: prints "Processing season 2099...",
      then "Archive request failed: 404 Not Found", and exits (the dev server
      on 4322 stops). No change to `src/content/games.json`.
- [ ] `pnpm run archive:latest` if you want the real path: re-archives the
      2025 season; `pnpm run archive:diff` should report nothing changed.
- [ ] `pnpm run deps`: ncu 23's interactive prompt, grouped; the held-back
      packages appear; quit without selecting anything.
- [ ] `pnpm start`: concurrently 10 colors the `astro`/`ts` prefixes on its
      own; both processes come up.
- [ ] `/2024/TOR/`: one stylesheet request (surprise 1).

### Comparison artifacts

- `plan/baseline/runs/2026-09-09-deps-local` vs
  `runs/2026-09-09-eslint-10-local`: 44/44 pixel-identical; team pages
  +4,029 B HTML / −4,126 B CSS; other pages −8 B CSS.
- `runs/2026-09-09-preview-deps` (Pages build `e7971404`) vs
  `runs/2026-09-09-deps-local`: 44/44 pixel-identical. The HTML and JS deltas
  are Cloudflare's own injected scripts (about 128 KB, two extra external
  scripts per page), and the ten console errors are its RUM beacon being
  CORS-blocked — the same on every preview since the tooling round.

## Step 5: ESLint 10, `eslint.config.ts`, vitest 5, import-x

**State.** Branch `eslint-10` on `react-removal`. Commits: `827dbfb` (the
change), `49ed1f1` (lint fix for the Pages build), `c95db39` (preview
capture); `82af91d` and `c95db39` are notes. Preview:
https://eslint-10.nba-surprise-teams.pages.dev.

### Files to read, in order

1. `eslint.config.ts`: the whole config is 130 lines. Every rule that is off
   has its reason beside it.
2. `lefthook.yml` and `.vscode/settings.json`: where the
   `unstable_native_nodejs_ts_config` flag lives besides the `lint` scripts.
3. `src/pages/stats.astro`, the per-team loop: the one non-mechanical code
   change (two branches that ended with the same 20 lines became one loop).
4. `system.test.ts`, "current/upcoming seasons must not have static games
   data": conditional `expect` became a filter plus a loop.

### Decisions you may flip

- Five unicorn rules off (`max-nested-calls`, `no-top-level-side-effects`,
  `prefer-await`, `prefer-number-coercion`, `prefer-simple-condition-first`).
- `eslint-plugin-jsx-a11y` kept for `.astro` templates although it is
  unmaintained and its peer range stops at ESLint 9 (allowed in
  `pnpm-workspace.yaml`).
- `"private": true` in `package.json` rather than turning off the
  `package-json/require-*` rules.
- `.vscode/settings.json` `eslint.probe` lists json, jsonc, and astro.
- Four boolean renames (`isLatestOnly`, `isInitial`, `isServer`,
  `isSameOrigin`) from `unicorn/no-unused-properties`-style rules.

### Manual test checklist

- [ ] VS Code: open a `.ts` file, add an unused variable; the ESLint extension
      reports it (proves the flag reaches the extension).
- [ ] `pnpm run lint` finishes in about 5 s with no findings.
- [ ] `pnpm run lint:debug src/pages/stats.astro` prints the resolved config
      for an `.astro` file (jsx-a11y rules present).
- [ ] Commit something trivial; the pre-commit hook runs in about 5 to 6 s.
      Zack flagged hook timing as an item to look at; this is the number to
      compare against.

### Comparison artifacts

- `plan/baseline/runs/2026-09-09-eslint-10-local` vs
  `runs/2026-09-09-react-removal-local`: 44/44 pixel-identical, +12 bytes of
  HTML per page (`CSS.escape()` in the nav script).
- `runs/2026-09-09-preview-eslint-10` vs `runs/2026-09-09-preview-react-removal`:
  same result against the deployed previews.

## Step 4: React out, ECharts and a native popover in

For Zack's manual review. Written 2026-09-09 from the round report. The full
record of the round is the Step 4 entry in `log.md`; this file is the checklist.

**State.** Branch `react-removal`, stacked on the unmerged `tooling` branch.
Commits: `d38f389` (the change), `583fba7` (preview capture), `ea1f789`
(`@types/node`). Preview: https://react-removal.nba-surprise-teams.pages.dev.

### Files to read, in order

1. `src/components/charts/echarts.ts`: ECharts registration, the theme reader
   (design tokens to hex), and the mount loop (IntersectionObserver, fonts,
   reduced motion, resize). Everything else builds on it.
2. `src/components/charts/team-season-pace.ts` and its `.astro` wrapper. The
   wrapper shows the JSON handoff (props serialized into a script block, read
   back at mount). The builder shows the visualMap split fill that replaced the
   gradient offset math.
3. `src/components/popover.astro` and `src/components/popover.css`. The whole
   popover is markup plus the `@supports (position-area: block-end)` block.

### Surprises, and what each one means for review

1. **Open-ended visualMap pieces crash ECharts' line view** while it builds
   the area gradient. Both pieces on the pace chart are bounded to the axis
   range. Check: the pace chart's fill is green above the threshold line and
   red below it, and the line itself stays lime.
2. **zrender can't parse `oklch()`**; it throws mid-animation when it tweens a
   hover state. The theme reader paints each token into a 1px canvas and reads
   the sRGB bytes back as hex. Check: chart colors against the same tokens
   elsewhere on the page. If a color looks off on a wide-gamut (P3) display,
   this conversion clips to sRGB and is the first suspect. Headless captures
   are sRGB and would not show it.
3. **Importing an SVG from a client module** dragged Astro's asset runtime and
   zod into the chunk (66 KB for one emoji). The pace wrapper resolves the URL
   server-side with `getImage` and passes it in. Check: the hushed-face emoji
   renders next to the threshold label on the pace chart.
4. **Server islands run module scripts.** The current-season team page mounts
   its chart inside the island. Check: `/2025/CHA` (or any current-season team)
   renders the pace chart after the island loads.
5. **Native popover gives the trigger `aria-expanded` and `aria-details`**
   for free. The trigger's accessible name is still just "?", as before.
6. **The popover inherited table-header styles.** Radix portaled to `<body>`;
   the native one stays inside the `<th>` and picked up bold, italic, and the
   header's text alignment. `.popover-body` resets `font-weight`,
   `font-style`, and `text-align`. Check: every popover's text is regular
   weight and left-aligned, including the episode popover on season pages.

**Deliberate deviations.** No popover arrow (Radix's 5px triangle sat inside
the 12px glow). Y-axis tick intervals: ECharts' choice on the scatter (10, was
15), pinned to 5 on the surprises-by-team chart.

**Sizes.** Uncompressed JS per page: season pages 249 KB to 0; team pages 697
to 578 KB; stats 640 to 583 KB. Gzipped, the chart pages are a wash at about
200 KB either way; ECharts' core with only the line chart is 174 KB gzip, so
that is the floor with this library.

**Lint.** `eslint-plugin-jsx-a11y` stays: eslint-plugin-astro's
`jsx-a11y-strict` config lints `.astro` templates with it, and the ESLint 10
round (Step 5) confirmed it runs on ESLint 10.

### Manual test checklist

Run `pnpm start`, or use the preview URL.

- [ ] `/stats`: hover each of the three charts; tooltip content matches the old
      build (team logos in the per-season tooltip, history list in the
      per-team tooltip, over/under and pace on the scatter).
- [ ] `/stats`: open the top-10 pace popover; click outside; reopen; Escape.
- [ ] `/2011/CHA`: hover the pace chart near the threshold crossing; the fill
      changes color at the line; the emoji label sits at the left end.
- [ ] `/2011/CHA`: open all four question-mark popovers (shortened season,
      record needed, pace, have-to-go); each hangs below its trigger, or flips
      above it near the bottom of the viewport.
- [ ] `/2025/CHA`: island-mounted chart renders.
- [ ] `/2024`: episode popover opens and its text is regular weight.
- [ ] Phone width (390px): open the shortened-season popover; it stays inside
      the viewport.
- [ ] Reduced motion on: charts render without the mount animation.
- [ ] **Safari and Firefox** (not testable here; only Chrome was available):
      popover placement. Anchor positioning shipped in Safari 26 and Firefox
      147; older versions center the popover in the viewport, which is the
      intended fallback.
- [ ] Keyboard: Tab to a "?" trigger, Enter opens, Escape closes, focus returns
      to the trigger.

### Comparison artifacts

- `plan/baseline/runs/2026-09-09-react-removal-local` vs
  `runs/2026-09-07-tooling-pnpm-local`: 7 pages pixel-identical at 390, 768,
  1440, 1920; chart pages differ only inside the chart area.
- `runs/2026-09-09-preview-react-removal` vs `runs/2026-09-08-preview-tooling`:
  same shape against the deployed previews.
- Re-run: `node plan/baseline/compare.mjs <runA> <runB>` (usage in
  `plan/baseline/README.md`).

### Issues found in review

- 2026-09-09, Zack: "some layout and coloring issues", details to follow.
  Where to look first: `src/components/charts/charts.css` (`.chart` is a
  fixed 600px tall; Recharts sized from its ResponsiveContainer), the theme
  reader in `echarts.ts` (hex conversion, surprise 2 above), and
  `popover.css` (`width: fit-content; max-width: 20rem`).
