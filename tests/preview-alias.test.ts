import { describe, expect, it } from "vitest";

import { previewAlias } from "../scripts/preview-alias";

describe("Cloudflare preview aliases", () => {
  it.each([
    "fix/chart-tooltip",
    "Feature",
    "123-start",
    "🏀",
    "a".repeat(200),
    "$(echo nope)",
  ])("makes a valid deterministic alias for %s", (branch) => {
    const alias = previewAlias(branch, "nbastt");
    expect(alias).toMatch(/^[a-z][a-z0-9-]*$/);
    expect(`${alias}-nbastt`.length).toBeLessThanOrEqual(63);
    expect(previewAlias(branch, "nbastt")).toBe(alias);
  });
  it("distinguishes refs that normalize or truncate identically", () => {
    for (const [a, b] of [
      ["fix/chart", "fix_chart"],
      ["Feature", "feature"],
      ["a".repeat(200) + "x", "a".repeat(200) + "y"],
    ] as const) {
      expect(previewAlias(a, "nbastt")).not.toBe(previewAlias(b, "nbastt"));
    }
  });
  it("budgets for the actual deployed Worker name", () => {
    const worker = "nbastt-preview-environment";
    expect(`${previewAlias("a".repeat(200), worker)}-${worker}`.length).toBe(
      63,
    );
    expect(() => previewAlias("main", "w".repeat(60))).toThrow(
      "insufficient room",
    );
    expect(() => previewAlias("", "nbastt")).toThrow("required");
  });
});
