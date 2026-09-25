import handler from "@astrojs/cloudflare/entrypoints/server";
import * as Sentry from "@sentry/cloudflare";
import { PUBLIC_DEPLOY_ENV, PUBLIC_SENTRY_DSN } from "astro:env/client";

// The build plugin injects this same release into browser and Worker bundles.
// Read it per request, after all modules have evaluated. No CF deployment ID:
// that would differ from the commit used for browser events and map uploads.
const build = globalThis as typeof globalThis & {
  SENTRY_RELEASE?: { id?: string };
};

export default Sentry.withSentry<Env>(
  () => ({
    ...(PUBLIC_SENTRY_DSN && { dsn: PUBLIC_SENTRY_DSN }),
    environment: PUBLIC_DEPLOY_ENV,
    ...(build.SENTRY_RELEASE?.id && { release: build.SENTRY_RELEASE.id }),
    tracesSampleRate: 0.1,
  }),
  handler,
);
