// Optional research route: copy into src/pages/clock-probe.ts in a disposable
// application only, request /clock-probe/, then remove it. Never deploy it.
// eslint-disable-next-line unicorn/consistent-boolean-name -- Astro's required route export.
export const prerender = false;
export async function GET() {
  const before = performance.now();
  let checksum = 0;
  for (let i = 0; i < 30_000_000; i++) checksum += Math.sqrt(i);
  const afterCpu = performance.now();
  await new Promise((resolve) => setTimeout(resolve, 10));
  const afterYield = performance.now();
  return Response.json({
    checksum,
    cpuIntervalMs: afterCpu - before,
    includingYieldMs: afterYield - before,
  });
}
