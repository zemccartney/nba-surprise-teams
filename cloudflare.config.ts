import { bindings, defineConfig } from "cf/config";

export default defineConfig((ctx) => {
  const target = ctx.isPreview
    ? {
        domains: [],
        env: {
          GAMES_KV: bindings.kv({ id: "6a0d30705c634691873dd1dd122969e3" }),
          PUBLIC_DEPLOY_ENV: bindings.text("preview"),
        },
      }
    : {
        domains: ["nbastt.grepco.net", "nba-surprise-teams.grepco.net"],
        env: {
          GAMES_KV: bindings.kv({ id: "6061594acc5c4fb6b3846b0c78f9e5a3" }),
        },
      };

  return {
    worker: {
      compatibilityDate: "2026-09-10",
      domains: target.domains,
      entrypoint: "./sentry.server.config.ts",
      env: {
        ASSETS: bindings.assets(),
        ...target.env,
      },
      // The same Worker owns production and native branch Previews.
      name: "nba-surprise-teams",
      observability: { enabled: true },
      previewUrls: true,
      workersDev: true,
    },
  };
});
