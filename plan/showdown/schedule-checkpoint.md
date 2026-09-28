# Checkpoint 2b — upcoming schedule and cache handling

- `loader(seasonId, { includeSchedule: true })` returns a scoreless full candidate
  schedule alongside unchanged completed `games`, from one NBA request.
- Both selection paths exclude Cup championship and dates outside the season.
  Explicit home/away, optional start time, and scheduled/pending/postponed/final
  states are normalized. TBD starts stay unspecified; no 0–0 placeholders.
- Completed results now require NBA status 3 plus positive scores. In-progress
  scores never enter standings. This conservative interpretation needs the
  existing real-game preseason observation check; cache version bumped.
- Action opt-in is preseason-capable and uses `<seasonId>:schedule` rather than
  the results-only key. Results-only consumers retain their existing contract.
  Missing schedule/current-season mismatches cannot satisfy a schedule request;
  valid stale schedules survive upstream outages without fresh cache headers.
- Pending schedules refresh at least every six hours, or sooner according to the
  existing estimated-finish/retry calculation. Schedule edits are not cached
  until a distant tipoff. Reset both KV keys when manually troubleshooting.
- Showdown merges results with fixtures by NBA identity, avoids duplicate final
  games, displays upcoming times in Eastern, labels TBD/postponed/awaiting-final
  fixtures, and offers a jump-to-next link. Only actual final scores are shown.
- Canonical 2026 candidates are not published yet: the homepage stays on its
  countdown, so public review continues to use historical pages. Automated
  fixtures exercise preseason/live behavior without publishing fake odds.

## Verification

Full build/verification: 245 tests passed. Browser exercised actual deferred
islands at 1440px and 390px using temporary local-only CHA/POR candidate odds
and a local KV schedule normalized from the real 2026–27 NBA feed. Both upcoming
head-to-heads rendered start times, no scores, zero records, and a working next
matchup anchor; no horizontal overflow. The temporary odds and KV seed were
removed and canonical DB/dump parity rechecked before committing.

The Node feed request succeeds, but direct fetch from local workerd returned
NBA HTTP 403. The error component was verified first; the KV-seeded browser run
therefore verifies island/cache/UI behavior, **not** successful local upstream
fetching. Hosted NBA access was previously verified during production cutover;
active-season end-to-end refresh should be rechecked after real candidates are
published. No diagnostic route or fake candidate data is deployed.

Tests cover optional schedule shape, single fetch, exclusion rules, final-only
selection, refresh cap, TBD/postponements, schedule cache isolation and outage
fallback, cross-season rejection, candidate filtering and deduplication.
