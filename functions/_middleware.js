import * as Sentry from "@sentry/cloudflare";

export const onRequest = Sentry.sentryPagesPlugin({
  dsn: process.env.PUBLIC_SENTRY_DSN,
  environment: process.env.PUBLIC_DEPLOY_ENV,
  // Set tracesSampleRate to 1.0 to capture 100% of spans for tracing.
  // Learn more at
  // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
  tracesSampleRate: 0.1,
});
