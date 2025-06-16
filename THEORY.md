# NBA Surprise Teams Tracker - System Theory

## The System Theory

**Central Metaphor:** This system is like a "temporal boundary detector" - it monitors NBA teams crossing the invisible line from meeting expectations to exceeding them, using betting markets as the expectation baseline.

**Core Purpose:** Track teams that significantly outperform pre-season betting expectations (by 10+ wins above their over/under line), providing real-time awareness of which teams are becoming "surprise stories" during the season.

**Key Abstractions:**

- **Expectations = Betting Lines**: Over/under win totals represent collective wisdom about team performance
- **Surprise Threshold**: +10 wins above expectations defines when a team becomes "surprising"
- **Temporal States**: Teams exist in three states - eliminated (can't reach threshold), pursuing (still possible), or achieved (surprise team)
- **Static/Dynamic Boundary**: Past seasons are "frozen" archives, current season is live data
- **Season Lifecycle**: Distinct phases requiring different data strategies (live tracking → archival → historical analysis)

## How to Think About This Codebase

**Mental Model:**

Think of this as a **temporal data pipeline with two parallel tracks**. Track 1 handles "historical certainty" - completed seasons stored as static files where all outcomes are known. Track 2 handles "live uncertainty" - the current season fetched dynamically from NBA APIs, cached strategically, and calculated in real-time.

The system's intelligence lies in **knowing when to switch tracks**. During a season, it's a live dashboard. After a season ends, it becomes a historical archive. The architecture enforces this temporal boundary through data loading patterns - static content collections for the past, dynamic loaders for the present.

The core calculation engine treats **betting lines as truth about expectations**. Everything flows from this: if Vegas says a team should win 45 games, and they're on pace for 58, they're a "surprise team." The system doesn't judge the quality of this approach - it executes this logic consistently and efficiently.

**Decision Rationale:**

- **TypeScript Literal Types**: Chosen over traditional validation to catch data entry errors at compile time. The `SeasonId` and `TeamCode` types prevent invalid queries like asking for "Warriors in 1985" before they existed as GSW.

- **Hybrid Static/Dynamic**: Static files for past seasons optimize performance and reliability (no API dependencies for historical data), while dynamic loading for current season provides real-time updates. This acknowledges that data needs change after temporal boundaries.

- **Astro Content Collections**: Selected to leverage build-time optimization for static data while allowing runtime flexibility for dynamic data. The type system integration provides end-to-end safety.

- **Emoji-Based Team Icons**: Chosen over traditional logos for copyright simplicity and visual distinctiveness, with custom SVGs providing consistent styling.

## Working With This System

**Similarity Patterns:**

- **New Statistical Calculations**: Add to `content-utils.ts` alongside existing functions like `pace()`, `isSurprise()`, `isEliminated()`
- **UI Components for Team Data**: Follow the pattern in `components/team-stats/` with separate SSR and UI layers
- **New Season Data**: Goes in `src/content/` JSON files, following the established schema patterns
- **Live Data Modifications**: Extend `src/loaders/live.ts` loader logic
- **Archive Logic**: Modify `archiver/script.ts` for end-of-season data processing

**Exploration Path:**

1. **Start with `src/content-utils.ts`** - This contains the core business logic. Understanding `winsToSurprise()`, `pace()`, and related functions reveals the system's mathematical foundation.

2. **Examine `src/content.config.ts`** - See how the type system enforces data relationships and valid combinations.

3. **Trace a data flow**: Pick either static (`src/content/games.json` → content collections → pages) or dynamic (`src/loaders/live.ts` → KV cache → components) to understand the dual-track approach.

4. **Review seasonal boundaries**: Look at `getSeasonSurpriseRules()` to understand how shortened seasons are handled differently.

**Red Flags:**

- **Bypassing the type system** - If you're casting `as any` or ignoring TypeScript errors, you're probably working against the design intent
- **Mixing static and dynamic data sources** - Each has its place; don't try to make archived seasons dynamic or current seasons static
- **Hardcoding team/season combinations** - The system is designed to be data-driven; let the content collections and types guide valid relationships
- **Ignoring timezone handling** - All NBA scheduling is Eastern time; the system has utilities for this - use them
- **Creating manual game ID formats** - Use `formatGameId()` to maintain consistency

## Visual Model

```
Time Axis: Past ←→ Present ←→ Future

Static Track (Past Seasons):
[JSON Files] → [Content Collections] → [Static Pages] → [Archive UI]

Dynamic Track (Current Season):
[NBA API] → [Live Loader] → [KV Cache] → [Dynamic Pages] → [Live UI]

Business Logic Layer (Both Tracks):
[Over/Under Lines] + [Game Results] → [Surprise Calculations] → [Team Status]

Type Safety Boundary (Compile Time):
[Season IDs] × [Team Codes] → [Valid Combinations Only]
```

The key insight is that **time creates the natural architectural boundary**. The system doesn't try to force one approach everywhere - it acknowledges that historical data and live data have fundamentally different characteristics and optimizes for each accordingly.
