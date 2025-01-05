import { createTransport, SentryError, suppressTracing } from "@sentry/core";

const DEFAULT_TRANSPORT_BUFFER_SIZE = 30;

/**
 * This is a modified promise buffer that collects tasks until drain is called.
 * We need this in the edge runtime because edge function invocations may not share I/O objects, like fetch requests
 * and responses, and the normal PromiseBuffer inherently buffers stuff inbetween incoming requests.
 *
 * A limitation we need to be aware of is that DEFAULT_TRANSPORT_BUFFER_SIZE is the maximum amount of payloads the
 * SDK can send for a given edge function invocation.
 */
class IsolatedPromiseBuffer {
  // We just have this field because the promise buffer interface requires it.
  // If we ever remove it from the interface we should also remove it here.

  constructor(_bufferSize = DEFAULT_TRANSPORT_BUFFER_SIZE) {
    this.$ = [];
    this._taskProducers = [];
    this._bufferSize = _bufferSize;
  }

  /**
   * @inheritdoc
   */
  add(taskProducer) {
    if (this._taskProducers.length >= this._bufferSize) {
      return Promise.reject(
        new SentryError("Not adding Promise because buffer limit was reached."),
      );
    }

    this._taskProducers.push(taskProducer);
    return Promise.resolve({});
  }

  /**
   * @inheritdoc
   */
  drain(timeout) {
    const oldTaskProducers = [...this._taskProducers];
    this._taskProducers = [];

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (timeout && timeout > 0) {
          resolve(false);
        }
      }, timeout);

      // This cannot reject
      Promise.all(
        oldTaskProducers.map((taskProducer) =>
          taskProducer().then(undefined, () => {
            // catch all failed requests
          }),
        ),
      ).then(() => {
        // resolve to true if all fetch requests settled
        clearTimeout(timer);
        resolve(true);
      });
    });
  }
}

/**
 * Creates a Transport that uses the native fetch API to send events to Sentry.
 */
function makeCloudflareTransport(options) {
  function makeRequest(request) {
    const requestOptions = {
      body: request.body,
      method: "POST",
      headers: options.headers,
      ...options.fetchOptions,
    };

    return suppressTracing(() => {
      return fetch(options.url, requestOptions).then((response) => {
        return {
          statusCode: response.status,
          headers: {
            "x-sentry-rate-limits": response.headers.get(
              "X-Sentry-Rate-Limits",
            ),
            "retry-after": response.headers.get("Retry-After"),
          },
        };
      });
    });
  }

  return createTransport(
    options,
    makeRequest,
    new IsolatedPromiseBuffer(options.bufferSize),
  );
}

export { IsolatedPromiseBuffer, makeCloudflareTransport };
//# sourceMappingURL=transport.js.map

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

  ...(import.meta.env.PROD && {
    transport: makeCloudflareTransport,
  }),
});
