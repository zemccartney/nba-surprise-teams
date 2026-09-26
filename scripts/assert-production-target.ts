import { readFileSync } from "node:fs";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
Initial deployment must not take over either public hostname.
*/
export const assertProductionTarget = (value: unknown): void => {
  if (
    !isRecord(value) ||
    value.name !== "nba-surprise-teams" ||
    value.workers_dev !== true ||
    !Array.isArray(value.kv_namespaces) ||
    value.kv_namespaces.length !== 1 ||
    !isRecord(value.kv_namespaces[0]) ||
    value.kv_namespaces[0].binding !== "GAMES_KV" ||
    value.kv_namespaces[0].id !== "6061594acc5c4fb6b3846b0c78f9e5a3" ||
    value.route !== undefined ||
    (value.routes !== undefined &&
      (!Array.isArray(value.routes) || value.routes.length > 0))
  ) {
    throw new Error(
      "Refusing production deployment: unexpected Worker, KV, URL settings or domain routes",
    );
  }
};

if (import.meta.main) {
  assertProductionTarget(
    JSON.parse(readFileSync(process.argv[2] ?? "", "utf8")),
  );
  console.log("Verified initial production target; no custom-domain routes");
}
