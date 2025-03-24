import * as Sentry from "@sentry/cloudflare";
import { PUBLIC_DEPLOY_ENV, PUBLIC_SENTRY_DSN } from "astro:env/client";
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((ctx, next) => {
  // middleware are called during static page generation, too; since building occurs in a node
  // env (not a cf env) and we wouldn't need sentry at buildtime anyway, we passthrough if prerendering
  const whenServer = !ctx.isPrerendered;

  if (!whenServer) {
    return next();
  }
  const requestHandlerOptions = {
    context: ctx.locals.runtime.ctx,

    options: {
      dsn: PUBLIC_SENTRY_DSN,
      environment: PUBLIC_DEPLOY_ENV,
      tracesSampleRate: 0.1,
    },
    request: ctx.request,
  };

  // @ts-expect-error : Not sure viable to tell Typescript that requestHandlerOptions will be correctly typed in a Cloudflare environment
  return Sentry.wrapRequestHandler(requestHandlerOptions, () => next());
});
