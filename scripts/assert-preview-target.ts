import { readFileSync } from "node:fs";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
Inspect generated native Preview settings before `wrangler preview`, never deploy.
*/
export const assertPreviewTarget = (value: unknown): void => {
  const previews = isRecord(value) ? value.previews : undefined;
  if (
    !isRecord(value) ||
    value.name !== "nba-surprise-teams" ||
    !isRecord(previews) ||
    Object.keys(previews).some(
      (key) => !["kv_namespaces", "vars"].includes(key),
    ) ||
    !Array.isArray(previews.kv_namespaces) ||
    previews.kv_namespaces.length !== 1 ||
    !isRecord(previews.kv_namespaces[0]) ||
    Object.keys(previews.kv_namespaces[0]).length !== 2 ||
    previews.kv_namespaces[0].binding !== "GAMES_KV" ||
    previews.kv_namespaces[0].id !== "6a0d30705c634691873dd1dd122969e3" ||
    !isRecord(previews.vars) ||
    Object.keys(previews.vars).length !== 1 ||
    previews.vars.PUBLIC_DEPLOY_ENV !== "preview"
  )
    throw new Error(
      "Refusing to publish: expected native Preview settings with only preview KV and environment",
    );
};

if (import.meta.main) {
  try {
    assertPreviewTarget(
      JSON.parse(readFileSync(process.argv[2] ?? "", "utf8")),
    );
    console.log(
      "Verified native Preview target and isolated KV; production settings are not used",
    );
  } catch {
    console.error(
      "Refusing to publish: missing, invalid or unsafe preview configuration",
    );
    process.exitCode = 1;
  }
}
