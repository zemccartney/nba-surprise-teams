import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handler: { fetch: vi.fn() },
  withSentry: vi.fn(),
  wrapped: { fetch: vi.fn() },
}));
vi.mock("@astrojs/cloudflare/entrypoints/server", () => ({
  default: mocks.handler,
}));
vi.mock("@sentry/cloudflare", () => ({ withSentry: mocks.withSentry }));
vi.mock("astro:env/client", () => ({
  PUBLIC_DEPLOY_ENV: "preview",
  PUBLIC_SENTRY_DSN: "https://public@example.invalid/1",
}));
beforeEach(() => {
  vi.resetModules();
  mocks.withSentry.mockReturnValue(mocks.wrapped);
});
afterEach(() => vi.unstubAllGlobals());

it("wraps the actual adapter handler once and reads the build release per request", async () => {
  vi.stubGlobal("SENTRY_RELEASE", undefined);
  const entry = await import("../sentry.server.config");
  expect(entry.default).toBe(mocks.wrapped);
  expect(mocks.withSentry).toHaveBeenCalledOnce();
  expect(mocks.withSentry.mock.calls[0]?.[1]).toBe(mocks.handler);
  const options = mocks.withSentry.mock.calls[0]?.[0] as () => Record<
    string,
    unknown
  >;
  expect(options()).toEqual({
    dsn: "https://public@example.invalid/1",
    environment: "preview",
    release: undefined,
    tracesSampleRate: 0.1,
  });
  vi.stubGlobal("SENTRY_RELEASE", { id: "build-commit-sha" });
  expect(options().release).toBe("build-commit-sha");
});

it("pairs Worker initialization with the SDK's Astro middleware", () => {
  const config = readFileSync(
    new URL("../astro.config.mjs", import.meta.url),
    "utf8",
  );
  expect(config).toContain("enabled: { client: true, server: false }");
  expect(config).not.toContain("autoInstrumentation:");
  expect(config).toContain("filesToDeleteAfterUpload: []");
  const middleware = readFileSync(
    new URL("../src/middleware.ts", import.meta.url),
    "utf8",
  );
  expect(middleware).toContain(
    'export { onRequest } from "@sentry/astro/middleware"',
  );
  expect(middleware).not.toContain("wrapRequestHandler");
  const wrangler = readFileSync(
    new URL("../wrangler.jsonc", import.meta.url),
    "utf8",
  );
  expect(wrangler).toContain('"main": "./sentry.server.config.ts"');
});
