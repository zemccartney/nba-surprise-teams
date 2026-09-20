import { spawnSync } from "node:child_process";
import Fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import packageJson from "../package.json";
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

it("audits all dependencies after installation and before verification/deployment, including pre-commit", async () => {
  expect(packageJson.scripts.audit).toBe("pnpm audit");
  expect(packageJson.scripts.postinstall).toBe("pnpm run audit");
  expect(packageJson.scripts.verify).toMatch(/^pnpm run audit && /);
  expect(packageJson.scripts.build).toContain("pnpm run verify && astro build");
  const hooks = await Fs.readFile(
    new URL("../hk.pkl", import.meta.url),
    "utf8",
  );
  expect(hooks).toMatch(/\["audit"\]\s*=\s*\{[^}]*check = "pnpm run audit"/);
  expect(hooks).toContain("steps = (linters)");
  const mise = await Fs.readFile(
    new URL("../mise.toml", import.meta.url),
    "utf8",
  );
  const setup = mise.match(/\[tasks\.setup\][\s\S]*?(?=\n\[|$)/)?.[0];
  expect(setup).toMatch(
    /"pnpm install --frozen-lockfile",[\s\S]*"pnpm run audit"/,
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
