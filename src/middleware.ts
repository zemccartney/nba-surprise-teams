import { defineMiddleware } from "astro:middleware";
import { PUBLIC_SENTRY_DSN } from "astro:env/client";
import { Toucan } from "toucan-js";

export const onRequest = defineMiddleware((ctx, next) => {
  if (import.meta.env.PROD && !ctx.isPrerendered) {
    console.log(ctx.locals, "IN OUR MIDDLEWARE");

    const Sentry = new Toucan({
      dsn: PUBLIC_SENTRY_DSN!,
      // CF execution context: https://github.com/withastro/adapters/blob/83cedad780bf7a23ae9f6ca0c44a7b7f1c1767e1/packages/cloudflare/src/entrypoints/server.ts
      // @ts-ignore
      context: ctx.locals.runtime.ctx,
      request: ctx.request,
    });

    console.log(Sentry, "DID SENTRY INIT");

    // @ts-ignore
    ctx.locals.Sentry = Sentry;
  }

  return next();
});
