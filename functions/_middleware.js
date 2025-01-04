import * as Sentry from "@sentry/cloudflare";

export const onRequest = Sentry.sentryPagesPlugin((context) => ({
  dsn: "https://46dbd994010d20746a0c9651942b13b6@o4508586287824896.ingest.us.sentry.io/4508586289856512",
  environment: "preview",
  tracesSampleRate: 0.1,
  debug: true,
}));
