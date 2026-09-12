# Baseline: tooling-pnpm-local

- base: http://localhost:8789
- captured: 2026-09-08T03:31:33.103Z

JS / CSS / total KB are what desktop Chrome loaded (uncompressed), including island modules.

| page | status | html KB | ext scripts | inline scripts | JS KB | CSS KB | total KB | server islands | hydrated | console errs (d/t/m/w) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| / | 200 | 10.4 | 0 | 0 | 0.0 | 16.9 | 44.1 | 0 | 0 | 0/0/0/0 |
| /archive | 200 | 7.5 | 0 | 1 | 0.0 | 16.9 | 41.2 | 0 | 0 | 0/0/0/0 |
| /stats | 200 | 129.4 | 0 | 4 | 640.0 | 16.9 | 2751.0 | 0 | 4 | 0/0/0/0 |
| /about | 200 | 12.6 | 0 | 1 | 0.0 | 16.9 | 1006.3 | 0 | 0 | 0/0/0/0 |
| /2025 | 200 | 31.9 | 0 | 5 | 249.0 | 16.9 | 2275.2 | 0 | 2 | 0/0/0/0 |
| /2025/CHA | 200 | 29.6 | 0 | 3 | 696.9 | 20.9 | 2697.8 | 0 | 4 | 0/0/0/0 |
| /2024 | 200 | 32.3 | 0 | 5 | 249.0 | 16.9 | 2275.1 | 0 | 2 | 0/0/0/0 |
| /2024/TOR | 200 | 29.8 | 0 | 3 | 696.9 | 20.9 | 2704.8 | 0 | 4 | 0/0/0/0 |
| /2011 | 200 | 33.3 | 0 | 5 | 248.9 | 16.9 | 1326.2 | 0 | 1 | 0/0/0/0 |
| /2011/CHA | 200 | 29.2 | 0 | 3 | 696.9 | 20.9 | 2701.5 | 0 | 5 | 0/0/0/0 |
| /nope | 404 | 3.6 | 0 | 1 | 0.0 | 16.9 | 37.4 | 0 | 0 | 1/1/1/1 |

## Scripts loaded (desktop, same-origin)

- /: 0 script(s)
- /archive: 0 script(s)
- /stats: 10 script(s)
  - http://localhost:8789/_astro/surprises-per-season.C4y0Uyu-.js
  - http://localhost:8789/_astro/popover.BC6CjmgF.js
  - http://localhost:8789/_astro/client.CCIqU-Wc.js
  - http://localhost:8789/_astro/popover.Bd-66SGz.js
  - http://localhost:8789/_astro/generateCategoricalChart.7OQeD0it.js
  - http://localhost:8789/_astro/BarChart.BWg6L9V3.js
  - http://localhost:8789/_astro/index.CGE1uNFL.js
  - http://localhost:8789/_astro/team-season-scatter.BeXVlL6R.js
  - http://localhost:8789/_astro/surprises-by-team.jxogDpKy.js
  - http://localhost:8789/_astro/utils.Blt5UFT-.js
- /about: 0 script(s)
- /2025: 5 script(s)
  - http://localhost:8789/_astro/popover.Dc29ZFWT.js
  - http://localhost:8789/_astro/client.CCIqU-Wc.js
  - http://localhost:8789/_astro/popover.BC6CjmgF.js
  - http://localhost:8789/_astro/index.CGE1uNFL.js
  - http://localhost:8789/_astro/popover.Bd-66SGz.js
- /2025/CHA: 7 script(s)
  - http://localhost:8789/_astro/team-season-pace.CZAl9IQo.js
  - http://localhost:8789/_astro/popover.BC6CjmgF.js
  - http://localhost:8789/_astro/client.CCIqU-Wc.js
  - http://localhost:8789/_astro/utils.Blt5UFT-.js
  - http://localhost:8789/_astro/popover.Bd-66SGz.js
  - http://localhost:8789/_astro/generateCategoricalChart.7OQeD0it.js
  - http://localhost:8789/_astro/index.CGE1uNFL.js
- /2024: 5 script(s)
  - http://localhost:8789/_astro/popover.Dc29ZFWT.js
  - http://localhost:8789/_astro/popover.BC6CjmgF.js
  - http://localhost:8789/_astro/client.CCIqU-Wc.js
  - http://localhost:8789/_astro/popover.Bd-66SGz.js
  - http://localhost:8789/_astro/index.CGE1uNFL.js
- /2024/TOR: 7 script(s)
  - http://localhost:8789/_astro/team-season-pace.CZAl9IQo.js
  - http://localhost:8789/_astro/client.CCIqU-Wc.js
  - http://localhost:8789/_astro/popover.BC6CjmgF.js
  - http://localhost:8789/_astro/utils.Blt5UFT-.js
  - http://localhost:8789/_astro/popover.Bd-66SGz.js
  - http://localhost:8789/_astro/generateCategoricalChart.7OQeD0it.js
  - http://localhost:8789/_astro/index.CGE1uNFL.js
- /2011: 4 script(s)
  - http://localhost:8789/_astro/popover.BC6CjmgF.js
  - http://localhost:8789/_astro/client.CCIqU-Wc.js
  - http://localhost:8789/_astro/popover.Bd-66SGz.js
  - http://localhost:8789/_astro/index.CGE1uNFL.js
- /2011/CHA: 7 script(s)
  - http://localhost:8789/_astro/popover.BC6CjmgF.js
  - http://localhost:8789/_astro/client.CCIqU-Wc.js
  - http://localhost:8789/_astro/team-season-pace.CZAl9IQo.js
  - http://localhost:8789/_astro/popover.Bd-66SGz.js
  - http://localhost:8789/_astro/index.CGE1uNFL.js
  - http://localhost:8789/_astro/utils.Blt5UFT-.js
  - http://localhost:8789/_astro/generateCategoricalChart.7OQeD0it.js
- /nope: 0 script(s)

## Third-party loaded (desktop)

- /: 0.0 KB across 0 request(s)
- /archive: 0.0 KB across 0 request(s)
- /stats: 0.0 KB across 0 request(s)
- /about: 0.0 KB across 0 request(s)
- /2025: 0.0 KB across 0 request(s)
- /2025/CHA: 0.0 KB across 0 request(s)
- /2024: 0.0 KB across 0 request(s)
- /2024/TOR: 0.0 KB across 0 request(s)
- /2011: 0.0 KB across 0 request(s)
- /2011/CHA: 0.0 KB across 0 request(s)
- /nope: 0.0 KB across 0 request(s)

## Server island responses


## External scripts (not same-origin)

