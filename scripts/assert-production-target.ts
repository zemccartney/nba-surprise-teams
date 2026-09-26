import { readFileSync } from "node:fs";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
Preserve the approved production bindings and both custom-domain associations.
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
    !Array.isArray(value.routes) ||
    value.routes.length !== 2 ||
    value.routes.some(
      (route) =>
        !(
          isRecord(route) &&
          Object.keys(route).length === 2 &&
          route.custom_domain === true &&
          typeof route.pattern === "string" &&
          ["nba-surprise-teams.grepco.net", "nbastt.grepco.net"].includes(
            route.pattern,
          )
        ),
    ) ||
    new Set(
      value.routes.map((route) =>
        isRecord(route) ? route.pattern : undefined,
      ),
    ).size !== 2
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
  console.log("Verified production target, KV and both custom domains");
}
