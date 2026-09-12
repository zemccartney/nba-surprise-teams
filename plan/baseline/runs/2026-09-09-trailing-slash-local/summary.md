# Baseline: trailing-slash-local

- base: http://localhost:8793
- captured: 2026-09-09T20:22:22.743Z

JS / CSS / total KB are what desktop Chrome loaded (uncompressed), including island modules.

| page | status | html KB | ext scripts | inline scripts | JS KB | CSS KB | total KB | server islands | hydrated | console errs (d/t/m/w) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| / | 200 | 10.5 | 0 | 0 | 0.0 | 16.9 | 44.2 | 0 | 0 | 0/0/0/0 |
| /archive | 200 | 7.5 | 0 | 1 | 0.0 | 16.9 | 41.2 | 0 | 0 | 0/0/0/0 |
| /stats | 200 | 75.6 | 3 | 4 | 584.2 | 16.9 | 2641.4 | 0 | 0 | 0/0/0/0 |
| /about | 200 | 12.5 | 0 | 1 | 0.0 | 16.9 | 1006.3 | 0 | 0 | 0/0/0/0 |
| /2025 | 200 | 27.8 | 0 | 3 | 0.0 | 16.9 | 2022.1 | 0 | 0 | 0/0/0/0 |
| /2025/CHA | 200 | 22.4 | 1 | 2 | 581.5 | 16.9 | 2571.3 | 0 | 0 | 0/0/0/0 |
| /2024 | 200 | 28.2 | 0 | 3 | 0.0 | 16.9 | 2022.0 | 0 | 0 | 0/0/0/0 |
| /2024/TOR | 200 | 22.7 | 1 | 2 | 581.5 | 16.9 | 2578.3 | 0 | 0 | 0/0/0/0 |
| /2011 | 200 | 29.5 | 0 | 3 | 0.0 | 16.9 | 1073.5 | 0 | 0 | 0/0/0/0 |
| /2011/CHA | 200 | 22.9 | 1 | 2 | 581.5 | 16.9 | 2575.9 | 0 | 0 | 0/0/0/0 |
| /nope | 404 | 3.6 | 0 | 1 | 0.0 | 16.9 | 37.3 | 0 | 0 | 1/1/1/1 |

## Scripts loaded (desktop, same-origin)

- /: 0 script(s)
- /archive: 0 script(s)
- /stats: 5 script(s)
  - http://localhost:8793/_astro/surprises-per-season.astro_astro_type_script_index_0_lang.DhJcg8XD.js
  - http://localhost:8793/_astro/surprises-by-team.astro_astro_type_script_index_0_lang.Cj6O5lLI.js
  - http://localhost:8793/_astro/team-season-scatter.astro_astro_type_script_index_0_lang.DDCBT9c8.js
  - http://localhost:8793/_astro/utils.Blt5UFT-.js
  - http://localhost:8793/_astro/echarts.Bl8Wgh64.js
- /about: 0 script(s)
- /2025: 0 script(s)
- /2025/CHA: 3 script(s)
  - http://localhost:8793/_astro/team-season-pace.astro_astro_type_script_index_0_lang.CuDZwX8g.js
  - http://localhost:8793/_astro/utils.Blt5UFT-.js
  - http://localhost:8793/_astro/echarts.Bl8Wgh64.js
- /2024: 0 script(s)
- /2024/TOR: 3 script(s)
  - http://localhost:8793/_astro/team-season-pace.astro_astro_type_script_index_0_lang.CuDZwX8g.js
  - http://localhost:8793/_astro/utils.Blt5UFT-.js
  - http://localhost:8793/_astro/echarts.Bl8Wgh64.js
- /2011: 0 script(s)
- /2011/CHA: 3 script(s)
  - http://localhost:8793/_astro/team-season-pace.astro_astro_type_script_index_0_lang.CuDZwX8g.js
  - http://localhost:8793/_astro/utils.Blt5UFT-.js
  - http://localhost:8793/_astro/echarts.Bl8Wgh64.js
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

