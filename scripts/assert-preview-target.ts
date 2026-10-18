import {
  assertDeploymentOutput,
  readDeploymentOutput,
} from "./deployment-output.ts";

/**
Inspect actual cf Build Output before publishing a native Preview.
*/
export const assertPreviewTarget = (
  worker: unknown,
  context: unknown,
): void => {
  assertDeploymentOutput(worker, context, true);
};

if (import.meta.main) {
  const { context, worker } = readDeploymentOutput(process.argv[2]);
  assertPreviewTarget(worker, context);
  console.log(
    "Verified Preview Build Output, isolated KV and no production domains",
  );
}
