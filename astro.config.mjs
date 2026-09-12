import cloudflare from "@astrojs/cloudflare";
import sentry from "@sentry/astro";
import { defineConfig, envField } from "astro/config";
import { loadEnv } from "vite";

import archiver from "./archiver/integration.ts";

const { PUBLIC_DEPLOY_ENV, PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN } = loadEnv(
  process.env.NODE_ENV,
  process.cwd(),
  "",
);

const siteByEnv = {
  preview: "https://dev.nba-surprise-teams.pages.dev",
  production: "https://nbastt.grepco.net",
};

export default defineConfig({
  ...(PUBLIC_DEPLOY_ENV && {
    site: siteByEnv[PUBLIC_DEPLOY_ENV],
  }),
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  // The default, written down because it pairs with trailingSlash below: with
  // "directory", Astro.url.pathname ends in "/" at build time as it does in dev
  // (https://docs.astro.build/en/reference/configuration-reference/#effect-on-astrourl).
  build: {
    format: "directory",
  },
  env: {
    schema: {
      PUBLIC_DEPLOY_ENV: envField.enum({
        access: "public",
        context: "client",
        default: "local",
        optional: false,
        values: ["local", "preview", "production"],
      }),
      PUBLIC_SENTRY_DSN: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  integrations: [
    archiver(),
    ...(SENTRY_AUTH_TOKEN
      ? [
          sentry({
            dsn: PUBLIC_SENTRY_DSN,
            environment: PUBLIC_DEPLOY_ENV,
            sourceMapsUploadOptions: {
              authToken: SENTRY_AUTH_TOKEN,
              project: "nba-surprise-team-tracker",
            },
          }),
        ]
      : []),
  ],
  // Cloudflare already 308s /about to /about/ for prerendered pages. Declaring it
  // makes the dev server match (a request without the slash is a 404 there), so
  // internal links are written with the slash and the nav highlight in
  // subpage.astro compares equal paths.
  trailingSlash: "always",
  vite: {
    ssr: {
      external: [
        // needed for sentry cloudflare
        "node:async_hooks",
        // used only by content loaders at build, I think? not needed at runtime (i hope / assume)
        "node:fs/promises",
        "node:path",
        "node:fs",
        "node:url",
        "fs",
        "path",
      ],
    },
  },
});
