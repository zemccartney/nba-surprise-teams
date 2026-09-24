# Upstream issue: `<Image>` on an SVG 400s in dev under the Cloudflare adapter

Status: **drafted, not filed.** Zack files it.
File at <https://github.com/withastro/astro/issues> — the adapter moved into
the main monorepo at `packages/integrations/cloudflare`;
`withastro/adapters` was archived 2025-02-10, so do not file there.

## Why this doc exists

This is the bug that cost Step 8 and forced the dev-only `/_image` shim, and
that Step 9 sidestepped by dropping `<Image>` entirely. It is worth filing:
the fix is small, it is squarely the adapter's, and it would remove the seam
that motivates the custom image service (`image-service-spec.html`) for the
SVG case.

### One thing I got wrong, recorded so nobody re-derives it

I first claimed the bug was the `compile` branch routing dev at the Cloudflare
Images endpoint, and that it should mirror the `passthrough` / `cloudflare`
branches by using `GENERIC_ENDPOINT` in dev. **That is wrong.** `index.js:121`
has `needsImagesBindingForDev = (isCompile || isBindingBuild) && command ===
"dev"`, which provisions the local Images binding in dev on purpose so dev
approximates production's build-time optimization. PR withastro/astro#15435
("update Cloudflare adapter's default image service") describes exactly that
intent. Routing dev through the binding is design, not oversight, and the
one-line change I proposed would have broken it.

The real defect is narrower: the adapter's own format allow-list.

## Duplicate check, 2026-09-12

Searched; no exact duplicate. Nearest neighbours, cite them in the issue:

- withastro/astro#15848 — images don't render in dev under `imageService:
"cloudflare"`. Different mode, different cause.
- withastro/astro#15319 — Astro v6 + Cloudflare + `<Image>` errors in dev
  only. Adjacent, likely fixed by #15435.
- withastro/astro#8322 — **the precedent worth leading with.** The Vercel
  image service breaks SVG the same way: a raster-only pipeline given a vector
  it should have passed through.
- withastro/adapters#266 — `compiled` should emit a passthrough endpoint.
  Closed, archived repo.

---

## Issue text, ready to paste

**Title:** Cloudflare adapter: `<Image>`/`getImage()` on an SVG returns
`400 Unsupported format: svg` in dev, while the same code builds fine

### Astro Info

```
Astro                    v7.x
@astrojs/cloudflare      v14.3.0
Node                     v26.8.1
```

### Describe the bug

With `@astrojs/cloudflare` and `imageService: "compile"` (and also with the
default `"cloudflare-binding"`), passing an SVG to `<Image>` or `getImage()`
fails in `astro dev` with `400 Unsupported format: svg`. The identical code
builds and serves correctly — `astro build` emits the SVG to `_astro/` and
production never calls `/_image`.

So a project can build green, pass a production smoke test, and still have
every image broken for every developer running `astro dev`. That asymmetry is
the part worth fixing; the 400 itself is a one-line allow-list.

### Cause

`packages/integrations/cloudflare/src/utils/image-binding-transform.ts`
hardcodes the accepted output formats:

```ts
const supportedFormats = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
};
const outputFormat = supportedFormats[params.get("f") ?? ""];
if (!outputFormat) {
  return new Response(`Unsupported format: ${params.get("f")}`, {
    status: 400,
  });
}
```

`svg` is absent, so the request 400s _before_ `images.input()` is ever called.
The Images binding never sees it.

This is stricter than the platform being wrapped. Cloudflare Images documents
SVG as both a supported input and output format, states that it does not
resize SVG and ignores optimization parameters for it, and sanitizes it with
svg-hush on delivery:

- <https://developers.cloudflare.com/images/get-started/limits/>
- <https://blog.cloudflare.com/svg-support-in-cloudflare-images/>

### Why it only shows up in dev

Under `compile`, `setImageConfig` picks the endpoint by command
(`src/utils/image-config.ts`):

| `imageService`                 | dev endpoint  | runtime endpoint |
| ------------------------------ | ------------- | ---------------- |
| `cloudflare-binding` (default) | transform     | transform        |
| `compile`                      | **transform** | passthrough      |
| `passthrough`                  | generic       | passthrough      |
| `cloudflare`                   | generic       | CF service       |

Dev routes to `image-transform-endpoint` by design — `index.ts` sets
`needsImagesBindingForDev` for exactly this — so dev mirrors production's
build-time optimization. That design is fine. It just inherits the allow-list,
and the build path has no such restriction, hence the split.

Under the default `cloudflare-binding` the same 400 also occurs at runtime,
for any on-demand route or server island rendering an SVG.

### Steps to reproduce

1. `npm create astro@latest`, add `@astrojs/cloudflare`.
2. Set `imageService: "compile"` on the adapter.
3. Put any `.svg` in `src/assets/` and render it:

   ```astro
   ---
   import { Image } from "astro:assets";
   import logo from "../assets/logo.svg";
   ---

   <Image src={logo} alt="logo" width={36} />
   ```

4. `astro dev` → the image 404s/400s; the network panel shows
   `/_image?...&f=svg` returning `400 Unsupported format: svg`.
5. `astro build` → succeeds, SVG emitted to `_astro/`, renders correctly.

### Expected

An SVG passed to `<Image>` should render in dev, as it does in the build. SVG
is a supported Cloudflare Images format, and vectors need no transformation in
any case.

### Suggested fix

Either works; the second is cheaper and avoids paying for a no-op transform.

1. Add `svg: "image/svg+xml"` to `supportedFormats` and let the binding pass
   it through, matching Cloudflare Images' documented behaviour.
2. Short-circuit in `transform()` before the allow-list: if the requested
   format is `svg`, return the origin asset unchanged from `env.ASSETS`.
   Resizing is meaningless for a vector, so there is nothing to hand the
   binding.

Worth considering alongside: Astro emits one output per distinct transform
prop set, so an SVG used at several sizes produces several byte-identical
files (45 sources → 98 files on the site where we hit this). Collapsing SVG
variants is a separate improvement, but it lands in the same code path.

### Workaround

Point `/_image` at the generic endpoint in dev only:

```js
// astro.config.mjs — dev-only, restores SVG under `imageService: "compile"`
{
  name: "dev-image-endpoint",
  hooks: {
    "astro:config:setup": ({ command, updateConfig }) => {
      if (command === "dev") {
        updateConfig({
          image: { endpoint: { entrypoint: "astro/assets/endpoint/generic" } },
        });
      }
    },
  },
}
```

Trade-off: dev images are then unoptimized, since the service under `compile`
is the workerd passthrough. Fine for an all-SVG project, less so otherwise.

The other workaround, and what we ended up shipping, is not to use `<Image>`
for SVG at all — a plain `<img src={imported.src}>` bypasses `/_image` in both
dev and build and is byte-identical.
