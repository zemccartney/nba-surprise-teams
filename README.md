# NBA Surprise Teams Tracker

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                       |
| :------------------------ | :------------------------------------------- |
| `npm run dev`             | Starts local dev server at `localhost:4321`  |
| `npm run build`           | Build your production site to `./dist/`      |
| `npm run preview`         | Preview your build locally, before deploying |
| `npm run astro -- --help` | Get help using the Astro CLI                 |
| `npm run deps`            | Helper to check and update dependencies      |

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
