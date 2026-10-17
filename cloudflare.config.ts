import { bindings, defineConfig } from "cf/config";

export default defineConfig((ctx) => ({
  worker: {
    compatibilityDate: "2026-09-10",
    // The same Worker owns production and native branch Previews.
    domains: ctx.isPreview
      ? []
      : ["nbastt.grepco.net", "nba-surprise-teams.grepco.net"],
    entrypoint: "./sentry.server.config.ts",
    env: {
      ASSETS: bindings.assets(),
      GAMES_KV: bindings.kv({
        id: ctx.isPreview
          ? "6a0d30705c634691873dd1dd122969e3"
          : "6061594acc5c4fb6b3846b0c78f9e5a3",
      }),
      ...(ctx.isPreview && {
        PUBLIC_DEPLOY_ENV: bindings.text("preview"),
      }),
    },
    name: "nba-surprise-teams",
    observability: { enabled: true },
    previewUrls: true,
    workersDev: true,
  },
}));
