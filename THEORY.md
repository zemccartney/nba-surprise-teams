# NBA Surprise Teams Tracker — System Theory

## The System Theory

**Central Metaphor:** This system is like a "temporal boundary detector" — it
monitors NBA teams crossing the invisible line from meeting expectations to
exceeding them, using betting markets as the expectation baseline.

**Core Purpose:** Track teams that significantly outperform preseason betting
expectations, providing real-time awareness of which teams are becoming surprise
stories during the season. In an 82-game season, candidates have an over/under
below 36 wins and need 10 wins above their line, rounded up, to surprise.
Shortened seasons scale the cutoff and target.

**Key Abstractions:**

- **Expectations = Betting Lines:** Over/under totals represent market expectations.
- **Surprise Threshold:** The scaled target defines when a team is surprising.
- **Temporal States:** Teams are eliminated (cannot reach the target), pursuing
  (still possible), or achieved (a surprise team).
- **Static/Dynamic Boundary:** Archived seasons are frozen; unarchived seasons use
  the live path. The clock validates lifecycle rules, but does not silently archive.
- **Season Lifecycle:** Live tracking → explicit archival → historical analysis.

## How to Think About This Codebase

Think of this as a **temporal data pipeline with two parallel tracks**. Track 1
handles historical certainty: completed seasons where all outcomes are known.
Track 2 handles live uncertainty: current results fetched from NBA APIs, cached
strategically, and calculated on demand.

The system's intelligence lies in **knowing when to switch tracks**. During a
season, it is a live dashboard. After explicit archival, it becomes a historical
record. A working SQLite database supports editing; a reviewed SQL dump supplies
reproducible builds. No SQLite service is deployed to production.

The core calculation engine treats **betting lines as truth about expectations**.
It does not judge the quality of that baseline. It executes the rules consistently:
for a candidate with a 25.5-win line, 36 wins reaches the standard-season target.
Pace is projected wins minus that target, not wins above the betting line.

**Decision Rationale:**

- **Types plus validation:** TypeScript describes plain records and recognized NBA
  codes. It does not prove a team existed in a particular year. SQL constraints
  and domain validation prove relationships and dataset consistency.
- **Hybrid Static/Dynamic:** Static historical pages avoid runtime NBA dependencies;
  deferred components serve current results. Data needs differ across time.
- **SQLite and canonical SQL:** Relational constraints protect editing; an explicit
  dump/review/build boundary makes historical changes auditable. Small metadata
  snapshots let Worker components share identities and rules without archived games.
- **Emoji-Based Team Icons:** Visual distinctiveness and copyright simplicity,
  with custom SVGs for consistent styling.

## Working With This System

**Similarity Patterns:**

- **New Calculations:** Pure arithmetic goes in `src/data/rules.ts`; domain and
  presentation helpers live in `src/content-utils.ts`.
- **UI Components:** Follow `src/components/team-stats/`, separating data access
  from shared UI. Static wrappers can query archives; deferred wrappers cannot.
- **New Season Data:** Use `data/cli.ts` to edit the DB, validate, dump, and review.
  Shapes live in `src/data/model.ts`; schema migrations live in `data/migrations/`.
- **Live Data Modifications:** Extend `src/loaders/live/index.ts`; feed and cache
  helpers live in `src/loaders/live/utils.ts` and neighboring modules.
- **Archive Logic:** `data/node/nba-archive.ts` decodes historical feeds; CLI
  commands explicitly fetch or import archives inside validated transactions.

**Exploration Path:**

1. Start with `src/content-utils.ts` and `src/data/rules.ts`: understand
   `winsToSurprise()`, `pace()`, and the shortened-season rules.
2. Examine `src/data/model.ts`, `data/migrations/`, and `data/node/validate.ts`:
   distinguish record shapes, relational guarantees, and business invariants.
3. Trace either static (`data/dump.sql` → temporary SQLite → prerender → HTML)
   or dynamic (metadata + NBA → validated KV cache → deferred UI) data flow.
4. Read [the visual system guide](docs/data-system.html) for the runtime map, then
   [data/README.md](data/README.md) for editing and recovery commands.

**Red Flags:**

- **Bypassing validation:** Type assertions do not make arbitrary data trustworthy.
- **Mixing static and dynamic data sources:** Do not import archive access into
  shared UI or Worker modules. `server:defer` changes the execution environment.
- **Hardcoding team/season combinations:** Let validated records drive routes.
- **Ignoring timezones:** NBA scheduling and archival eligibility use Eastern dates.
- **Inventing game identities:** Use the existing date/team normalization; NBA IDs
  are additional provider identifiers, not a replacement for application IDs.
- **Trusting implicit refresh:** External DB writes need validation and notification
  for dev; preview requires a new dump and build.

## Visual Model

```text
Time Axis: Past ←→ Present ←→ Future

Static Track (Archived Seasons):
[Working SQLite] → [Reviewed SQL Dump] → [Build Snapshot] → [Static Pages]

Dynamic Track (Unarchived Season):
[Embedded Metadata] + [NBA API] → [Live Loader] → [KV Cache] → [Deferred UI]

Business Logic Layer (Both Tracks):
[Over/Under Lines] + [Game Results] → [Surprise Calculations] → [Team Status]

Integrity Boundary:
[Typed Records] + [SQL Constraints] + [Domain Validation] → [Trusted Dataset]
```

The key insight is that **time creates the natural architectural boundary**.
Historical certainty and live uncertainty have different needs. Explicit data
ownership and archival transitions keep that boundary understandable and reliable.
