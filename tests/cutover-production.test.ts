// Temporary safety checks; remove with the hosted diagnostic endpoint.
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  processor: vi.fn(),
  settings: { PUBLIC_DEPLOY_ENV: "production" },
  worker: { CUTOVER_PROBE_TOKEN: "test-token" },
}));
vi.mock("astro:env/client", () => mocks.settings);
vi.mock("cloudflare:workers", () => ({ env: mocks.worker }));
vi.mock("@sentry/cloudflare", () => ({
  getIsolationScope: () => ({ addEventProcessor: mocks.processor }),
}));
const { POST } = await import("../src/pages/cutover/production");
const run = (
  token?: string,
  id = "1234567890abcdef12345678",
  hostname = "nba-surprise-teams.zemccartney.workers.dev",
) => {
  const url = new URL(`https://${hostname}/cutover/production/?id=${id}`);
  return POST({
    request: new Request(url, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      method: "POST",
    }),
    url,
  } as Parameters<typeof POST>[0]);
};
beforeEach(() => {
  mocks.settings.PUBLIC_DEPLOY_ENV = "production";
  mocks.worker.CUTOVER_PROBE_TOKEN = "test-token";
});
it.each([undefined, "wrong"])(
  "rejects unauthorized calls (%s)",
  async (token) => {
    const response = await run(token);
    expect(response.status).toBe(404);
    expect(mocks.processor).not.toHaveBeenCalled();
  },
);
it("rejects preview", async () => {
  mocks.settings.PUBLIC_DEPLOY_ENV = "preview";
  const response = await run("test-token");
  expect(response.status).toBe(404);
});
it("rejects a missing secret", async () => {
  mocks.worker.CUTOVER_PROBE_TOKEN = "";
  const response = await run("test-token");
  expect(response.status).toBe(404);
});
it("rejects malformed probe IDs", async () => {
  const response = await run("test-token", "invalid");
  expect(response.status).toBe(400);
});
it("rejects custom-domain calls even with the secret", async () => {
  const response = await run(
    "test-token",
    "1234567890abcdef12345678",
    "nbastt.grepco.net",
  );
  expect(response.status).toBe(404);
});
it("throws the labelled error after installing request redaction", () => {
  expect(() => run("test-token")).toThrow(
    "NBASTT production middleware smoke 1234567890abcdef12345678",
  );
  expect(mocks.processor).toHaveBeenCalledOnce();
});
