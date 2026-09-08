# Baseline: main-local

- base: http://localhost:8788
- captured: 2026-09-07T05:45:06.707Z

JS / CSS / total KB are what desktop Chrome loaded (uncompressed), including island modules.

| page | status | html KB | ext scripts | inline scripts | JS KB | CSS KB | total KB | server islands | hydrated | console errs (d/t/m/w) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| / | 200 | 18.3 | 0 | 3 | 249.1 | 37.1 | 1321.9 | 0 | 1 | 0/0/0/0 |
| /archive | 200 | 6.6 | 0 | 1 | 0.0 | 32.4 | 55.8 | 0 | 0 | 0/0/0/0 |
| /stats | 200 | 121.4 | 0 | 4 | 640.4 | 37.1 | 2763.6 | 0 | 4 | 0/0/0/0 |
| /about | 200 | 9.9 | 0 | 1 | 0.0 | 32.4 | 1019.2 | 0 | 0 | 0/0/0/0 |
| /2025 | 200 | 20.0 | 0 | 5 | 249.2 | 37.1 | 2283.7 | 0 | 2 | 0/0/0/0 |
| /2025/CHA | 200 | 25.6 | 0 | 3 | 697.2 | 37.1 | 2710.3 | 0 | 4 | 0/0/0/0 |
| /2024 | 200 | 20.5 | 0 | 5 | 249.2 | 37.1 | 2283.7 | 0 | 2 | 0/0/0/0 |
| /2024/TOR | 200 | 25.8 | 0 | 3 | 697.2 | 37.1 | 2717.3 | 0 | 4 | 0/0/0/0 |
| /2011 | 200 | 21.1 | 0 | 5 | 249.1 | 37.1 | 1334.5 | 0 | 1 | 0/0/0/0 |
| /2011/CHA | 200 | 25.2 | 0 | 3 | 697.2 | 37.1 | 2714.1 | 0 | 5 | 0/0/0/0 |
| /nope | 404 | 2.1 | 0 | 1 | 0.0 | 32.4 | 51.3 | 0 | 0 | 1/1/1/1 |

## Scripts loaded (desktop, same-origin)

- /: 4 script(s)
  - http://localhost:8788/_astro/popover.75d147tr.js
  - http://localhost:8788/_astro/client.CCIqU-Wc.js
  - http://localhost:8788/_astro/index.CGE1uNFL.js
  - http://localhost:8788/_astro/popover.DJhouc4c.js
- /archive: 0 script(s)
- /stats: 10 script(s)
  - http://localhost:8788/_astro/surprises-per-season.CrPVzBOn.js
  - http://localhost:8788/_astro/client.CCIqU-Wc.js
  - http://localhost:8788/_astro/popover.75d147tr.js
  - http://localhost:8788/_astro/popover.DJhouc4c.js
  - http://localhost:8788/_astro/BarChart.S8XXNLR_.js
  - http://localhost:8788/_astro/index.CGE1uNFL.js
  - http://localhost:8788/_astro/generateCategoricalChart.466Ie_pr.js
  - http://localhost:8788/_astro/team-season-scatter.4vrN5K4w.js
  - http://localhost:8788/_astro/surprises-by-team.jzFMS625.js
  - http://localhost:8788/_astro/utils.Blt5UFT-.js
- /about: 0 script(s)
- /2025: 5 script(s)
  - http://localhost:8788/_astro/popover.Cf6enWuZ.js
  - http://localhost:8788/_astro/client.CCIqU-Wc.js
  - http://localhost:8788/_astro/popover.75d147tr.js
  - http://localhost:8788/_astro/index.CGE1uNFL.js
  - http://localhost:8788/_astro/popover.DJhouc4c.js
- /2025/CHA: 7 script(s)
  - http://localhost:8788/_astro/team-season-pace.D4OeopTB.js
  - http://localhost:8788/_astro/popover.75d147tr.js
  - http://localhost:8788/_astro/client.CCIqU-Wc.js
  - http://localhost:8788/_astro/utils.Blt5UFT-.js
  - http://localhost:8788/_astro/popover.DJhouc4c.js
  - http://localhost:8788/_astro/generateCategoricalChart.466Ie_pr.js
  - http://localhost:8788/_astro/index.CGE1uNFL.js
- /2024: 5 script(s)
  - http://localhost:8788/_astro/popover.Cf6enWuZ.js
  - http://localhost:8788/_astro/client.CCIqU-Wc.js
  - http://localhost:8788/_astro/popover.75d147tr.js
  - http://localhost:8788/_astro/popover.DJhouc4c.js
  - http://localhost:8788/_astro/index.CGE1uNFL.js
- /2024/TOR: 7 script(s)
  - http://localhost:8788/_astro/team-season-pace.D4OeopTB.js
  - http://localhost:8788/_astro/popover.75d147tr.js
  - http://localhost:8788/_astro/client.CCIqU-Wc.js
  - http://localhost:8788/_astro/utils.Blt5UFT-.js
  - http://localhost:8788/_astro/popover.DJhouc4c.js
  - http://localhost:8788/_astro/generateCategoricalChart.466Ie_pr.js
  - http://localhost:8788/_astro/index.CGE1uNFL.js
- /2011: 4 script(s)
  - http://localhost:8788/_astro/popover.75d147tr.js
  - http://localhost:8788/_astro/client.CCIqU-Wc.js
  - http://localhost:8788/_astro/popover.DJhouc4c.js
  - http://localhost:8788/_astro/index.CGE1uNFL.js
- /2011/CHA: 7 script(s)
  - http://localhost:8788/_astro/popover.75d147tr.js
  - http://localhost:8788/_astro/client.CCIqU-Wc.js
  - http://localhost:8788/_astro/team-season-pace.D4OeopTB.js
  - http://localhost:8788/_astro/popover.DJhouc4c.js
  - http://localhost:8788/_astro/index.CGE1uNFL.js
  - http://localhost:8788/_astro/utils.Blt5UFT-.js
  - http://localhost:8788/_astro/generateCategoricalChart.466Ie_pr.js
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

