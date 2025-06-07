import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sentry from "@sentry/astro";
import tailwindcss from "@tailwindcss/vite";
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
    react(),
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
    archiver(),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      // https://github.com/withastro/adapters/pull/436#issuecomment-2525190557
      // Use react-dom/server.edge instead of react-dom/server.browser for React 19.
      // Without this, MessageChannel from node:worker_threads needs to be polyfilled.
      alias: import.meta.env.PROD && {
        "react-dom/server": "react-dom/server.edge",
      },
    },
    ssr: {
      // needed for sentry cloudflare
      external: ["node:async_hooks"],
    },
  },
});
