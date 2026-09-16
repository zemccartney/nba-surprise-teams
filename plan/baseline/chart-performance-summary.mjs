import { readFile, writeFile } from "node:fs/promises";

const rounded = (value) => Math.round(value * 10) / 10;
const firstFrame = (sample) =>
  Math.min(
    ...sample.initial.charts.map(
      (chart) => chart.interactiveFrameAt ?? Infinity,
    ),
  );
const distribution = (values) => {
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  return {
    max: rounded(sorted.at(-1)),
    median: rounded(median),
    min: rounded(sorted[0]),
  };
};

export const summarize = (report) => {
  const { assets, samples, ...metadata } = report;
  const groups = [];
  const paths = new Set(samples.map((sample) => sample.pathname));
  for (const pathname of paths) {
    const caches = ["cold-browser", "warm-reload"].filter((cache) =>
      samples.some(
        (sample) => sample.pathname === pathname && sample.cache === cache,
      ),
    );
    for (const cache of caches) {
      const matching = samples.filter(
        (sample) => sample.pathname === pathname && sample.cache === cache,
      );
      const metrics = {
        firstByteMs: (sample) => sample.navigation.responseStart,
        firstChartFrameMs: firstFrame,
        lastInitialChartMutationMs: (sample) =>
          Math.max(
            ...sample.initial.charts.map((chart) => chart.lastMutationAt ?? 0),
          ),
        longestInitialFontLoadMs: (sample) =>
          Math.max(
            0,
            ...sample.initial.fontLoads.map(
              (load) => (load.end ?? load.start) - load.start,
            ),
          ),
        responseToChartMs: (sample) =>
          firstFrame(sample) - sample.navigation.responseStart,
      };
      groups.push({
        cache,
        pathname,
        runs: matching.length,
        ...Object.fromEntries(
          Object.entries(metrics).map(([name, measure]) => [
            name,
            distribution(matching.map((sample) => measure(sample))),
          ]),
        ),
      });
    }
  }
  return {
    ...metadata,
    assets,
    groups,
    samples: samples.map((sample) => {
      const requestedPaths = new Set(
        sample.resources.map((resource) => new URL(resource.name).pathname),
      );
      const scripts = assets?.filter(
        (asset) =>
          asset.file.startsWith("client/") &&
          asset.file.endsWith(".js") &&
          requestedPaths.has(asset.file.replace("client/", "/")),
      );
      return {
        cache: sample.cache,
        chartsAfterScrolling: sample.charts,
        domContentLoadedMs: rounded(sample.navigation.domContentLoadedEventEnd),
        errors: sample.errors,
        firstByteMs: rounded(sample.navigation.responseStart),
        firstChartFrameMs: rounded(firstFrame(sample)),
        initial: sample.initial,
        loadedBuiltJs: scripts && {
          files: scripts.map((script) => script.file),
          ...Object.fromEntries(
            ["raw", "gzip", "brotli"].map((key) => [
              key,
              scripts.reduce((sum, script) => sum + script[key], 0),
            ]),
          ),
        },
        pathname: sample.pathname,
        resourceCount: sample.resources.length,
        run: sample.run,
      };
    }),
  };
};

// Re-summarize a saved raw capture without starting a browser.
if (import.meta.main) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output)
    throw new Error(
      "Usage: node chart-performance-summary.mjs INPUT.json NEW-SUMMARY.json",
    );
  const report = JSON.parse(await readFile(input, "utf8"));
  await writeFile(
    output,
    JSON.stringify(summarize(report), undefined, 2) + "\n",
    {
      flag: "wx",
    },
  );
}
