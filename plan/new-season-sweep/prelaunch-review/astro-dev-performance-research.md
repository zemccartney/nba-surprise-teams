# Upstream research: content calls, dev runtime and invalidation

Research checkpoint after the frontmatter experiment. Read-only inspection of
release notes, GitHub issues/merged PRs and installed dependency source. **No
upgrade, patch, new performance experiment or font change.**

## Finding: the important architectural boundary arrived in Astro 6

[Astro 6 release notes](https://astro.build/blog/astro-6/) (March 10, 2026)
explicitly describe replacing the Node-oriented dev pipeline with Vite's
Environment API. The Cloudflare adapter now runs application code in **workerd
in development, prerendering and production**. Previously our Astro 5 application
ran in Node during dev, with Cloudflare bindings supplied through its proxy.

The installed source makes the relevant cost concrete:

- **Both** Astro 5.14.1 and 7.3.1 dynamically import `astro:asset-imports` inside
  content lookups. This import is not newly introduced by Astro 7.
- Both inspected Vite generations use a module runner. The old Vite 6 SSR
  compatibility runner connects through an in-process server hot-channel/event
  emitter. Avoid claiming that Vite 8 invented module freshness checks.
- In the current runner, `cachedModule()` shares _concurrent_ module-information
  promises, then deletes them when settled. A later sequential lookup calls
  `getModuleInformation()` again, even if evaluated exports remain cached.
- The installed Cloudflare Vite plugin's `transport.invoke()` sends a JSON POST
  through `env.__VITE_INVOKE_MODULE__.fetch(...)` and parses the JSON response.
  This is local development transport, not an NBA/CDN/database request. There is
  also special handling to run dynamic imports in the runner Durable Object.

Thus a pattern that was cheap in one Node process can become thousands of small
local round trips under workerd. That is strongly consistent with our reversible
asset-import-cache experiment: Stats 1,474 → 395 → 1,546 ms and Team
672 → 34 → 659 ms. It does not establish that every changed millisecond is RPC
cost or that all modern Node-adapter projects share the same regression.

The [Astro 7 release notes](https://astro.build/blog/astro-7/) (June 22, 2026)
focus on Rust compilation, Vite 8/Rolldown, queued rendering and faster **builds**.
They explicitly emphasize bundling gains. Those claims do not guarantee that a
warm Cloudflare dev request making thousands of content API calls is faster.

## Two concrete dev invalidation bugs are relevant

### A. Middleware invalidated by unrelated filesystem writes

[PR #17944](https://github.com/withastro/astro/pull/17944), fixing
[issue #17933](https://github.com/withastro/astro/issues/17933), is shipped in
[Astro 7.3.3](https://github.com/withastro/astro/releases/tag/astro%407.3.3).

The middleware hot-update handler invalidated middleware even when Vite matched
**no modules** for a filesystem event. The PR specifically cites Cloudflare
`.wrangler/state` writes causing repeated middleware reloads and SSR rebundling.
The PR describes it as a regression introduced in 7.2.1.

**Checked locally:** our installed 7.3.1 `core/middleware/vite-plugin.js` has the
unguarded handler. The 7.3.3 tagged source checks the event's matched modules
before invalidating. This is a real applicable code difference, not merely a
similarly titled issue.

**Not yet established:** whether those writes are triggering invalidation during
our archived-page captures, and what share of the measured delay this explains.
No filesystem/invalidation trace or patched A/B was performed in this research.

### B. Head-metadata invalidates its own virtual module indefinitely

[Issue #17995](https://github.com/withastro/astro/issues/17995) reports persistent
Cloudflare dev slowdown after a source edit: repeated module-graph evaluation,
many more `fetchModule` calls, and time not reflected in Astro's short request log.

The confirmed, merged fix is
[PR #18007](https://github.com/withastro/astro/pull/18007), commit
`22458379f5f258ac1df225f5af644b98b1b8237b`, merged **September 16 at 22:23 UTC**.
The plugin was invalidating `virtual:astro:component-metadata` while transforming
that very module. Its dev-entrypoint import chain was invalidated again, causing
the next request to repeat the cycle. The merged fix skips self-invalidation;
it does **not** indiscriminately disable metadata invalidation/HMR.

The PR includes a small Cloudflare fixture showing repeat `fetchModule` counts
falling from about 32–34 to 4–6 after stabilization, plus tests that real layout
head edits still update the HTML. Those are **upstream measurements**, not ours.

**Checked locally:** our 7.3.1 head plugin contains the unconditional transform
invalidation. The **7.3.3 tagged source also contains it**: that release was
published September 16 at 19:39 UTC, before #18007 merged. Do not assume upgrading
to 7.3.3 includes both fixes.

**Match limit:** our slow captures include fresh servers without a deliberate
source edit. We have not established which startup/HMR events trigger this cycle
in our app. The PR also leaves broad watcher invalidation in place: unrelated
writes can still cause a bounded extra re-evaluation. This is a strong lead, not
a completed attribution of our timings.

## Repeated getStaticPaths is not an intentional new per-request policy

In [issue #16744](https://github.com/withastro/astro/issues/16744#issuecomment-4810736632),
maintainer Matthew Phillips explicitly states:

> Routes are intentionally cached to prevent recalling fetch all of the time.

[PR #16909](https://github.com/withastro/astro/pull/16909) proposed clearing the
route cache on every dev request. **It was closed without merging** after that
clarification. Its description initially looks like an exact explanation for
our behavior, but it is not shipped behavior and must not be cited as the cause.

What did merge is [PR #16776](https://github.com/withastro/astro/pull/16776): route
cache hits additionally require the same page module object, so HMR cannot serve
stale component references. Our installed 7.3.1 source has the check:

```js
if (cached?.staticPaths && cached.mod === mod) {
  return cached.staticPaths;
}
```

It also keeps route caches keyed by manifest and clears them on content-change
notifications. Re-evaluation can therefore matter in several ways: new module
identity, new manifest/cache lifetime, or actual invalidation events. The dev
router consults static paths while matching routes, and props resolution consults
them too; those stages should benefit from cache reuse.

This gives a plausible connection between invalidation bugs and our two repeated
calls, but **we have not traced which cache-miss condition causes the two calls**.
The source and maintainer statement justify investigating it as unexpected cache
behavior rather than treating two complete path enumerations as unavoidable.

## Related content-performance issues: real, but a different bottleneck

[Issue #16297](https://github.com/withastro/astro/issues/16297) reports large
collections repeatedly traversed to resolve image references. Related changes:

| Change                                                                                                          | Shipped | Relevance                     |
| --------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------- |
| [#17547](https://github.com/withastro/astro/pull/17547): skip traversal without image imports                   | 7.2.1   | Already included in our 7.3.1 |
| [#17631](https://github.com/withastro/astro/pull/17631): avoid whole-data cloning; resolve recorded image paths | 7.2.3   | Already included in our 7.3.1 |

The installed no-image path simply returns the entry's data. However, the dynamic
asset-map import still occurs **before** reaching that fast path. This reconciles
our faster bulk collection stage with slower repeated individual lookups. An
upgrade to obtain these content optimizations is not the missing fix; we already
have them.

The searches did not turn up a confirmed issue precisely naming our
`getEntry()` → asset-import → sequential transport overhead pattern. That is a
search limitation, not proof no issue exists.

## Other release items worth distinguishing

- [#17945](https://github.com/withastro/astro/pull/17945), also in 7.3.3, prebundles
  renderer entrypoints and the default logger to prevent mid-request optimizer
  replacement of `deps_ssr` chunks. This is the same _class_ of failure as the
  earlier missing-file overlay. Our shared-cache build/check handoff remained a
  plausible trigger, but it was not proof that upstream optimizer behavior had
  no role in that incident.
- [#17857](https://github.com/withastro/astro/pull/17857), in 7.3.3, reduces
  rendering allocations/deoptimizations. This is not evidence that it removes
  thousands of dev module-transport checks.
- Astro's HTTP route cache/incremental build cache are separate from the dev
  `getStaticPaths()` cache discussed here. Enabling them is not a demonstrated
  remedy for this issue.

## Recommended next investigation, not performed

Before calling this simply a “slow content database,” distinguish:

1. Expected-but-expensive sequential dev import checks across the runtime boundary.
2. Avoidable module graph/cache invalidation that can multiply the work.

The narrow next check would trace route-cache hits/misses, module/manifest
identity and invalidation events, then A/B the two upstream invalidation fixes
**separately** in disposable copies. Preserve real HMR checks; do not introduce
permanent import caching. Keep all other settings fixed where compatible, record
any dependency changes, and follow the release-age policy before an upgrade.
Even fixing invalidation need not eliminate the per-lookup transport overhead.

Font experiment 2 and chart migration remain unstarted. Nothing was installed,
patched, restarted, pushed or deployed during this research.

### Local source inspection anchors

- `node_modules/astro/dist/content/runtime.js`: asset imports precede
  `resolveEntryData()` / the no-image fast path.
- `node_modules/astro/dist/core/render/route-cache.js`: module identity and
  manifest-scoped cache.
- `node_modules/astro/dist/core/app/entrypoints/virtual/dev.js`: cache-clearing
  HMR notifications.
- `node_modules/astro/dist/core/middleware/vite-plugin.js` and
  `node_modules/astro/dist/vite-plugin-head/index.js`: affected invalidation sites.
- `node_modules/vite/dist/node/module-runner.js`, plus the installed Cloudflare
  Vite plugin 1.54.4's bundled `dist/workers/runner-worker/module-runner.js` and
  `index.js`: sequential module checks and the actual fetch-based transport.
- Historical copy's Vite 6.4.1 `createServerModuleRunnerTransport()` and
  `SSRCompatModuleRunner`: in-process hot-channel connection.

Release membership was checked against the actual 7.3.1 and 7.3.3 tagged
`packages/astro/CHANGELOG.md`, not inferred from an issue's closed state or an
automated triage proposal.
