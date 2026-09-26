// Enrich the Worker span with Astro routes and capture errors Astro handles as 500s.
// @ts-expect-error SDK 10.27 exports a missing index.types.d.ts; its implementation and index.d.ts exist.
export { onRequest } from "@sentry/astro/middleware";
