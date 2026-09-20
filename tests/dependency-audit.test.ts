import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import Path from "node:path";
import { expect, it } from "vitest";

// Exercise the pinned real auditor against a loopback fixture, not public
// advisory data that can change under a unit test. No registry credentials.
it.each([
  ["clean", 0],
  ["low", 1],
  ["moderate", 1],
  ["high", 1],
  ["critical", 1],
  ["error", 1],
] as const)(
  "dependency audit: %s returns %i",
  async (mode, expected) => {
    const directory = mkdtempSync(Path.join(tmpdir(), "nbastt-audit-test-"));
    const requests: string[] = [];
    const server = createServer((request, response) => {
      request.resume();
      requests.push(request.url ?? "");
      response.setHeader("Content-Type", "application/json");
      if (request.method === "GET") {
        response.end(
          JSON.stringify({
            "dist-tags": { latest: "2.0.0" },
            name: "fixture-lib",
            versions: {
              "1.0.0": { name: "fixture-lib", version: "1.0.0" },
              "2.0.0": { name: "fixture-lib", version: "2.0.0" },
            },
          }),
        );
      } else if (mode === "error") {
        response.statusCode = 400;
        response.end(JSON.stringify({ error: "fixture registry unavailable" }));
      } else {
        response.end(
          JSON.stringify(
            mode === "clean"
              ? {}
              : {
                  "fixture-lib": [
                    {
                      cvss: { score: 8, vectorString: "" },
                      cwe: ["CWE-20"],
                      github_advisory_id: "GHSA-aaaa-bbbb-cccc",
                      id: 123_456,
                      severity: mode,
                      title: "Fixture vulnerability",
                      url: "https://example.invalid/advisory",
                      vulnerable_versions: "<2.0.0",
                    },
                  ],
                },
          ),
        );
      }
    });
    try {
      writeFileSync(
        Path.join(directory, "package.json"),
        JSON.stringify({
          dependencies: { "fixture-lib": "1.0.0" },
          name: "audit-control",
          version: "1.0.0",
        }),
      );
      writeFileSync(Path.join(directory, ".npmrc"), "");
      writeFileSync(
        Path.join(directory, "pnpm-lock.yaml"),
        `lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      fixture-lib:
        specifier: 1.0.0
        version: 1.0.0
packages:
  fixture-lib@1.0.0:
    resolution: {integrity: sha512-AA==}
snapshots:
  fixture-lib@1.0.0: {}
`,
      );
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
      );
      const address = server.address();
      if (!address || typeof address === "string")
        throw new Error("Missing fixture port");
      const result = await new Promise<{
        code: null | number;
        stderr: string;
        stdout: string;
      }>((resolve, reject) => {
        const child = spawn(
          process.env.npm_execpath ?? "pnpm",
          [
            "audit",
            "--json",
            "--registry",
            `http://127.0.0.1:${address.port}`,
            "--npmrc-auth-file",
            Path.join(directory, ".npmrc"),
          ],
          { cwd: directory, timeout: 10_000 },
        );
        let stderr = "",
          stdout = "";
        child.stdout.on("data", (data: Buffer) => {
          stdout += data.toString();
        });
        child.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });
        child.on("error", reject);
        child.on("close", (code) => resolve({ code, stderr, stdout }));
      });
      expect(requests).toContain("/-/npm/v1/security/advisories/bulk");
      expect(result.code).toBe(expected);
      const report =
        mode === "error"
          ? result.stderr
          : JSON.stringify(JSON.parse(result.stdout));
      const message =
        mode === "error"
          ? "ERR_PNPM_AUDIT_BAD_RESPONSE"
          : mode === "clean"
            ? '"advisories":{}'
            : "Fixture vulnerability";
      expect(report).toContain(message);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      rmSync(directory, { force: true, recursive: true });
    }
  },
  15_000,
);
