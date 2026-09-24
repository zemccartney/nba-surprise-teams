import { readFileSync } from "node:fs";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
Fail closed before publishing: inspect the generated config, not just source.
*/
export const assertPreviewTarget = (value: unknown): void => {
  if (
    !isRecord(value) ||
    value.name !== "nbastt-preview" ||
    value.workers_dev !== true ||
    value.preview_urls !== true ||
    value.route !== undefined ||
    !Array.isArray(value.routes) ||
    value.routes.length > 0 ||
    !Array.isArray(value.kv_namespaces) ||
    value.kv_namespaces.length !== 1 ||
    !isRecord(value.kv_namespaces[0]) ||
    value.kv_namespaces[0].binding !== "GAMES_KV" ||
    value.kv_namespaces[0].id !== "6a0d30705c634691873dd1dd122969e3"
  )
    throw new Error(
      "Refusing to publish: expected the isolated preview Worker, preview KV and no routes",
    );
};

if (import.meta.main) {
  try {
    assertPreviewTarget(
      JSON.parse(readFileSync(process.argv[2] ?? "", "utf8")),
    );
    console.log("Verified isolated preview deployment target");
  } catch {
    console.error(
      "Refusing to publish: missing, invalid or unsafe preview configuration",
    );
    process.exitCode = 1;
  }
}
