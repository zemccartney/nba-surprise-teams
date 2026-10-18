# Local workerd NBA request investigation

## Status — 2026-10-17

Production and preview fresh fetches work. Local workerd gets NBA CDN/Akamai
403 while local Node succeeds. No production loader changes have been made.
The [preview-to-local KV workaround](../docs/MAINTENANCE.md#local-showdown-workaround-copy-preview-kv)
works, including the normal stale-cache fallback.

Owner requested a further investigation after that workaround was demonstrated.
This records additional evidence, not a proven CDN rule or client bug.

## Controls and observations

### Existing header-sensitive Node result

Node `https.request`, with workerd-like application headers, returned 403.
Adding `Accept-Encoding: gzip, deflate` returned 200; adding only
`Accept-Language: *` or `Sec-Fetch-Mode: cors` did not. The Node probe included
`Connection: keep-alive`, so it was not byte-for-byte identical to workerd.

### HTTPS echo comparison

Sent the same application headers from Node and standalone Miniflare/workerd to
`https://httpbingo.org/headers`. Only public, non-secret request headers were sent.
This is a third-party HTTPS echo endpoint, not an origin we control; its proxy
headers and normalization cannot establish byte-level equivalence at NBA's edge.

- Our Accept, Origin, Referer and browser User-Agent arrived in both requests.
- Node automatically added `Accept-Language: *`, `Sec-Fetch-Mode: cors` and,
  over HTTPS, `Accept-Encoding: br, gzip, deflate, zstd`.
- Workerd did not add those headers; it added `CF-Worker: worker.example.com`.
- Explicit `Accept-Encoding: gzip, deflate` arrived intact from both clients.
- Echo proxy reports showed the same apparent client IPv4 address.

Thus the failure is not explained by workerd simply dropping the explicitly
supplied encoding header on HTTPS. The earlier HTTP echo had a different Node
default encoding list; do not treat that as an HTTPS capture.

### Workerd header matrix against NBA

Using compatibility date `2026-09-10`, ran baseline, complete observed Node-like
headers, narrower combinations, then baseline again:

| Added to the application's configured headers | NBA response |
| --------------------------------------------- | ------------ |
| Nothing                                       | 403          |
| Encoding + language + fetch-mode + keep-alive | 403          |
| Encoding + keep-alive                         | 403          |
| Keep-alive only                               | 403          |
| Nothing (repeat control)                      | 403          |

Encoding here was `gzip, deflate`, language `*`, fetch-mode `cors`.
The configured application headers already contain NBA Origin and Referer.
Adding `CF-Worker: worker.example.com` to Node fetch in an earlier control did
not make Node fail, so that header alone is insufficient to explain the rejection.

### Address-family control

At the time of the probe, system DNS lookup returned one IPv4 address for the
NBA host. Node HTTPS succeeded with both requested family 4 and family 6; the
latter connected to an IPv4-mapped address, **not native IPv6**. This does not
compare every CDN edge or workerd's actual destination address.

### TLS ClientHello inspection

A temporary local TCP listener captured initial TLS ClientHello messages from
Node HTTPS, Node fetch, and local workerd, then closed each connection. No TLS
certificate validation was disabled and no real NBA request was intercepted.

Observed:

- Node and workerd advertise different cipher lists and TLS extensions/order.
- Node fetch advertised ALPN `http/1.1`; the captured Node HTTPS and workerd
  handshakes had no ALPN extension.
- Both advertised TLS 1.3 and TLS 1.2, and sent localhost SNI as expected.
- Workerd offered nine ciphers; Node offered a substantially larger list.

A further Node HTTPS A/B/A probe (default ciphers, workerd's cipher list,
default ciphers) returned **200 / 200 / 200** with identical application headers
including encoding. Matching only cipher lists does not replicate the whole
handshake, and their difference is not proof of TLS fingerprint-based blocking.
No weak TLS settings were introduced into application code.

### Node compatibility API control

A standalone workerd Worker with `nodejs_compat` used `node:https.get` instead of
Workers fetch, with the existing headers plus encoding. It still returned
**403**. Enabling Node APIs therefore does not by itself make the local runtime
behave like the external Node diagnostic.

### Honest User-Agent controls

Local workerd requests to the same NBA URL:

| User-Agent                                                    | Result            |
| ------------------------------------------------------------- | ----------------- |
| `NBA-Surprise-Teams-Tracker/1.0 (+https://nbastt.grepco.net)` | 10-second timeout |
| `node`                                                        | 403               |
| Empty string, plus encoding                                   | 403               |

These are bounded observations, not proof that a spoofed Chrome UA is required.
The previous hosted rationale remains in
[cutover checks](new-season-sweep/hosted-cutover-checks.md).

## Environment and limitations

- Node 26.8.1.
- Standalone probes use Wrangler 4.146.0's Miniflare 5.20261001.0-alpha and
  workerd 1.20261001.1, with compatibility date 2026-09-10 for these controls.
- Astro's Cloudflare Vite integration uses workerd 1.20260903.1. The application
  had already failed with that version; this session's matrix was standalone.
- CDN address resolution varied over the session; it was not pinned for every
  test. No claim that every request reached the same Akamai edge is justified.
- No deployed diagnostic route was added and no remote KV was modified.
- The app uses global fetch, not the Node HTTPS implementation outside workerd.
- Header values matching at an echo endpoint does not establish matching header
  order, TLS negotiation, connection reuse, HTTP framing, or CDN policy inputs.

## What this establishes

Simple header completion and switching to the workerd Node HTTPS API did not fix
local access. There is no demonstrated request-only patch to adopt yet.
The local/runtime-sensitive rejection is real, but calling it a specific
Cloudflare HTTP incompatibility or a specific Akamai fingerprint rule would be
premature.

Further root-cause work would need controlled destination/transport comparisons
or an upstream minimal reproduction. Do not let that silently expand into a
production networking rewrite. If the goal remains local productivity rather
than root-cause certainty, the verified KV copy is already the lower-cost option;
a dev-only Node transport would be another explicit workaround, not a diagnosis.
