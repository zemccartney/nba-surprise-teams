# Baseline: no-image-scratch-island

- base: http://localhost:4332
- captured: 2026-09-11T12:42:47.466Z

JS / CSS / total KB are what desktop Chrome loaded (uncompressed), including island modules.

| page | status | html KB | ext scripts | inline scripts | JS KB | CSS KB | total KB | server islands | hydrated | console errs (d/t/m/w) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| /2026/ | 200 | 15.2 | 0 | 4 | 0.0 | 17.1 | 1023.1 | 1 | 0 | 0/0/0/0 |
| /2026/CHA/ | 200 | 14.7 | 0 | 3 | 579.1 | 17.1 | 2560.3 | 1 | 0 | 0/0/0/0 |

## Scripts loaded (desktop, same-origin)

- /2026/: 0 script(s)
- /2026/CHA/: 3 script(s)
  - http://localhost:4332/_astro/team-season-pace.astro_astro_type_script_index_0_lang.Bg2par1W.js
  - http://localhost:4332/_astro/utils.DS64JlTE.js
  - http://localhost:4332/_astro/echarts.BzgXyCAX.js

## Third-party loaded (desktop)

- /2026/: 0.0 KB across 0 request(s)
- /2026/CHA/: 0.0 KB across 0 request(s)

## Server island responses

- /2026/: 200 2954B  cache-control: `-`  cf-cache-status: -  age: -
- /2026/CHA/: 200 3485B  cache-control: `-`  cf-cache-status: -  age: -

## External scripts (not same-origin)

