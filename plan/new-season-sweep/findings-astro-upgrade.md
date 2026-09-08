# Findings: Astro 5 → 7 on Cloudflare

_Researched 2026-09-07 from adapter/Sentry/Astro docs, changelogs, and the
published tarballs (astro 7.3.1, @astrojs/cloudflare 14.3.0, @sentry/astro
10.73.0). Condensed; ask Claude for the full report if a claim needs its source._

## The forcing fact

`@astrojs/cloudflare` **v13 dropped Cloudflare Pages**. Any Astro 6/7 upgrade
means deploying to **Workers (static assets) via Workers Builds**. Astro 5 is now
out of support (security fixes cover one previous major, i.e. 6).

Sources: adapter CHANGELOG 13.0.0 (#15480); adapter docs; Cloudflare's
Pages→Workers guide.

## What breaks in this repo

| Area              | Change                                                                                                                                                                                                                                                                                   | Where                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Adapter           | `platformProxy` option removed; `astro dev` runs in workerd via `@cloudflare/vite-plugin`, bindings from wrangler config, local state in `.wrangler/state`                                                                                                                               | `astro.config.mjs`, `start`/`kv:*` scripts                                             |
| Runtime locals    | `Astro.locals.runtime.*` getters **throw**. `env.GAMES_KV` → `import { env } from "cloudflare:workers"`; `runtime.ctx` → `locals.cfContext`                                                                                                                                              | `src/actions/index.ts`, `src/middleware.ts`, `src/env.d.ts` (`Runtime<ENV>` type gone) |
| wrangler config   | No longer "local only": becomes the deploy config. Adapter fills `main`, `assets`, `compatibility_date`, auto-provisions `SESSION` KV. Real `GAMES_KV` id required. `nodejs_compat` still required                                                                                       | `wrangler.toml` → likely `wrangler.jsonc`                                              |
| Sentry            | `@sentry/astro` ≥10.40 **auto-wraps** the Worker entry and adds its own middleware on the Cloudflare adapter. Keeping the manual `wrapRequestHandler` middleware double-instruments. `sourceMapsUploadOptions` deprecated in favor of top-level `authToken`/`org`/`project`/`sourcemaps` | `src/middleware.ts`, `astro.config.mjs`, `sentry.client.config.js`                     |
| Compiler (v7)     | Rust compiler is the only compiler: unclosed/misnested tags are **build errors**; `compressHTML` default is `'jsx'` so newlines between inline elements no longer render as spaces (`{" "}` to force). No codemod exists                                                                 | every `.astro` file                                                                    |
| Zod / schema      | `z` from `astro:content` and `astro:schema` deprecated → `astro/zod`. Zod 4: `z.string().url()` deprecated (works) → `z.url()`                                                                                                                                                           | `src/content.config.ts`, `src/content-utils.ts`, `src/actions/index.ts`                |
| TypeScript        | **TS 7 has no JS API**; `astro check` / `@astrojs/check` peer is `^5 \|\| ^6`. Pin `typescript ^6.0.3`. TS 6 sets `types: []` by default → add `@types/node` and `"types": ["node"]` or `archiver/` + `system.test.ts` fail to type-check                                                | `package.json`, `tsconfig.json`                                                        |
| Vitest            | `getViteConfig` still the documented path. vitest 3 can't share Vite 8 with Astro 7 → vitest 4.1.x (safe) or 5. Remove the hand-rolled `vite.ssr.external` list (Sentry's plugin sets externals; user-set externals may trip the Cloudflare plugin). Re-test the teardown hang           | `vitest.config.ts`, `astro.config.mjs`                                                 |
| React integration | `@astrojs/react` 6: no behavioral breaks. `react-dom/server.edge` alias likely obsolete under workerd (`workerd` export condition). Moot if React is removed first                                                                                                                       | `astro.config.mjs`                                                                     |
| Caching           | Astro 7 route caching is opt-in; manual `Cache-Control` on server islands keeps working. Evaluate `routeRules` later, not during the upgrade                                                                                                                                             | `src/components/*/ssr.astro`                                                           |

Verified unchanged: server islands, `Astro.callAction`, `ActionError` codes,
`astro:env`/`envField`, `file()` loader, `reference()`, `isPrerendered`,
`import.meta.glob`, SVG imports, `security.csp` API, `trailingSlash` defaults.

## Workers Builds facts that shape the pipeline

- Build image default Node **24.18.0**; select via `NODE_VERSION` or `.node-version`.
- Default pnpm is **10.11.1**; set `PNPM_VERSION` to match `packageManager`
  (corepack detection is undocumented).
- One set of build variables for the whole Worker, **not per branch**. Two ways to
  get `PUBLIC_DEPLOY_ENV=preview|production`: derive from `WORKERS_CI_BRANCH` in
  the build command, or run two Workers.
- Previews: enable builds for non-production branches; preview URLs are
  `<version>-<worker>.<subdomain>.workers.dev`, posted on the PR.
- **No `[CF-Pages-Skip]` equivalent.** Use build watch paths instead.
- Build-time vars are separate from runtime vars (unlike Pages).
- Worker name must equal wrangler `name`.

## Zero-downtime path

Connect the repo to a new Worker via Workers Builds, building the upgrade
branch. Pages keeps serving `main` and the custom domain throughout. When the
Worker preview verifies clean, move the custom domain; reverting is pointing it
back. The ops work is out-of-band but never blocks the Pages pipeline.

## Top risks, ranked

1. `locals.runtime.*` throwing (KV access + Sentry middleware).
2. Pages → Workers pipeline move (domain, env vars, KV id, skip convention).
3. Rust compiler strictness and `compressHTML: 'jsx'` across all templates.
4. `astro check` under TS 6 (`types: []`) and TS 7 being unusable with it.
5. Sentry double-instrumentation; vitest/Vite version drift.
