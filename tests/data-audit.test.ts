import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import Path from "node:path";
import { expect, it } from "vitest";

import { auditArtifacts } from "../data/node/audit";

it("rejects changed, missing, unexpected and forbidden cf Build Output artifacts", () => {
  const dir = mkdtempSync(Path.join(tmpdir(), "nbastt-audit-"));
  mkdirSync(Path.join(dir, "assets"));
  mkdirSync(Path.join(dir, "bundle"));
  const entry = Path.join(dir, "bundle/entry.js");
  const seal = (code: string) => {
    writeFileSync(entry, code);
    writeFileSync(
      Path.join(dir, "data-audit.json"),
      JSON.stringify({
        files: [
          {
            file: "bundle/entry.js",
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
    writeFileSync(entry, "changed");
    expect(() => auditArtifacts(dir)).toThrow("Changed/unreported artifact");
    seal('export const game = "2025-11-01/ATL__CHA";');
    expect(() => auditArtifacts(dir)).toThrow("Archived game identity");
    seal('import "node:sqlite";');
    expect(() => auditArtifacts(dir)).toThrow("SQL machinery");
    seal("export const metadata = {};");
    writeFileSync(Path.join(dir, "assets/leak.db"), "db");
    expect(() => auditArtifacts(dir)).toThrow("Deployable database");
    rmSync(Path.join(dir, "assets/leak.db"));
    writeFileSync(Path.join(dir, "assets/new.js"), "new");
    expect(() => auditArtifacts(dir)).toThrow("Changed/unreported artifact");
    rmSync(Path.join(dir, "assets/new.js"));
    rmSync(entry);
    expect(() => auditArtifacts(dir)).toThrow("Missing audited artifacts");
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});
