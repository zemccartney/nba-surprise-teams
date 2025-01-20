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

// if running locally, no sentry
// deploy env to determine sentry project / general environment
// set site based on env
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
    sentry({
      dsn: PUBLIC_SENTRY_DSN,
      environment: PUBLIC_DEPLOY_ENV,
      ...(SENTRY_AUTH_TOKEN && {
        sourceMapsUploadOptions: {
          project: "nba-surprise-team-tracker",
          authToken: SENTRY_AUTH_TOKEN,
        },
      }),
    }),
  ],
  experimental: {
    svg: true,
  },
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
    routes: {
      extend: {
        // Works around an odd bug in astro@5.1.1 (at least) where builds don't add this pattern to include in the output _routes.json for cloudflare
        // this path was automatically added in astro@5.0.5 (at least), so seems to be some sort of regression
        // TODO Report issue
        include: [
          {
            pattern: "/_server-islands/*",
          },
        ],
      },
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
      SIM_FULL_SEASON: envField.boolean({
        context: "server",
        access: "public",
        optional: true,
        default: false,
      }),
      TURSO_URL: envField.string({
        context: "server",
        access: "secret",
        optional: false,
      }),
      TURSO_AUTH_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: process.env.NODE_ENV !== "production",
      }),
    },
  },
  vite: {
    resolve: {
      // https://github.com/withastro/adapters/pull/436#issuecomment-2525190557
      // Use react-dom/server.edge instead of react-dom/server.browser for React 19.
      // Without this, MessageChannel from node:worker_threads needs to be polyfilled.
      // @ts-ignore
      alias: import.meta.env.PROD && {
        "react-dom/server": "react-dom/server.edge",
      },
    },
    ssr: {
      external: ["node:async_hooks"],
    },
  },
});
