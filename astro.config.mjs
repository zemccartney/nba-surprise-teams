import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import cloudflare from "@astrojs/cloudflare";
import sentry from "@sentry/astro";
import { loadEnv } from "vite";
const { PUBLIC_DEPLOY_ENV, SENTRY_AUTH_TOKEN, PUBLIC_SENTRY_DSN } = loadEnv(
  process.env.NODE_ENV,
  process.cwd(),
  "",
);

const siteByEnv = {
  preview: "https://dev.nba-surprise-teams.pages.dev",
  production: "https://nba-surprise-teams.grepco.net",
};

// https://astro.build/config
export default defineConfig({
  ...(PUBLIC_DEPLOY_ENV && {
    site: siteByEnv[PUBLIC_DEPLOY_ENV],
  }),
  integrations: [
    react(),
    tailwind(),
    ...(SENTRY_AUTH_TOKEN
      ? [
          sentry({
            dsn: PUBLIC_SENTRY_DSN,
            environment: PUBLIC_DEPLOY_ENV,
            sourceMapsUploadOptions: {
              project: "nba-surprise-team-tracker",
              authToken: SENTRY_AUTH_TOKEN,
            },
          }),
        ]
      : []),
  ],
  experimental: {
    svg: true,
  },
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  env: {
    schema: {
      PUBLIC_DEPLOY_ENV: envField.enum({
        context: "client",
        access: "public",
        values: ["local", "preview", "production"],
        optional: false,
        default: "local",
      }),
      PUBLIC_SENTRY_DSN: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
    },
  },
  vite: {
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
