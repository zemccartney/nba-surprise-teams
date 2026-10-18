import { createHash } from "node:crypto";
import { expect, it } from "vitest";

import { isProbeAuthorized } from "../src/diagnostics/migration-probe";

const auth = {
  expiresAt: 2000,
  tokenHash: createHash("sha256").update("unit-test-token").digest("hex"),
};
const request = (token?: string) =>
  new Request("https://preview.example/migration-check/worker", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

it("allows the correct bearer only in preview before expiry", async () => {
  expect(
    await isProbeAuthorized(request("unit-test-token"), "preview", auth, 1000),
  ).toBe(true);
});
it.each([undefined, "wrong-token"])(
  "rejects missing/wrong bearer: %s",
  async (token) => {
    expect(await isProbeAuthorized(request(token), "preview", auth, 1000)).toBe(
      false,
    );
  },
);
it.each(["production", undefined, "local"])(
  "rejects environment %s even with the correct bearer",
  async (environment) => {
    expect(
      await isProbeAuthorized(
        request("unit-test-token"),
        environment,
        auth,
        1000,
      ),
    ).toBe(false);
  },
);
it("fails closed at expiry", async () => {
  expect(
    await isProbeAuthorized(request("unit-test-token"), "preview", auth, 2000),
  ).toBe(false);
});
