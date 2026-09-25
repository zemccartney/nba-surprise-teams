// Temporary diagnostic safety tests; remove with the endpoint.
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
  flush: vi.fn(),
  settings: { PUBLIC_DEPLOY_ENV: "preview" },
  worker: { CUTOVER_PROBE_TOKEN: "test-only-token" },
}));
vi.mock("astro:env/client", () => mocks.settings);
vi.mock("cloudflare:workers", () => ({ env: mocks.worker }));
vi.mock("@sentry/cloudflare", () => ({
  captureException: mocks.capture,
  flush: mocks.flush,
  getClient: () => ({
    getOptions: () => ({ environment: "preview", release: "test-release" }),
  }),
  withScope: (fn: (scope: { addEventProcessor: () => void }) => void) =>
    fn({ addEventProcessor: vi.fn() }),
}));
const { POST } = await import("../src/pages/cutover/sourcemaps");
const run = (token?: string) =>
  POST({
    request: new Request("https://preview.invalid/cutover/sourcemaps/", {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      method: "POST",
    }),
  } as Parameters<typeof POST>[0]);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.capture.mockReturnValue("test-event");
  mocks.flush.mockResolvedValue(true);
  mocks.settings.PUBLIC_DEPLOY_ENV = "preview";
  mocks.worker.CUTOVER_PROBE_TOKEN = "test-only-token";
});
it.each([undefined, "wrong"])(
  "rejects unauthorized calls (%s)",
  async (token) => {
    const response = await run(token);
    expect(response.status).toBe(404);
    expect(mocks.capture).not.toHaveBeenCalled();
  },
);
it("rejects production with the correct token", async () => {
  mocks.settings.PUBLIC_DEPLOY_ENV = "production";
  const response = await run("test-only-token");
  expect(response.status).toBe(404);
  expect(mocks.capture).not.toHaveBeenCalled();
});
it("rejects calls without a configured secret", async () => {
  mocks.worker.CUTOVER_PROBE_TOKEN = "";
  const response = await run("test-only-token");
  expect(response.status).toBe(404);
  expect(mocks.capture).not.toHaveBeenCalled();
});
it("captures one labelled event for an authorized preview request", async () => {
  const response = await run("test-only-token");
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toMatchObject({
    eventId: "test-event",
    flushed: true,
  });
  expect(mocks.capture).toHaveBeenCalledOnce();
});
