# Baseline: svgo

- base: http://localhost:8792
- captured: 2026-09-11T13:05:27.949Z

JS / CSS / total KB are what desktop Chrome loaded (uncompressed), including island modules.

| page | status | html KB | ext scripts | inline scripts | JS KB | CSS KB | total KB | server islands | hydrated | console errs (d/t/m/w) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| / | 200 | 11.4 | 0 | 0 | 0.0 | 17.1 | 44.2 | 0 | 0 | 0/0/0/0 |
| /archive | 200 | 7.6 | 0 | 1 | 0.0 | 17.1 | 40.5 | 0 | 0 | 0/0/0/0 |
| /stats | 200 | 73.7 | 3 | 4 | 581.9 | 17.1 | 2629.9 | 0 | 0 | 0/0/0/0 |
| /about | 200 | 12.7 | 0 | 1 | 0.0 | 17.1 | 1005.6 | 0 | 0 | 0/0/0/0 |
| /2025 | 200 | 27.6 | 0 | 3 | 0.0 | 17.1 | 2007.0 | 0 | 0 | 0/0/0/0 |
| /2025/CHA | 200 | 22.9 | 1 | 2 | 579.1 | 17.1 | 2566.4 | 0 | 0 | 0/0/0/0 |
| /2024 | 200 | 28.0 | 0 | 3 | 0.0 | 17.1 | 2010.4 | 0 | 0 | 0/0/0/0 |
| /2024/TOR | 200 | 23.1 | 1 | 2 | 579.1 | 17.1 | 2572.1 | 0 | 0 | 0/0/0/0 |
| /2011 | 200 | 29.2 | 0 | 3 | 0.0 | 17.1 | 1058.6 | 0 | 0 | 0/0/0/0 |
| /2011/CHA | 200 | 23.4 | 1 | 2 | 579.1 | 17.1 | 2568.6 | 0 | 0 | 0/0/0/0 |
| /nope | 404 | 3.4 | 0 | 1 | 0.0 | 17.1 | 36.3 | 0 | 0 | 1/1/1/1 |

## Scripts loaded (desktop, same-origin)

- /: 0 script(s)
- /archive: 0 script(s)
- /stats: 5 script(s)
  - http://localhost:8792/_astro/surprises-per-season.astro_astro_type_script_index_0_lang.D57JNWss.js
  - http://localhost:8792/_astro/team-season-scatter.astro_astro_type_script_index_0_lang.BlrLRqBY.js
  - http://localhost:8792/_astro/surprises-by-team.astro_astro_type_script_index_0_lang.DlPe1PKD.js
  - http://localhost:8792/_astro/utils.DS64JlTE.js
  - http://localhost:8792/_astro/echarts.BzgXyCAX.js
- /about: 0 script(s)
- /2025: 0 script(s)
- /2025/CHA: 3 script(s)
  - http://localhost:8792/_astro/team-season-pace.astro_astro_type_script_index_0_lang.Bg2par1W.js
  - http://localhost:8792/_astro/utils.DS64JlTE.js
  - http://localhost:8792/_astro/echarts.BzgXyCAX.js
- /2024: 0 script(s)
- /2024/TOR: 3 script(s)
  - http://localhost:8792/_astro/team-season-pace.astro_astro_type_script_index_0_lang.Bg2par1W.js
  - http://localhost:8792/_astro/utils.DS64JlTE.js
  - http://localhost:8792/_astro/echarts.BzgXyCAX.js
- /2011: 0 script(s)
- /2011/CHA: 3 script(s)
  - http://localhost:8792/_astro/team-season-pace.astro_astro_type_script_index_0_lang.Bg2par1W.js
  - http://localhost:8792/_astro/utils.DS64JlTE.js
  - http://localhost:8792/_astro/echarts.BzgXyCAX.js
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

