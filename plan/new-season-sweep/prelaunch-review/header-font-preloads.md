# Header-font preloads — promoted after built-preview approval

Zack approved the built appearance and requested the change in the main checkout.
The two preload links and Vite font URL import are now in `src/layouts/layout.astro`.
No font-display, font family, chart font wait, package or rendering changes.
Node prerender and SQLite remain separate, unpromoted application changes.

The disposable dev server later reported `Tsconfig not found astro/tsconfigs/strictest`;
its installed Astro `tsconfigs/strictest.json` is now missing, while the main
checkout's file is present. Why it disappeared is not established. No tsconfig
workaround is part of this change. The results below describe the earlier
successful captures.

Promotion validation: a fresh copy using the main checkout's unchanged workerd
prerender configuration passes generated Worker types, full verify (127 tests),
and a credential-free build. Both preload links are present in built HTML.

## Review URLs

- Candidate dev: <http://127.0.0.1:4332/stats/>
- Candidate built: <http://127.0.0.1:4333/stats/>
- Controls: Node-only dev on 4331; built original pages on 4330.

Click Archive → About → Stats repeatedly, including the first visit in a fresh
browser session. Try desktop and mobile widths. Check the site title and the
position of the navigation, not chart animation. Candidate directory/PIDs:
`/tmp/nbastt-header-preload-path.txt`, `/tmp/nbastt-header-preload-pids.json`.
Existing reference servers were not changed.

## Change and mechanism

The existing layout discovers Sixtyfour and ChicagoKare through CSS, both with
`font-display: swap`. A full-document navigation creates new font faces even
when bytes are cached. The initial probe saw the desktop title change from
187px to 312px wide as Sixtyfour became available, moving the adjacent nav.
A font request finishing in roughly 1ms does not guarantee first-layout readiness;
this is not necessarily a repeat download of the whole font file.

The candidate adds two `as="font"`, `type="font/woff2"`, anonymous-CORS preload
links in the shared document head:

- Sixtyfour Latin, imported with Vite `?url`, matching the existing font-face URL
  in dev and its hashed asset URL in the build.
- `/fonts/ChicagoKare-Regular.woff2`, matching the existing body/nav face.

No Iosevka preload and no removal of the explicit chart font wait. Both header
fonts have exactly one resource-timing entry per measured navigation: no
mismatched-URL duplicate fetch was observed.

## Measurements

Chrome 152, no throttling, normal motion. Five fresh browser contexts per variant;
each visits Stats, then clicks Archive → About → Stats. Variant order alternates.
This is 80 desktop navigations at 1440×900. A separate 390×900 smoke capture uses
one fresh context per variant, four navigations each.

| Variant        | Desktop navigations with sampled geometry change | Mobile |
| -------------- | -----------------------------------------------: | -----: |
| Dev control    |                                          20 / 20 |  4 / 4 |
| Dev preloads   |                                           0 / 20 |  0 / 4 |
| Built control  |                                           5 / 20 |  1 / 4 |
| Built preloads |                                           0 / 20 |  0 / 4 |

Built-control changes occurred only on the first visit in each context; warm
built navigation was already stable. Candidate preloads eliminated the sampled
initial-to-final header width/position changes in this run.

**Limits:** requestAnimationFrame geometry samples are not filmstrip proof of
what every compositor frame painted. In this capture the fallback geometry
samples precede the reported first-contentful-paint timestamp; do not claim
20 independently filmed visible flashes. The user's visible report and the
measured font/geometry transition motivate the experiment; manual review remains
the acceptance gate. Fresh contexts are not an OS/browser-process font-cache
reset, and these timings do not establish behavior under every network/device.

The built control uses the SQLite pilot copy's **unchanged original pages**, not
its diagnostic routes. Its compiled layout CSS is byte-identical to the candidate.
Global CSS, subpage markup/styles and chart font-wait source are also byte-identical.
The candidate was copied from the configuration-only `e2a8b30` Node control;
its only application-source change is the shared layout preload patch.

## Verification and reproduction

Candidate focused lint/format, Astro check and credential-free build pass.
Browser captures report no page errors and assert one resource entry per header
font per visit. Source checks confirm unchanged CSS and chart waits.

- Reversible patch: `plan/baseline/header-font-preloads.patch`.
- Harness: `plan/baseline/header-font-preloads.mjs`.
- Compact evidence: `plan/baseline/runs/header-font-preloads/{desktop,mobile}.json`.
- Full raw samples: `/tmp/nbastt-header-font-preloads.json` and
  `/tmp/nbastt-header-font-preloads-mobile.json`.
- Build/type logs: `/tmp/nbastt-header-preload-{build,check}.log`.

To reproduce, use an external copy with the Node-prerender option and its own
installed dependencies, then `git apply` the patch there. Stop dev before checks
or build in the same copy. Build first, then start dev/preview on 4332/4333 (or
adjust the harness's documented port list). Never apply to a running reference
copy. From the main repo:

```sh
mise x -- node plan/baseline/header-font-preloads.mjs --out /tmp/new-header-desktop.json
mise x -- node plan/baseline/header-font-preloads.mjs --width 390 --runs 1 --out /tmp/new-header-mobile.json
```

Output paths must be new. The retained patch describes the already-promoted change;
do not apply it again to the current checkout. Further font-display/metric changes,
SQLite migration and Node-only adoption remain separate decisions. No push/deployment.
