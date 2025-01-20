import { defineMiddleware } from "astro:middleware";
import { whenAmI, When } from "@it-astro:when";
import { PUBLIC_DEPLOY_ENV, PUBLIC_SENTRY_DSN } from "astro:env/client";
import * as Sentry from "@sentry/cloudflare";

export const onRequest = defineMiddleware((ctx, next) => {
  console.log("IN OUR MIDDLEWARE", whenAmI);

  if (whenAmI !== When.Server) {
    return next();
  }
  const requestHandlerOptions = {
    options: {
      dsn: PUBLIC_SENTRY_DSN!,
      tracesSampleRate: 0.1,
      environment: PUBLIC_DEPLOY_ENV,
    },
    // CF execution context: https://github.com/withastro/adapters/blob/83cedad780bf7a23ae9f6ca0c44a7b7f1c1767e1/packages/cloudflare/src/entrypoints/server.ts
    // @ts-ignore
    context: ctx.locals.runtime.ctx,
    request: ctx.request,
  };

  // @ts-ignore
  return Sentry.wrapRequestHandler(requestHandlerOptions, () => next());
});
