// Temporary diagnostic safety checks; remove with the diagnostic route.
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  capture: vi.fn().mockReturnValue("test-event"),
  del: vi.fn(),
  get: vi.fn(),
  loader: vi.fn(),
  put: vi.fn(),
  settings: { PUBLIC_DEPLOY_ENV: "preview" },
  worker: { CUTOVER_PROBE_TOKEN: "test-only-token" },
}));
vi.mock("astro:env/client", () => mocks.settings);
vi.mock("cloudflare:workers", () => ({
  env: {
    ...mocks.worker,
    GAMES_KV: { delete: mocks.del, get: mocks.get, put: mocks.put },
  },
}));
vi.mock("@sentry/cloudflare", () => ({
  captureException: mocks.capture,
  flush: vi.fn().mockResolvedValue(true),
  withScope: (fn: (scope: { addEventProcessor: () => void }) => void) =>
    fn({ addEventProcessor: vi.fn() }),
}));
vi.mock(import("../src/loaders/live"), async (original) => ({
  ...(await original()),
  default: mocks.loader,
}));

const { POST } = await import("../src/pages/_cutover/check");
const run = (token?: string) =>
  POST({
    request: new Request("https://preview.invalid/_cutover/check/", {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      method: "POST",
    }),
  } as Parameters<typeof POST>[0]);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.settings.PUBLIC_DEPLOY_ENV = "preview";
  mocks.get.mockResolvedValue(
    JSON.stringify({
      data: { expiresAt: 0, games: [] },
      id: "07423eeb-1ebb-4cf1-89b7-ab05795b5ac1",
    }),
  );
  mocks.loader.mockResolvedValue({ games: [] });
});
it.each([undefined, "wrong"])(
  "rejects unauthorized calls without IO (%s)",
  async (token) => {
    const response = await run(token);
    expect(response.status).toBe(404);
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.loader).not.toHaveBeenCalled();
  },
);
it("rejects production even with the correct token", async () => {
  mocks.settings.PUBLIC_DEPLOY_ENV = "production";
  const response = await run("test-only-token");
  expect(response.status).toBe(404);
  expect(mocks.put).not.toHaveBeenCalled();
});
it("uses only a disposable key and always deletes it", async () => {
  const result = await run("test-only-token");
  expect(result.status).toBe(200);
  const key = mocks.put.mock.calls[0]?.[0];
  expect(key).toMatch(/^__cutover_smoke:/);
  expect(mocks.put.mock.calls[0]?.[2]).toEqual({ expirationTtl: 300 });
  expect(mocks.del).toHaveBeenCalledWith(key);
  expect(mocks.loader).toHaveBeenCalledWith("2026");
});
it("cleans up if cache validation fails", async () => {
  mocks.get.mockResolvedValue("invalid-json");
  await expect(run("test-only-token")).rejects.toThrow("Preview KV round-trip");
  expect(mocks.del).toHaveBeenCalledOnce();
  expect(mocks.loader).not.toHaveBeenCalled();
});
