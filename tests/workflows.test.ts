import { spawnSync } from "node:child_process";
import Fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { deploymentTarget } from "../scripts/deployment-target";

const deploy = await Fs.readFile(
  new URL("../.github/workflows/deploy.yml", import.meta.url),
  "utf8",
);

it("keeps full verification before publishing behind the temporary cutover gate", () => {
  expect(deploy).toContain("vars.DEPLOY_ENABLED == 'true'");
  expect(deploy).toContain('branches: ["**"]');
  expect(deploy).toContain('node scripts/deployment-target.ts "$GITHUB_REF"');
  const build = deploy.indexOf("pnpm run build");
  expect(build).toBeGreaterThan(-1);
  expect(deploy.indexOf("pnpm exec wrangler deploy")).toBeGreaterThan(build);
  expect(deploy.indexOf("pnpm exec wrangler versions upload")).toBeGreaterThan(
    build,
  );
});

describe("deployment ref selection", () => {
  it.each([
    ["refs/heads/main", "production"],
    ["refs/heads/Main", "preview"],
    ["refs/heads/chart-parity", "preview"],
    ["refs/heads/main/feature", "preview"],
  ])("selects %s case-sensitively", (ref, target) => {
    expect(deploymentTarget(ref)).toBe(target);
  });
  it.each(["refs/tags/main", "refs/tags/release", "", "refs/heads/"])(
    "rejects non-branch input %j",
    (ref) => {
      expect(() => deploymentTarget(ref)).toThrow(
        "Only branch refs may deploy",
      );
    },
  );
  it.each([
    ["refs/heads/main", 0, "production"],
    ["refs/heads/Main", 0, "preview"],
    ["refs/tags/main", 1, ""],
  ])("CLI handles %s without deploying", (ref, status, output) => {
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(
          new URL("../scripts/deployment-target.ts", import.meta.url),
        ),
        ref,
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(status);
    expect(result.stdout.trim()).toBe(output);
    expect(result.stderr.trim()).toBe(
      status === 0 ? "" : "Only branch refs may deploy",
    );
  });
});
