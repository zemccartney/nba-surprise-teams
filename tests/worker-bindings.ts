// Node-only resolution target for handler tests. They must explicitly mock
// cloudflare:workers; this is not a Worker runtime or a fake KV implementation.
throw new Error("Worker bindings must be explicitly mocked in Node tests");

export {};
