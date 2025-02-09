import { defineMiddleware } from "astro:middleware";
import { PUBLIC_DEPLOY_ENV, PUBLIC_SENTRY_DSN } from "astro:env/client";
import * as Sentry from "@sentry/cloudflare";

export const onRequest = defineMiddleware((ctx, next) => {
  // middleware are called during static page generation, too; since building occurs in a node
  // env and we wouldn't need sentry at buildtime anyway, we passthrough if prerendering
  const whenServer = import.meta.env.PROD && !ctx.isPrerendered;

  if (!whenServer) {
    return next();
  }
  const requestHandlerOptions = {
    options: {
      dsn: PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: PUBLIC_DEPLOY_ENV,
    },

    // @ts-expect-error : "Property 'runtime' does not exist on type 'Locals'" ; provided by CF execution context: https://github.com/withastro/adapters/blob/83cedad780bf7a23ae9f6ca0c44a7b7f1c1767e1/packages/cloudflare/src/entrypoints/server.ts
    context: ctx.locals.runtime.ctx,
    request: ctx.request,
  };

  // @ts-expect-error : Not sure viable to tell Typescript that requestHandlerOptions will be correctly typed in a Cloudflare environment
  return Sentry.wrapRequestHandler(requestHandlerOptions, () => next());
});
