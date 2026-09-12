# NBA Surprise Teams Tracker

## Toolchain

[mise](https://mise.jdx.dev/) manages **Node 26.8.1, pnpm 12.3.4 and hk
1.56.1**, pinned in `mise.toml` with platform checksums in `mise.lock`.
Install mise and trust this checkout after reviewing its config, then:

```sh
mise trust
mise install --locked
mise run setup
```

`setup` installs dependencies with the frozen lockfile and installs hk's Git
hooks. With `mise activate` configured in your shell, entering the repo also
installs missing tools and refreshes the hooks. Noninteractive shells and
agents should use `mise run <task>` or `mise x -- pnpm <command>`; no fnm or
manual pnpm PATH prefix is needed. Project tools take precedence over inherited
PATH additions such as `PNPM_HOME/bin`.

`package.json` checks the exact pnpm version via `devEngines` with
`onFail: "error"`; it does not request automatic version switching. Keep that
version in sync with `mise.toml`. `.node-version` retains the Node major for
hosting tools that read it; `engines.node` restricts installs to Node 26.
Never `npm install` here. The deploy workflow installs the locked mise tools.

## Commands

| Command                    | Action                                                                |
| :------------------------- | :-------------------------------------------------------------------- |
| `pnpm start`               | Dev server at `localhost:4321` plus a type-check watcher              |
| `pnpm run build`           | `verify`, then build the production site to `./dist/`                 |
| `pnpm run verify`          | Types, format, lint, tests over the whole repo (the CF build runs it) |
| `pnpm run preview`         | Preview the build locally, before deploying                           |
| `pnpm run astro -- --help` | Astro CLI help                                                        |
| `pnpm run deps`            | Interactive dependency update (`npm-check-updates`)                   |
| `pnpm run archive:diff`    | Explain what changed in `games.json` (committed vs working tree)      |

## Dependencies and supply chain

pnpm's settings live in `pnpm-workspace.yaml` (pnpm ≥ 11 ignores everything but
registry/auth in `.npmrc`). Each setting is commented there; the ones you'll
meet day to day:

- **`minimumReleaseAge`**: versions published less than 3 days ago don't
  resolve. `pnpm run deps` uses the same cooldown. Waiting is the fix.
- **`trustPolicy: no-downgrade`**: a version whose provenance is weaker than an
  earlier release's is refused (`ERR_PNPM_TRUST_DOWNGRADE`). Versions older
  than a year are exempt. Real backports trip this; after checking the
  release, add the exact version to `trustPolicyExclude`.
- **`allowBuilds`**: dependencies with install scripts must be listed
  (`ERR_PNPM_IGNORED_BUILDS` names the newcomer). Read the script before
  allowing it; `false` is right when the package ships its binary as an
  optional dependency and the script is only a check or a fallback download.
- **No hoisting.** Only packages listed in `package.json` are importable from
  project code. `Cannot find module 'x'` for a package you never installed means
  `x` must be declared (that's why `vite` is a devDependency: `astro.config.mjs`
  uses its `loadEnv`) or imported through the package that owns it (`astro/zod`
  rather than `zod`).
- The lockfile is re-verified against these policies on every install,
  including the Cloudflare build, so a violation fails loudly rather than
  deploying.

`plan/baseline/` is its own pnpm project (own `pnpm-workspace.yaml`) so the
capture tooling's dependencies stay out of the site's lockfile and build.

### Held back on purpose

`pnpm run deps` will keep offering these; each moves with the thing named.

- `prettier` (exact 3.6.2) and `prettier-plugin-astro` (0.14.1): 3.7+ with the
  0.14 plugin reflows paragraphs in `.astro` files past `printWidth`, so the two
  move together in one formatting commit, once plugin 1.0 clears the release
  age. The plugin carries its own copy of the Astro compiler, so it is not
  affected by Astro's move to the Rust one.
- `@sentry/astro` and `@sentry/cloudflare` (10.22): from 10.40 the integration
  wraps the Cloudflare worker entry itself, which collides with the manual
  `wrapRequestHandler` in `src/middleware.ts`. Moves with the Sentry rework.
- `typescript` (5.9): `astro check` supports 5 and 6, not 7. Astro's own
  tooling can only rely on TypeScript 6, so 7 has no date.

## Git hooks

[hk](https://hk.jdx.dev/), configured in `hk.pkl`, installed by `mise run setup`
or the mise enter hook. Pre-commit **auto-fixes and stages** Prettier and ESLint
changes on selected files, and runs whole-project `astro check` and tests.
Unstaged changes are stashed with Git and restored afterward, including when a
check fails. Review the resulting commit when using partial staging.

- `mise run check`: read-only types, format, lint and tests across tracked files.
- `mise run fix`: the same checks, applying available fixes.
- `mise x -- hk run pre-commit`: exercise the staged-file hook manually.
- `HK=0 git commit`: explicit hook bypass.

Git hooks use `mise x`, so GUI Git clients must have the mise executable on
PATH; shell activation alone does not guarantee that. `pnpm install` no longer
installs hooks. When migrating an existing checkout, remove only old
Lefthook-generated hooks from `.git/hooks` (including `prepare-commit-msg` if
present), then run `mise x -- hk install --mise`; preserve unrelated hooks.

The build retains `pnpm run verify`, which discovers files through the tools
rather than hk's tracked-file list. Both run tests, but the existing content
store caveat still applies: tests in a fresh checkout can pass against empty
collections until dev/build has populated `.astro/data-store.json`.

## Linting

The ESLint config is TypeScript (`eslint.config.ts`), loaded through Node's own
type stripping. ESLint 10 still gates that behind a feature flag, so every
invocation carries `--flag unstable_native_nodejs_ts_config`: the `lint`
scripts, `hk.pkl`, and `.vscode/settings.json` (`eslint.options.flags`).
Without it ESLint fails with "The 'jiti' library is required for loading
TypeScript configuration files". Rules that are turned off
have the reason in a comment next to them in the config; that's the place to
flip one. `import-x/no-extraneous-dependencies` is the rule that catches an
import of a package that isn't declared in `package.json` (the "No hoisting"
failure mode above), and `import-x/no-unresolved` catches a path that doesn't
exist.

## Maintenance

see [MAINTENANCE](./MAINTENANCE.md)

## Styling

Plain CSS, no framework. The conventions below are what the Tailwind removal
settled on; the site should render exactly as it did under Tailwind 4.1.

- **Base reset** lives at the top of `src/styles/global.css` and is derived from
  Tailwind's preflight, because the markup assumes its semantics: headings and
  links inherit size, weight, and color; lists are unstyled; padding and borders
  are zeroed; images and SVGs are block-level. Don't swap it for another reset
  without re-running the baseline comparison.
- **Design tokens** are custom properties on `:root` in the same file: colors
  (oklch, named after the Tailwind shades they replaced), fonts, shadows, and the
  type scale. Add a token when a value is used in more than one component;
  otherwise write the literal.
- **Type scale is a pair.** `--text-2xl` always goes with
  `--text-2xl--line-height`, because Tailwind's `text-*` utilities set both.
  Setting only `font-size` falls back to the body's 1.5 line-height and makes
  everything taller.
- **Breakpoints** are the Tailwind defaults in px: 640, 768, 1024, 1280, 1536.
  Media queries are `min-width` and live next to the rule they modify.
- **Component styles are scoped** in each `.astro` file's `<style>` block, with
  class names that read as what the element is (`.season-nav`, `.legend-cell`).
  Nesting is fine for states and children in the same file.
- **Styling a child component's internals** needs `:global()`. Astro scopes every
  selector to the current file, and a child's elements carry the child's scope,
  not yours. `.team-stats :global(.NBASurpriseTracker-Table > tbody th)` works;
  the same selector without `:global()` silently matches nothing. When two files
  target the same element with equal specificity, source order decides, so make
  the override more specific rather than relying on order.
- **Passing `class` to a component** only styles it if the component spreads its
  rest props onto its root element, which is how Astro forwards the parent's
  scope attribute. `link.astro`, `table.astro`, `typography.astro`, and
  `crash.astro` do; check before relying on it.
- **Popover and chart tooltip styles are global stylesheets**
  (`src/components/popover.css`, `src/components/charts/charts.css`), imported
  by the component. The popover is a native `[popover]` element in the top
  layer, positioned with CSS anchor positioning; the chart tooltips are HTML
  that ECharts builds from strings, so neither can carry a scoped-style
  attribute.
- **Charts are ECharts**, mounted by a `<script>` in each chart's `.astro`
  wrapper (`src/components/charts/`). The wrapper serializes the props into a
  JSON script block; the client module reads it and builds the option. Colors
  and fonts are read from the design tokens at mount, because SVG attributes
  can't resolve `var()`.
- **Regression check:** `plan/baseline/` captures screenshots and payload sizes
  for a build and diffs two captures. Run it against a reference before and after
  any styling change; see its README.

## Additional Considerations

### KV Cache Key

Need to update our action's `SCHEMA_ID` if shape of data stored in KV ever changes

### Icon sourcing

- Emojis are from Twitter's emoji set
  - Looked up and downloaded from https://twemoji-cheatsheet.vercel.app/
  - recolored as needed
- Hourglass icon from https://phosphoricons.com/

### Cloudflare

The site deploys as a Worker, not a Pages project: `@astrojs/cloudflare` 13
dropped Pages support. `wrangler.jsonc` is the build and deploy config, and the
adapter reads it during `astro build`.

- Compatibility date and flags now live in `wrangler.jsonc`, not the dashboard.
  Review them semi-regularly:
  https://developers.cloudflare.com/workers/configuration/compatibility-flags/
- `GAMES_KV` needs the real namespace id in `wrangler.jsonc`. Local dev ignores
  it and uses `.wrangler/state`.
- No `SESSION` namespace is provisioned, because `session: false` is set in
  `astro.config.mjs`. Remove that line if the site ever uses sessions.
- `.github/workflows/deploy.yml` builds and deploys: a preview version aliased
  to the branch name for any branch, a production release for `main`. It does
  nothing until the repository variable `DEPLOY_ENABLED` is set to `true`, and
  it needs `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PUBLIC_SENTRY_DSN`
  and `SENTRY_AUTH_TOKEN` as repository secrets.
- Dev, prerendering and `astro preview` all run inside workerd now, so anything
  that needs Node APIs has to live outside a route. That is why the archiver
  endpoint hands its games back to `archiver/script.ts` instead of writing
  `src/content/games.json` itself.
