import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import Path from "node:path";
import { expect, it } from "vitest";

import { auditArtifacts } from "../data/node/audit";
it("rejects changed, missing, unexpected and forbidden final artifacts", () => {
  const dir = mkdtempSync(Path.join(tmpdir(), "nbastt-audit-"));
  mkdirSync(Path.join(dir, "client"));
  mkdirSync(Path.join(dir, "server"));
  const seal = (code: string) => {
    writeFileSync(Path.join(dir, "server/entry.js"), code);
    writeFileSync(
      Path.join(dir, "data-audit.json"),
      JSON.stringify({
        files: [
          {
            file: "server/entry.js",
            sha256: createHash("sha256").update(code).digest("hex"),
          },
        ],
        metadataHash: "a".repeat(64),
      }),
    );
  };
  try {
    seal("export const metadata = {};");
    expect(auditArtifacts(dir)).toBe(1);
    writeFileSync(Path.join(dir, "server/entry.js"), "changed");
    expect(() => auditArtifacts(dir)).toThrow("Changed/unreported artifact");
    seal('export const game = "2025-11-01/ATL__CHA";');
    expect(() => auditArtifacts(dir)).toThrow("Archived game identity");
    seal('import "node:sqlite";');
    expect(() => auditArtifacts(dir)).toThrow("SQL machinery");
    seal("export const metadata = {};");
    writeFileSync(Path.join(dir, "client/leak.db"), "db");
    expect(() => auditArtifacts(dir)).toThrow("Deployable database");
    rmSync(Path.join(dir, "client/leak.db"));
    writeFileSync(Path.join(dir, "client/new.js"), "new");
    expect(() => auditArtifacts(dir)).toThrow("Changed/unreported artifact");
    rmSync(Path.join(dir, "client/new.js"));
    rmSync(Path.join(dir, "server/entry.js"));
    expect(() => auditArtifacts(dir)).toThrow("Missing audited artifacts");
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});
