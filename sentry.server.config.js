import * as Sentry from "@sentry/astro";

console.log(
  "IN OUR SENTRY SERVER CONF",
  import.meta.env.PUBLIC_SENTRY_DSN,
  import.meta.env.PUBLIC_DEPLOY_ENV,
);

Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DSN,
  environment: import.meta.env.PUBLIC_DEPLOY_ENV,

  // Define how likely traces are sampled. Adjust this value in production,
  // or use tracesSampler for greater control.
  tracesSampleRate: 0.1,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // If the entire session is not sampled, use the below sample rate to sample
  // sessions when an error occurs.
  replaysOnErrorSampleRate: 0.1,

  debug: true,
});
