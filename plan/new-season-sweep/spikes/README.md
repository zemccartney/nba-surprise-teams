# Spikes

Throwaway code kept for reference, not wired into the build. Saved with a
`.txt` extension on purpose so `astro check`, ESLint, and prettier ignore it.

## The custom `/_image` endpoint (2026-09-10)

Zack's idea, during the Step 8 image round: "build out a simple image service
that just layers on an svg exemption, then passes through to cloudflare's
default."

`image-endpoint.ts.txt` and `astro.config.mjs.txt` are that, and they work.
Verified: build succeeds, images prerender to static `/_astro/*.svg`, the dev
server returns `image/svg+xml` for 47 of 47 images, the on-demand island
returns `image/svg+xml` at 200, `astro check` is clean across 57 files, and 0
of 44 screenshots differ.

It was not adopted, for reasons that are about cost rather than correctness:

- It requires `imageService: "custom"`, which makes the adapter print
  "The Sharp image service cannot run inside the workerd runtime, so
  `/_image` requests will fail in dev and production" on every dev start. The
  warning is false here — our endpoint short-circuits before the service is
  consulted — but it is unavoidable and it will mislead a future reader.
- Under `custom` the adapter does not provision the `IMAGES` binding, so the
  raster branch is inert until one is added to the account.
- Astro requires `export const prerender = false`, which trips
  `unicorn/consistent-boolean-name` and needs a lint disable.
- Most of all, it buys nothing today. Under `imageService: "compile"` the
  **dev** image service is already the adapter's workerd-safe passthrough, so
  the committed generic-endpoint fix handles raster too. Checked with a real
  400x400 PNG: the build converted it to webp (3,265 B to 100 B, so
  build-time sharp optimization is fully intact) and dev served it 200 and
  rendered it.

The one thing this would fix: in dev, that PNG comes back as the original
bytes labelled `Content-Type: image/webp`, because the passthrough service
reports the format the URL asked for without converting. Chrome sniffs and
renders it. Dev-only cosmetic dishonesty.

Revisit if the site ever wants **runtime** raster transformation through
Cloudflare Images.
