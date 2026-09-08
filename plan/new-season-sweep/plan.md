I'm preparing for the upcoming season, have a pile of maintenance I want to do, on top of the regular data importing / updating:

- finish dropping tailwind (currently in progress)
  - I believe this was started with an agent ages ago, no idea if any record of the session involved, if any context worth recalling there.
  - my main concern is dropping tailwind, so can write in regular css; even before the advent of agents, I was realizing that I preferred writing in base css over tailwind anyway
- bring dependencies up to date, resolve major releases
  - mainly thinking about Astro, wanting to leverage a bunch of the new features included in major releases over the last year
  - I did some prep for a similar migration in my open source meta tag manager library, you can see in /Users/enlow/proj/grepco/opensource/pagemeta/planning, in the artifacts folder, I believe, I had an agent pull the release notes for astro since the currently used version, tally up the features released, breaking changes to resolve, upgrades to make
  - one thing I know I want to address is adding a strict CSP; I want to add that, then see how it was implemented / how to possibly extend that; I see the value of CSP as blocking accidentally registering scripts or at least, having a clear log of the sources we've allowed, documented for why we allow them

- tooling migrations: I've since changed tooling I prefer, want to switch a handful of things
  - pnpm over npm, with strict supply chain security settings
  - lefthook over pre-commit
  - eslint's native typescript support i.e. allowing using a .ts eslint config file: https://eslint.org/docs/latest/use/configure/configuration-files#native-typescript-support
  - refer to `/Users/enlow/proj/grepco/opensource/pagemeta`; most of these tooling preferences come from my work on that project; worth assessing the latest state of those tech choices, if anything's evolved in recent time, but have generally found those choices useful; `pnpm` is the critical one
  - bump node version used to 24

- of course, regular maintenance; archiving last season and setting up the upcoming season, since its schedule has already been released
- light mode: I started this conversion in the `light-mode` branch; that shows some of the colors I settled on
  - if I recall right, the migration is part way done; one sticking point: I wanted to style the control to switch modes as a light buld, I was struggling with nailing the style for the light bulb's glow

- half-baked idea: convert our static content collection to a sqlite db? or could write it as a sqldump, that could be migrated into a migration / dumpfile, so edits would be human readable, could migrate into the db as part of pre-commit
  - sqlite still allows us to produce a wholly static build for content, but gives us the referential integrity that astro content collections don't, that I'm checking via our tests

- new feature: adding a surprise team head to head calendar i.e. a page per year, that shows match ups between surprise teams. thinking of this as a fun, very dumb feature, effectively showcasing some of the worst matchups of the schedule
  - structure would be
    - title: SURPRISE SHOWDOWN
    - icon: the image in the favicon (a face with basketballs over its eyes), two punching bag emojis facing each other, the clown emoji (I can download and provide)
    - question mark, opens dialog for info text: roughly
      - are these games good?
      - isn't there an effectively random distribution of match ups across these teams?
      - why? and, follow up, how come?
      - {{ picture of a plate of spaghetti behind Tuomas Isalo }}
      - {{ alternatively, "it's illegal for you to ask me that" }}
      - love the hoops you want; my favorite part of the season is, like, mid-January, when teams are firmly in just-getting-through-it mode. is what it is
    - standings table: showing each team's wins and losses
    - a list of the matchups
      - date in a big heading
        - each match up on that date: each team emoji, enlarged, @ symbol between them
        - scores beneath respective icons

- replace recharts with e-charts, if possible, which I suppose would mean ripping react out of this site, which would be ideal
  - i think using mainly for radix's popover, which is easily supported with the popover/dialog natively built into HTML now
  - being able to cut all react tooling would make this site so much nicer to work on and lighter

- open graph image: I want to follow this article's approach https://cassidoo.co/post/og-image-gen-astro/ , except without publishing the preview route; I want to author and generate a single open graph image for the whole site; I want just the page to play with, then I'll style it myself

## Verification

- I want to take this work slowly, manually testing after each round, with you giving me a tour / explaining key points, key code to look at, and how you would suggest testing, before I dig in

Things I'm worried about:

- accidentally breaking the sentry integration; that's been finnicky in the past, I want to review, make sure still working as expected, I receive errors in my sentry account
- not understanding the full scope of changes from Astro upgrades
- styling regressions, site size regressions, other regressions on site behavior that are hard to measure without first taking some sort of baseline. Could take a build from main to start? or could even benchmark from the live site, `nbastt.grepco.net`
  - will definitely want to re-test the server islands caching behavior, that was a bit finnicky to get right
  - I added a chrome dev tools mcp project, figure useful to call the browser to get more realistic readings

## Prioritization

Roughly, 3 groups

1. foundations

- deps upgrades
- finish removing tailwind, since far enough along
- tooling migrations

milestone: site still stable; renders exactly as it did, will launch to prod when done; no user-facing changes, just different tooling / scripts

2. season prep

- pulling in new data
- archiving last season

milestone: has to be done, bare minimum for getting site prepared for the new season

3. features I really want to land for this season, as exciting add-ons

- light-mode
- surprise team showdown view
- open graph image (so minorly nicer to share on socials)

4. quality of life improvements

- change trailing slash settings, make more explicit per Astro's docs, have prod and local behave consistently i.e. so trailing slash issue in subnav isn't a surprise
- sqlite idea
- removing react, switching to e-charts
