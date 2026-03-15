PR to update server islands caching docs on Astro site
to document that deploying updates island id, which triggers
new request i.e. triggers end-user cache miss (useful if want
to repopulate caches)

Add script for generating standard dummy commit for this purpose

## light / dark

- theme hook in charts; is global css
- new skull icon
- change icon shading, adjust icons that look bad in light
  - remove shading from pistons
- refine lightbulb hover behavior
  - tighten gradient in dark mode
- test hidden states
  - shortened season
  - team surprised or eliminated
  - error
  - loading
- lock down style props passing; strict interfaces, list customizations into variants (try cva?)

icons

- pistons shading
