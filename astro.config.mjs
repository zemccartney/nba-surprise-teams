// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind()],
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
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
