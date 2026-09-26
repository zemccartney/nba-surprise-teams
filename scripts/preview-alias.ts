import { createHash } from "node:crypto";

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
  // Compute before building so Astro's site origin matches the branch hostname.
  // The generated-config guard independently verifies the target before upload.
  console.log(previewAlias(process.env.BRANCH ?? "", process.argv[2] ?? ""));
}
