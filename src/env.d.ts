// Adapter 14 dropped Astro.locals.runtime. Locals now carries only cfContext
// (the ExecutionContext, used by the Sentry middleware); bindings come from
// `cloudflare:workers`, typed by the generated worker-configuration.d.ts.
// https://docs.astro.build/en/guides/integrations-guide/cloudflare/#typing

type Runtime = import("@astrojs/cloudflare").Runtime;
declare namespace App {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Locals extends Runtime {}
}
