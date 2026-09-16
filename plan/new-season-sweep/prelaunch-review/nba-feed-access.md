# NBA feed access investigation

**Update:** Zack's Referer-equipped `scr.ts` subsequently succeeded; I repeated
it successfully and fetched a parsed HTTP 200 snapshot. The loader now sends
that header per his direction. See [feed-semantics.md](feed-semantics.md).
The unsuccessful probes below are historical, not a current local access blocker.

Paused further live-action review to investigate Zack's independently reproduced
HTTP 403 in `scr.ts`. That file and application code were not edited during this
investigation. All network probes were read-only and local; no remote Worker,
KV access, commit, push or deployment.

## Observed results

| Request                                                                                            | Result here                                  |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Configured CDN `staticData/scheduleLeagueV2_1.json`, original headers                              | 403                                          |
| Older `staticData/scheduleLeagueV2.json`                                                           | 403                                          |
| Current nba_api live `liveData/scoreboard/todaysScoreboard_00.json`                                | 403                                          |
| Schedule and scoreboard with `Referer: https://www.nba.com/`                                       | 403                                          |
| Schedule with browser-style headers and Referer                                                    | 403                                          |
| Schedule with the complete header set suggested in issue 665, including Origin and non-www Referer | 403                                          |
| Supplied nba.com schedule-page URL, curl and automated system Chrome                               | 403                                          |
| Bare nba.com/schedule URL                                                                          | 403                                          |
| stats.nba.com/stats/scheduleleaguev2?LeagueID=00&Season=2026-27                                    | Timed out after 25 seconds; no HTTP response |

Chrome received an Akamai/edgesuite Access Denied page, not the schedule app.
Thus there was no schedule application/network graph to crawl successfully. We
cannot claim which endpoint the current rendered page uses based on that run.

## Relevant upstream evidence

- [Issue 665: our exact schedule URL](https://github.com/swar/nba_api/issues/665),
  opened April 17, 2026. The author identifies it as the website's schedule
  endpoint. Comments report Access Denied for some callers while another caller
  continued using it from a home server. A header workaround was shared; the
  latest comment in July reports that workaround failing too.
- [Issue 670: live CDN failures](https://github.com/swar/nba_api/issues/670):
  multiple May reports, with some users confirming a Referer workaround.
- [PR 671](https://github.com/swar/nba_api/pull/671): proposes adding
  `Referer: https://www.nba.com/` to live requests. Still **open/unmerged** when
  inspected; the fetched master live HTTP implementation lacks that header.
- [Issue 678](https://github.com/swar/nba_api/issues/678) distinguishes CDN 403
  HTML responses from the misleading JSONDecodeError produced by the library.
- [PR 679](https://github.com/swar/nba_api/pull/679) proposes improved response
  errors along with the Referer change. Reports are evidence of the problem,
  not a verified fix for our execution environment.
- [Current scoreboard documentation](https://github.com/swar/nba_api/blob/master/docs/nba_api/live/endpoints/scoreboard.md)
  still names the CDN live URL tested above. Today's scoreboard is not a
  season-to-date replacement; switching to it would require an ingestion/history
  design and would not inherently solve CDN access.
- [ScheduleLeagueV2 documentation](https://github.com/swar/nba_api/blob/master/docs/nba_api/stats/endpoints/scheduleleaguev2.md)
  exposes an explicit-season stats endpoint. It is a candidate to evaluate,
  not a verified working alternative here.

## Conclusion and next discriminating checks

This is a real upstream access/reliability concern, not evidence that we merely
misspelled or failed to update a retired endpoint. Existing public reports fit
access restrictions that vary by caller/request. Our observations do not isolate
IP/network reputation, request headers, browser state or another edge policy as
the precise cause. They also do not establish production Workers behavior.

1. Can Zack's ordinary browser load the schedule page? If so, inspect its actual
   successful schedule request in DevTools. Capture the public URL, status and
   relevant headers/response shape, excluding cookies and authorization data.
2. With coordination, test the selected public URL from Cloudflare execution
   without touching application KV or production routing. Local workerd has
   local egress and cannot settle this question.
3. Require demonstrated access and correct payload semantics before choosing a
   header/endpoint change. If official-source access cannot be made dependable,
   evaluate an alternative data provider or ingestion architecture explicitly.

The preseason action guard means current website rendering does not exercise
this upstream fetch. Cached output is likewise not proof of upstream health.
Treat reliable feed access as a live-operation gate. No speculative header fix,
endpoint switch or workaround is shipped from these unsuccessful probes.

Scratch evidence: `/tmp/nbastt-feed-browser.txt`, `/tmp/nba-api-issues.json`,
`/tmp/nba-665-comments.json`, `/tmp/nba-670-comments.json`,
`/tmp/nba-671-pr.json`, and the `/tmp/nba-schedule-*` probe files. These are
local investigation artifacts, not tracked provider fixtures.
