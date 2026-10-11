# Astro Fonts API — accepted after comparison

Baseline: `901db21` (approved Nanum 400/700 integration). Goal: evaluate
Astro-native configuration and maintenance, not chase another payload reduction.
Zack approved the preserved appearance and chose to keep the Fontsource provider,
accepting its remote `@latest` behavior for now. The missing-glyph fallback
limitations accepted during the font-selection experiment remain accepted.

## What changed

- Astro 7.3.5 `fonts` configuration uses `fontProviders.fontsource()` for Nanum.
- Explicit Latin, normal, 400/700, WOFF2, `swap`, monospace fallback and optimized
  fallback metrics. `<Font cssVariable="--font-nanum" preload={false} />` supplies
  the CSS; `--font-mono` references Astro's variable including its fallback chain.
- Removed only the direct Nanum package dependency. Sixtyfour remains unchanged.
- No Nanum preload; the two existing other-font preloads remain.

## Observed output

Both downloaded WOFF2 files are byte-for-byte identical to the baseline:

| Weight |  Bytes | SHA-256                                                            |
| ------ | -----: | ------------------------------------------------------------------ |
| 400    | 14,236 | `73c2277fdc8688b2a1c6a9a5c0c0f04e6d8d8a4afa7e9adcfedbfc3b78d5f9de` |
| 700    | 14,448 | `662deb6f290fb6abf4ee03a08433f4d2456f33f8b506fed88ffa2ab0b6ef3cc4` |

Astro emits inline font CSS, local `/_astro/fonts/*.woff2` URLs, and a generated
fallback using `local("Courier New")` for both weights:

- `size-adjust: 83.3198%`
- `ascent-override: 96.0156%`
- `descent-override: 24.0039%`

With only Nanum delayed by 2.5 seconds, one desktop Chrome run measured the
`# Surprises` label as follows:

| Variant                  | Before font load  | After font load |
| ------------------------ | ----------------- | --------------- |
| Committed direct imports | 132.03125 × 23px  | 110 × 20px      |
| Astro API                | 109.984375 × 20px | 110 × 20px      |

Zack observed a visible jump in both delayed previews, perhaps slightly less
with Astro, and did not consider that a meaningful benefit. Do not report the
API as eliminating the visible transition. The measured widths above verify
metric matching on this machine, not identical letterforms or all-platform behavior. Where Courier New is unavailable, the generic fallback
still applies. The accepted missing-glyph limitations remain.

## Important maintenance tradeoff

The installed Fontsource provider fetches metadata from `api.fontsource.org`;
its returned static asset URLs use `nanum-gothic-coding@latest`. Astro caches
metadata/assets, but this is not equivalent to locking font content via the
previous package dependency. A fresh cache can fetch changed upstream assets,
and requires provider/CDN availability. Cached/offline rebuild resilience was
not tested in this increment.

If repeatable version selection matters, the API also offers an NPM provider
that can use a lockfile-installed package, or a local-file provider. Those would
retain the Astro API without this particular remote-latest tradeoff; neither
alternative has been trialed here.

The existing `plan/baseline/font-loading.mjs` check passes 24 cases on the API
build. Its real-face check now excludes Astro's generated fallback faces.
The full suite passed 265 tests; Astro/type, formatting, lint and workflow
checks passed. A source-built local preview is available on port 4388; the
committed comparison is on 4387. Throwaway ports 4389/4390 delay only Nanum for
visual comparison. These local URLs are temporary session artifacts, not stable
preview deployments. Commit/deployment status is tracked by Git and the normal
`deploy` workflow, not inferred from the local checks.
