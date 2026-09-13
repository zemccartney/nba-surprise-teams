export const deploymentTarget = (ref: string): "preview" | "production" => {
  if (ref === "refs/heads/main") return "production";
  if (ref.startsWith("refs/heads/") && ref.length > "refs/heads/".length) {
    return "preview";
  }
  throw new Error("Only branch refs may deploy");
};

if (import.meta.main) {
  try {
    console.log(deploymentTarget(process.argv[2] ?? ""));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
