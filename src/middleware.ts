import { defineMiddleware } from "astro:middleware";
import { PUBLIC_DEPLOY_ENV, PUBLIC_SENTRY_DSN } from "astro:env/client";
import * as Sentry from "@sentry/cloudflare";

export const onRequest = defineMiddleware((ctx, next) => {
  // middleware are called during static page generation, too; since building occurs in a node
  // env (not a cf env) and we wouldn't need sentry at buildtime anyway, we passthrough if prerendering
  const whenServer = !ctx.isPrerendered;

  if (!whenServer) {
    return next();
  }
  const requestHandlerOptions = {
    options: {
      dsn: PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: PUBLIC_DEPLOY_ENV,
    },

    context: ctx.locals.runtime.ctx,
    request: ctx.request,
  };

  // @ts-expect-error : Not sure viable to tell Typescript that requestHandlerOptions will be correctly typed in a Cloudflare environment
  return Sentry.wrapRequestHandler(requestHandlerOptions, () => next());
});
