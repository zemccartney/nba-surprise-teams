# Test Validation Checklist

To verify each test works correctly, we'll temporarily break the system in specific ways to ensure each test fails as expected.

## Season Rules Tests

### 1. "past seasons must have complete static games data" COMPLETE

- **Temporary change**: Delete some games from a past season's games.json file, or modify a team season to expect more games than exist
- **Expected failure**: Test should fail when a team doesn't have the expected number of games (82 or shortened season count)

### 2. "current/upcoming seasons must not have static games data" COMPLETE

- **Temporary change**: Add some games data for a future season (create fake games.json entries with future seasonId)
- **Expected failure**: Test should fail when it finds games data for seasons that haven't ended yet

### 3. "only one current or upcoming season allowed" COMPLETE

- **Temporary change**: Add a second season with future end date to seasons.json
- **Expected failure**: Test should fail when more than one season has an end date in the future

### 4. "no overlapping season date ranges" COMPLETE

- **Temporary change**: Modify two consecutive seasons to have overlapping date ranges (e.g., make 2023-24 season end after 2024-25 season starts)
- **Expected failure**: Test should fail when season date ranges overlap

### 5. "season timing convention - prevent premature next season addition" COMPLETE

- **Temporary change**: Add a season with start date more than 90 days in the future
- **Expected failure**: Test should fail when a future season is added too early (>90 days away)

## Referential Integrity Tests

### 6. "all IDs unique within their respective files"

- **Temporary change**: Duplicate an ID in any of the content files (seasons, teams, teamSeasons, or games)
- **Expected failure**: Test should fail when duplicate IDs are found

### 7. "team IDs consistent across all files"

- **Temporary change**: Add a teamSeason or game reference to a team ID that doesn't exist in teams.json
- **Expected failure**: Test should fail when referencing non-existent team IDs

### 8. "season IDs consistent across all files"

- **Temporary change**: Add a teamSeason or game reference to a season ID that doesn't exist in seasons.json
- **Expected failure**: Test should fail when referencing non-existent season IDs

### 9. "game participants must be surprise team candidates"

- **Temporary change**: Add a game with teams that aren't in the teamSeasons collection for that season
- **Expected failure**: Test should fail when games include teams that aren't surprise team candidates

## Chart Hardcoding Tests

### 10. "stats page top-10 table - no ties at cutoff"

- **Temporary change**: Modify pace calculations or add duplicate pace values to create ties that would break the top-10 logic
- **Expected failure**: Test should fail when there are too many items with the same pace value that would interfere with the top-10 display

## Notes

- Some tests may be skipped if there's no games data available (graceful degradation)
- Make sure to revert all temporary changes after validation
