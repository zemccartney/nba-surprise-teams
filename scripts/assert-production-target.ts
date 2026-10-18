import {
  assertDeploymentOutput,
  readDeploymentOutput,
} from "./deployment-output.ts";

/**
Preserve production bindings and domains; never publish preview-marked output.
*/
export const assertProductionTarget = (
  worker: unknown,
  context: unknown,
): void => {
  assertDeploymentOutput(worker, context, false);
};

if (import.meta.main) {
  const { context, worker } = readDeploymentOutput(process.argv[2]);
  assertProductionTarget(worker, context);
  console.log("Verified production Build Output, KV and both custom domains");
}
