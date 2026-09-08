# NBA Surprise Teams Tracker

## Toolchain

- **Node 26**, pinned in `.node-version`. With fnm, run `fnm use` in the repo
  (or add `--use-on-cd` to the `fnm env` line in your shell profile).
  `package.json` `engines` enforces it: `pnpm install` refuses older Nodes.
- **pnpm**, version pinned in the `packageManager` field. Any pnpm ≥ 10 on
  `PATH` downloads and runs that exact version (`pnpm -v` in the repo should
  print it); `corepack enable` also works. Never `npm install` here.
- `pnpm install` installs dependencies and the git hooks.

## Commands

| Command                    | Action                                                                |
| :------------------------- | :-------------------------------------------------------------------- |
| `pnpm start`               | Dev server at `localhost:4321` plus a type-check watcher              |
| `pnpm run build`           | `verify`, then build the production site to `./dist/`                 |
| `pnpm run verify`          | Types, format, lint, tests over the whole repo (the CF build runs it) |
| `pnpm run preview`         | Preview the build locally, before deploying                           |
| `pnpm run astro -- --help` | Astro CLI help                                                        |
| `pnpm run deps`            | Interactive dependency update (`npm-check-updates`)                   |

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
- The lockfile is re-verified against these policies on every install,
  including the Cloudflare build, so a violation fails loudly rather than
  deploying.

`plan/baseline/` is its own pnpm project (own `pnpm-workspace.yaml`) so the
capture tooling's dependencies stay out of the site's lockfile and build.

## Git hooks

[lefthook](https://lefthook.dev), configured in `lefthook.yml`, installed by
`pnpm install`. Pre-commit runs `astro check`, the tests, and Prettier and
ESLint on the staged files, in parallel. `pnpm exec lefthook run pre-commit`
runs it by hand; `LEFTHOOK=0 git commit` skips it.

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
- **React components can't use scoped styles**, so the popover and chart styles
  are plain global stylesheets imported by the component
  (`src/components/popover.css`, `src/components/charts/charts.css`). This goes
  away with React.
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

- Semi-regularly review and update node compatibility date: https://developers.cloudflare.com/workers/configuration/compatibility-flags/#setting-compatibility-flags
  - Setting in CF dashboard
