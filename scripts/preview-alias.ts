import { createHash } from "node:crypto";
import Fs from "node:fs/promises";

// Git refs allow characters and lengths that a Cloudflare DNS alias does not.
// Hash the original ref so normalization/truncation does not merge branches.
export const previewAlias = (branch: string, workerName: string): string => {
  if (!branch || !workerName)
    throw new Error("Branch and Worker name are required");
  const hash = createHash("sha256").update(branch).digest("hex").slice(0, 12);
  const budget = 63 - workerName.length - 1 - hash.length - 1;
  if (budget < 1)
    throw new Error(
      "Worker name leaves insufficient room for a safe preview alias",
    );
  const slug =
    branch
      .toLowerCase()
      .replaceAll(/[^a-z0-9-]+/g, "-")
      .replaceAll(/^-+|-+$/g, "") || "branch";
  const prefix = (/^[a-z]/.test(slug) ? slug : `b-${slug}`)
    .slice(0, budget)
    .replace(/-+$/, "");
  return `${prefix}-${hash}`;
};

if (import.meta.main) {
  // Use the actual generated deployment name, including any environment suffix.
  const config: unknown = JSON.parse(
    await Fs.readFile(
      new URL("../dist/server/wrangler.json", import.meta.url),
      "utf8",
    ),
  );
  if (
    typeof config !== "object" ||
    config === null ||
    !("name" in config) ||
    typeof config.name !== "string"
  ) {
    throw new Error("Build first: generated Worker config must contain a name");
  }
  console.log(previewAlias(process.env.BRANCH ?? "", config.name));
}
