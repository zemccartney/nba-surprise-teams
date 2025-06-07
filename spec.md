# Data Validation System Specification

## Overview
Create a Vitest-based validation system to enforce data integrity rules documented in MAINTENANCE.md, preventing deployment of invalid data configurations.

## Architecture
- **Single test file**: `system.test.ts` 
- **Framework**: Vitest
- **Execution**: `npm test` (manual) + integrated into `npm run build` (blocking)
- **Error reporting**: Comprehensive (all errors at once)

## Validation Categories

### 1. Season Data Rules
- **Past seasons** (end date + 15 days < today):
  - Must have complete static games data (82 games per surprise team)
  - Must have team seasons defined
- **Current/upcoming seasons**:
  - Must NOT have static games data
- **Business logic**:
  - Only one current/upcoming season allowed
  - No overlapping season date ranges

### 2. Convention Rules (from MAINTENANCE.md)
- **Grace period convention**: Leniency for most recently past season (15-day grace period for incomplete data)
- **Season timing convention**: Build should fail if next season added too early (season start date > ~90 days away, preventing premature home page changes)

### 3. Referential Integrity
- Team IDs consistent across `teams.json`, `teamSeasons.json`, `games.json`
- Season IDs consistent across `seasons.json`, `teamSeasons.json`, `games.json`
- Game participants must be surprise team candidates for that season
- All IDs unique within their respective files

### 4. Chart Hardcoding Detection
- Parse chart components for hardcoded numeric values
- Compare against actual data ranges to detect potential breakage
- Focus on obvious patterns (axis limits, data thresholds)
- **Stats page top-10 table**: Validate that 11th team has different pace value than 10th (no ties cutting off teams from top 10)
- Start simple, expand as needed

## Implementation
- Add `vitest` dependency
- Create `system.test.ts` with describe blocks for each category
- Add `"test": "vitest run"` to package.json
- Modify `"build"` script to run `npm test &&` before existing build command

## Integration Points
- Manual development feedback: `npm test`
- Build-time enforcement: Modified `npm run build` 
- 15-day grace period for recently ended seasons

This gives you comprehensive data validation without complexity overhead, fitting naturally into your existing workflow.