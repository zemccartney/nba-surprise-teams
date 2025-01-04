// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind()],
  experimental: {
    svg: true,
  },
  output: "server",
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
      SIM_FULL_SEASON: envField.boolean({
        context: "server",
        access: "public",
        optional: true,
        default: false,
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
  },
});
