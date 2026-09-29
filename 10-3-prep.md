- [ ] Delete pages deployment
  - [ ] delete from CF
  - [ ] navigate to prod workers deployment, verify traffic still landing correctly
- [ ] Run lighthouse on prod / set up way to run programmatically (across all / sample of pages somehow?)
- [ ] Track live behavior during first pre-season game
  - [ ] see docs/MAINTENANCE.md, using check-nba-feed.ts script (make into mise task?)
- [ ] Improve data:reset, address issues flagged

"- Stop the app and close SQLite clients first. Deleting an open DB and its sidecars is unsafe. Add that warning to the task description/comment.

- It deletes the existing DB before validating the dump. If restoration fails, the old DB is gone. That matches your requested hard-reset behavior, but is worth making explicit.

mise run data:restore inside the task is valid. Restore already validates and sends the refresh notification, so no extra check/notify is needed."

- why is deleting an open db unsafe?
- what would good protection again deletion looks like?
  - restoration failing? what might cause that? what could we anticipate?

- [ ] Check: were odds posted yet? if so, update site
  - [ ] learn sqlite CLI better
  - [ ] review upcoming season showdown calendar, verify accurate
- [ ] How is Pi using the browser? chrome-dev-tools mcp? installing puppeteer somehow?
- [ ] Review and audit MAINTENANCE.md in general, make sure familiar
  - [ ] reset reminders
- [ ] Try setting up onboarding / learning goal tour w/ Cat Hicks' skill
- [ ] Figure out observability: sentry? worker observability? browser vitals tracking??? otel? should actually learn about observability

## Code review log

- consolidate script interface: package.json vs. mise?
- is mise even used in our github action?
- library for calling github actions locally? use that to support local deploys somehow?
- did some weird shit with backfilling venues, need to take a closer look
- deviated from polymorphic component pattern for showdown

## Revisit pnpm audit usage

- How do we validate build output (bundled could include dev deps)?
- Seems reasonable to audit dev deps, too ... how do we flag temporary exceptions? mainly worried about lows/moderates blocking deployment
  - don't want to be using vulnerable dev tools locally e.g. if vuln is an exfiltration attack, for example

They’re two different ways of determining what “production” includes:

- pnpm audit --prod follows package dependencies: everything under dependencies, plus their transitive dependencies. It excludes packages reachable only through devDependencies.
- The deployed Worker contains bundled code: the server modules Astro/Vite actually include, plus whatever code or dependencies are retained in the deployment output. Build tooling generally stays behind.

In our project, for example:

```text
  dependencies
  └─ @astrojs/cloudflare
     └─ wrangler / miniflare
        └─ undici
```

That chain is included in --prod because the adapter is a production dependency. But Wrangler and Miniflare are deployment/local-runtime tooling—not normally code executing inside the deployed Worker. So that
undici finding doesn’t, by itself, demonstrate an exposed vulnerability on the live site.

The reverse distinction matters too: a devDependency can execute during CI with access to source files and credentials, despite never shipping to the Worker.

So --prod is a useful package-level filter, not a runtime-exposure assessment. We’d need to inspect the build output and vulnerable code path to establish whether a particular advisory affects production
requests.
