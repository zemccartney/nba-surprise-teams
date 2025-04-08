// https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/#use-bindings-in-your-astro-application

interface ENV {
  GAMES_KV: KVNamespace;
}

// use a default runtime configuration (advanced mode).
type Runtime = import("@astrojs/cloudflare").Runtime<ENV>;
declare namespace App {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Locals extends Runtime {}
}
