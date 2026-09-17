import { z } from "astro/zod";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import Path from "node:path";
import { fileURLToPath } from "node:url";

const reportSchema = z.object({
  files: z.array(z.object({ file: z.string(), sha256: z.string().length(64) })),
  metadataHash: z.string().length(64),
});
export function auditArtifacts(directory: string): number {
  const report = reportSchema.parse(
    JSON.parse(readFileSync(Path.join(directory, "data-audit.json"), "utf8")),
  );
  const expected = new Map(
    report.files.map((file) => [file.file, file.sha256]),
  );
  assert.equal(expected.size, report.files.length, "Duplicate audit paths");
  let count = 0;
  const walk = (folder: string) => {
    const entries = readdirSync(folder, { withFileTypes: true });
    for (const entry of entries) {
      const filename = Path.join(folder, entry.name);
      if (entry.isDirectory()) {
        walk(filename);
        continue;
      }
      assert.ok(
        !/\.(?:db|sqlite|sql)(?:$|[-.])/.test(entry.name),
        `Deployable database file: ${filename}`,
      );
      if (!/\.(?:m?js|html|map)$/.test(entry.name)) continue;
      const code = readFileSync(filename, "utf8");
      assert.ok(
        !/node:sqlite|data\/node\/database|sqlite_schema|INSERT INTO "archived_games"/.test(
          code,
        ),
        `SQL machinery: ${filename}`,
      );
      if (Path.relative(directory, filename).startsWith("server/"))
        assert.ok(
          !/\d{4}-\d{2}-\d{2}\/[A-Z]{3}__[A-Z]{3}/.test(code),
          `Archived game identity leaked into Worker: ${filename}`,
        );
      const name = Path.relative(directory, filename);
      assert.equal(
        createHash("sha256").update(code).digest("hex"),
        expected.get(name),
        `Changed/unreported artifact: ${name}`,
      );
      expected.delete(name);
      count++;
    }
  };
  walk(Path.join(directory, "client"));
  walk(Path.join(directory, "server"));
  assert.equal(expected.size, 0, "Missing audited artifacts");
  assert.ok(count > 0, "Empty build");
  return count;
}
if (
  process.argv[1] &&
  Path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(
    `Artifact audit: ${auditArtifacts(Path.resolve(process.argv[2] ?? "dist"))} files; no deployable SQLite or archived game identities in Worker`,
  );
