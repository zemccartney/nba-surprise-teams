# NBA Surprise Teams Tracker — system theory

## Two kinds of truth

Editorial facts and completed games belong to a small relational dataset. Current
game results belong to an unreliable external service. Treating them differently
keeps historical pages independent of the NBA API without sacrificing live updates.

SQLite is an authoring/build database, **not a production service**. The checked-in
SQL dump is the reviewable source of truth. Astro selects static versus deferred
rendering from that dataset, not from a clock that silently advances seasons.
Lifecycle validation may refuse stale/premature data; it never rewrites it.

Open [the visual system guide](docs/data-system.html) for the anatomy and data flow.
See [data/README.md](data/README.md) for operational commands.

## Calculations

Expectations are preseason over/under win totals. In an 82-game season, candidates
are below 36 expected wins and need 10 wins above their line, rounded up, to
surprise. Shortened seasons scale the cutoff and target. Projected wins multiply
integer wins by season length before dividing, then floor; this avoids floating
point turning an exact 47 into 46.

- Surprise: actual wins have reached the target.
- Eliminated: even winning every remaining game cannot reach it.
- Pace: projected wins minus the target, not wins above the betting line.

Read `src/data/rules.ts` for pure arithmetic, `src/content-utils.ts` for domain and
presentation helpers, and the shared `ui.astro` components for chart/table inputs.
The historical `content-utils` filename remains, but its records are ordinary
objects—not Astro collection entries or references.

## Execution boundaries

1. **Node maintenance:** explicit native `DatabaseSync` handles, transactions,
   validation, migrations, atomic dump publication and safe restore.
2. **Node prerender:** read-only archive queries. Metadata is a generated snapshot
   refreshed explicitly in dev; builds use an isolated database from SQL.
3. **Worker islands/actions:** metadata compiled into code plus current NBA/KV
   data. No native database, filesystem-backed archive, or historical game store.
4. **Browser:** HTML and serialized chart presentation data. No database driver.

`server:defer` changes where a component executes. Shared UI code therefore must
not import archive helpers, even if it is also used statically. The Vite guard
checks actual environments in dev and builds. `SSR` is true in both server
contexts and is not a sufficient boundary. Node's synchronous SQL is suitable
for this bounded local build workload; it is not being proposed for serving
concurrent production traffic.

## Ownership and change

- Metadata edits and archived results require dump/review/build to ship.
- Live results use the existing latest-only action, date gates, validated KV cache
  and stale fallback. There is no automatic archival writeback into SQLite.
- Types describe record shapes and recognized NBA codes. SQL foreign keys and
  runtime validation—not TypeScript alone—prove that relationships exist.
- Historical team identity, name intervals and franchise-history presentation are
  separate concepts; do not rename old chart labels to today's name by accident.
- A local DB notification refreshes dev, never a built preview. This distinction
  is intentional and is checked with external-edit and clean-build controls.

Avoid collection-API emulation, importing SQL through shared rendering helpers,
relying on hidden dev caches, or using a current feed to repair historical data
implicitly. Prefer a small explicit transaction and a visible SQL diff.
