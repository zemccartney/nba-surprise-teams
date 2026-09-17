# SQLite application migration — in progress

Work lives on `sqlite-content-store`, branched from `chart-parity`. The planning
and prototype material on `chart-parity` has not been edited for this checkpoint.
**The application still consumes content collections.** Its JSON remains the
source of truth until the consumer migration and operational gates are complete.
This directory is the application foundation, not a second live data source.

## Execution boundary

`astro.config.mjs` enables Cloudflare's Node `prerender` environment and installs
`runtime-boundary.ts`. Islands, actions and on-demand routes remain in workerd's
`ssr` environment. `import.meta.env.SSR` and production/development flags cannot
distinguish those roles. A component's filename cannot determine its role either.

- `data/node/` owns native SQLite, filesystem operations and Node maintenance code.
- `virtual:tracker/archive` is reserved for the prerender-only archive facade.
- `src/data/catalog.ts` owns plain metadata lookups and has no SQLite dependency.
  The upcoming generated Worker catalog will use it; shared presentation code can
  use that catalog without accessing SQL.
- The guard rejects native SQLite imports and Node data modules outside
  `prerender`, during dev module loading and production compilation. It also
  checks the build graph, including dynamic import edges.
- Vite can externalize builtins before resolution/load hooks run. Transformed
  JavaScript imports, re-exports, literal dynamic imports and literal `require`
  calls therefore get checked too. This is an architectural guardrail, not a
  sandbox against deliberately disguised/computed imports.
- Dependency optimization excludes the archive facade/native builtin because
  scanning also visits static-route source. Actual runtime imports stay guarded.
- Native Node maintenance commands are intentionally permitted. Vitest runs the
  maintenance tests in Node, without the application guard, while dedicated
  boundary tests instantiate real guarded Vite servers/builds.

### Actual Astro negative control

An independent copy (including independent cloned dependencies) used this
component, unchanged between static and deferred usage:

```astro
---
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync(":memory:");
const row = db.prepare("SELECT 42 AS answer").get();
db.close();
---

<p>SQLite answer: {row.answer}</p>
```

1. Render `<Probe />` from a static page: dev HTTP 200, `SQLite answer: 42`.
2. Add another page rendering `<Probe server:defer />`.
3. Request that page, then its generated `/_server-islands/Probe/` URL: island
   HTTP 500 with `[sqlite-boundary] node:sqlite is prerender-only; attempted access
from ssr`. The failure came through the actual workerd runner.
4. Stop dev and build: exit 1 with the same boundary error.
5. Remove only the deferred-use page and build again: exit 0; static HTML contains
   `SQLite answer: 42`.

These probes are not application routes. The test copy's dev process was stopped.
This establishes role-based enforcement, not just a filename convention.

## Persistence foundation

- `migrations/001-initial.sql` retains the proven prototype relational schema.
- `002-archive-identifiers.sql` adds optional NBA game IDs and explicit display
  ordering. Preserving original metadata order protects stable chart/table ties;
  deterministic dumps still order rows by primary key.
- `node/database.ts` provides transactional migrations, read snapshots, plain
  domain decoding, deterministic buffered dumps, and non-overwriting restore.
  It does not silently create a missing working database during reads/checks.
- `node/import-json.ts` is a transitional one-time importer, not a build input.
- `src/data/model.ts` defines plain validated domain records; no Astro collection
  references or `.data` wrappers are introduced.

Tests compare all existing records and their ordering with the JSON source,
exercise schema-1 upgrades, preserve optional NBA IDs and check dump/restore
stability. The native Node importer was also executed without Vite: 269 team
seasons imported successfully. Full verification: **137 tests / 15 files**, no
Astro diagnostics, format/lint/workflow checks pass; normal application build
passes. No push or deployment occurred.

## Remaining before application review

1. Wire Node archive queries and generated metadata to the actual application;
   build from an isolated database restored from the canonical dump.
2. Replace every collection consumer with plain records, extracting shared pure
   domain calculations so SSR helpers cannot import the archive facade indirectly.
3. Migrate actions/islands/live-loader metadata without changing NBA/KV behavior.
4. Finish metadata editing, archive ingestion, validation, notification, dump and
   actual-staged-index checks. Add migration failure/rollback negative controls.
5. Replace content-shaped mocks; remove collections, duplicate JSON ownership and
   obsolete prototype machinery only after full source/route/chart parity.
6. Enforce final artifact exclusions, clean-checkout builds, dev refresh and
   desktop/mobile/keyboard parity, then stop for integrated-application review.

The current build still includes the legacy collection machinery. Passing the
new SQL boundary is **not** a claim that archived JSON is absent from its Worker.
