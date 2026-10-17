# Astro / Cloudflare maintenance: deferred architecture inquiry

Recorded 2026-10-17 after the 2026 season launch. This is a discussion record,
not an approved refactor or migration plan.

## Owner's account (verbatim)

> not sure. at this point, have done all the work I'd wanted to do to prep for this season, just about. new season is deployed in prod, will monitor as the season starts this week, but fingers crossed stable
>
> at this point, I want to put this project down for a while, definitely not motivated or have time for any sort of significant refactor or rework, at least not right now. so the fact that I can't load the showdown data locally is annoying, but not the end of the world (though might reassess if I have to push any fixes during the season). not immediately blocking, but something I want to start feeling out how to address long-term. like, I don't want to keep coming back to this project and having to deal with a new set of cloudflare oddities every time I do: this round, which, granted, broader surface given astro's revamping of the cloudflare integration, but still: redoing the data layer due to terrible content collections performance within workerd, reworking our image service due to mishandling svgs, the sentry integration has required several rounds of refactoring, in earlier iterations on the site I've had to tune some low-level vite settings to handle certain deps a certain way.
>
> if I didn't have ai agents, I wouldn't have shipped the work I wanted to, instead would have been bogged down in bug-fixing, so worried that relying on cloudflare and astro together has become too layered a dependency tree to be easily auditable, customized, and fixed. or rather, so many moving parts that prone to breakages. which is a shame because I really like astro, but it's clear that its integrating with cloudflare, as its owning company and primary deployment surface, no less, is not particularly reliable. or at least, it's prone to brutal abstraction leaks. maybe it gets better, but right now, the picture is me needing to wrangle a lot of dependencies in a way that locks me to cloudflare more and more. which, not mad at that, I've really liked deploying to cloudflare, perfect for static sites. and the story of working on the server I think could be strong, but I think the astro and cloudflare integrations have hidden too much from the end user, would be better, I think, to write a worker directly, in cloudflare's standard approach, and somehow explictly connect that to astro's server. more work for devs, but more observable and maintainable over time. no idea what this would look like or how it would work. kinda ties into how I don't always love the mental model of astro local development: like how you have your static pages, but they run through any server tooling e.g. middleware in local dev, but wouldn't in prod, once statically built, but the middleware will run during build i.e. a server affordance affecting build output. that is, feels like there's room for a much cleaner separation of live server and rendering... though not sure what that would look like
>
> all that's to say, no idea what I actually want here. I think, short spike to investigate, see if we can find a bandaid for this issue that would allow me to, with as little fanfar as possible, load the showdown data locally, then leave things alone for now.
>
> then, a separate /grill-me sesssion funneling into an archictectural alternatives investigation would be useful to get some of these ideas down on paper to return to later

## Assistant's summary of the concern

Too many framework, adapter, build, and runtime boundaries interact implicitly,
making occasional maintenance disproportionately expensive. Reliable development
and deployment are the objective; explaining every Cloudflare discrepancy is not.

This does not automatically imply abandoning Astro or Cloudflare. A later
conversation should explore whether more explicit separation between rendering,
live data, and deployment reduces maintenance burden, rather than optimizing for
features or committing prematurely to a migration.

## Agreed scope now

- Production season launch is complete; monitor as regular-season games begin.
- No significant refactor or hosting migration now.
- A roughly 20-minute spike may seek a minimal local Showdown workaround.
- Owner explicitly accepts copying preview KV data into the local KV binding.
  Prefer that over inventing a separate fixture path if it works.
- Do not change production fetching speculatively or clear remote KV again.

## Evidence to retain

- Local Node fetch succeeds; local workerd fetch receives NBA CDN/Akamai 403.
- Owner deleted preview `2026:schedule`, reloaded Showdown successfully, and
  confirmed KV repopulated. This establishes successful fresh deployed fetching.
- Downloaded `2026_schedule` passed the actual cache validator: 622 scheduled
  games, 98 candidate-vs-candidate games, no completed results, nine candidates
  each with 80 assigned games (40 home / 40 away), no duplicate IDs or invalid
  dates found. This is a snapshot, not a promise of a final complete schedule.
- Loader uses global `fetch`, not `node:http`. Node and workerd do not share
  the same fetch/network implementation simply because Node compatibility exists.
- Node HTTPS with workerd-like headers returned 403; adding
  `Accept-Encoding: gzip, deflate` returned 200. Adding the same header to local
  workerd still returned 403. Root cause remains unresolved.
- Earlier browser-style User-Agent rationale and hosted comparisons are recorded
  in [cutover checks](new-season-sweep/hosted-cutover-checks.md). They establish
  that a combination worked, not that Chrome impersonation is necessary.
- Astro dev and standalone Wrangler probes used different local workerd versions;
  both failed. Avoid presenting transport fingerprinting as a proven diagnosis.

## Bounded spike outcome

Copying preview `2026:schedule` into the existing local KV binding works, with
no loader changes or separate fixture implementation. Verified both a fresh
snapshot and an intentionally expired local snapshot in a browser against real
Astro/workerd; both rendered the Showdown calendar without the crash fallback.
Restored the original snapshot afterward. No remote writes or deletions occurred.

[Repeatable commands and caveats](../docs/MAINTENANCE.md#local-showdown-workaround-copy-preview-kv)
include the important startup caveat: `pnpm start` deletes `.wrangler`, so seed
KV after startup. Expired snapshots still permit attempted refreshes and 403 logs;
the existing outage fallback keeps the page usable, not necessarily current.

This workaround meets the immediate local UI-development need without changing
production behavior. The owner subsequently requested another bounded networking
investigation; [additional controls and results](local-workerd-nba-networking.md)
still did not establish a request-only fix. Keep the workaround available.

## Resume later

Start a separate grilling session, then a bounded architecture-alternatives
investigation. Do not resume an open-ended CDN investigation by default.

Questions and possibilities, not decisions:

- Which boundaries need to become explicit and independently observable?
- Can Astro rendering remain while live data uses a directly authored Worker?
- Would a scheduled Node fetch job decouple upstream availability from page loads?
- Would Node/container hosting materially simplify local/production parity?
- Compare Cloudflare Containers with conventional container hosts only after
  checking current architecture, limits, lifecycle and operational burden.
- What changes would preserve preview deployments, static asset serving,
  caching, Sentry, and low-effort seasonal maintenance?
- Which existing patches are one-time migration costs versus recurring costs?

Success means being able to leave the project alone and return for small changes
without rediscovering a collection of adapter/runtime exceptions.
