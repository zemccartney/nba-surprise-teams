import assert from "node:assert/strict";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { cpus, platform } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { chromium } from "playwright-core";

import { summarize } from "./chart-performance-summary.mjs";

const { values } = parseArgs({
  options: {
    base: { default: "http://127.0.0.1:4322", type: "string" },
    dist: { type: "string" },
    "dist-layout": { default: "split", type: "string" },
    out: { type: "string" },
    paths: { default: "/stats/,/2025/CHA/", type: "string" },
    "reduced-motion": { default: "no-preference", type: "string" },
    renderer: { default: "echarts", type: "string" },
    revision: { type: "string" },
    runs: { default: "5", type: "string" },
  },
});
assert.ok(values.out, "Supply a new --out directory for each capture");
const runs = Number(values.runs);
assert.ok(Number.isSafeInteger(runs) && runs > 0);
assert.ok(["no-preference", "reduce"].includes(values["reduced-motion"]));
assert.ok(["echarts", "react"].includes(values.renderer));
assert.ok(["legacy", "split"].includes(values["dist-layout"]));
const hostSelector =
  values.renderer === "react"
    ? ".recharts-responsive-container"
    : "[data-chart]";
await mkdir(values.out, { recursive: true });
const reportPath = path.join(values.out, "measurements.json");
// Never silently replace an earlier baseline.
await writeFile(reportPath, "Capture in progress\n", { flag: "wx" });

const browser = await chromium.launch({ channel: "chrome" });
const report = {
  base: values.base,
  browser: browser.version(),
  capturedAt: new Date().toISOString(),
  machine: { cpu: cpus()[0]?.model, platform: platform() },
  revision: values.revision,
  samples: [],
  settings: {
    cache: "fresh browser context, then reload in that same context",
    cpuThrottling: "none",
    networkThrottling: "none",
    observation:
      "initial viewport, followed by scrolling every chart into view",
    readyMarker:
      values.renderer === "react"
        ? "Hydrated Recharts SVG plus two animation frames; not keyboard readiness"
        : "ECharts slider role plus two animation frames",
    reducedMotion: values["reduced-motion"],
    renderer: values.renderer,
    viewport: { height: 900, width: 1440 },
  },
};

try {
  if (values.dist) {
    report.assets = [];
    for (const directory of ["client", "server"]) {
      const isLegacy = values["dist-layout"] === "legacy";
      const relativeRoot = isLegacy
        ? directory === "client"
          ? ""
          : "_worker.js"
        : directory;
      const root = path.join(values.dist, relativeRoot);
      const entries = await readdir(root, { recursive: true });
      const files = entries.filter((file) => {
        const isServerFile =
          isLegacy &&
          directory === "client" &&
          (file === "_worker.js" || file.startsWith("_worker.js" + path.sep));
        return !isServerFile && /\.(?:js|mjs|css)$/.test(file);
      });
      for (const file of files) {
        const bytes = await readFile(path.join(root, file));
        report.assets.push({
          brotli: brotliCompressSync(bytes).length,
          file: `${directory}/${file.replaceAll(path.sep, "/")}`,
          gzip: gzipSync(bytes).length,
          raw: bytes.length,
        });
      }
    }
    report.assets.sort((a, b) => b.raw - a.raw);
  }

  for (const pathname of values.paths.split(",")) {
    for (let run = 1; run <= runs; run++) {
      const context = await browser.newContext({
        reducedMotion: report.settings.reducedMotion,
        serviceWorkers: "block",
        viewport: report.settings.viewport,
      });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Performance.enable");
      // Do not use Playwright routing: it disables the HTTP cache we measure.
      await cdp.send("Network.setBlockedURLs", {
        urls: ["*static.cloudflareinsights.com/*", "*ingest.sentry.io/*"],
      });
      const errors = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });
      page.on("requestfailed", (request) => {
        if (new URL(request.url()).origin === new URL(values.base).origin) {
          errors.push(`${request.failure()?.errorText} ${request.url()}`);
        }
      });
      page.on("response", (response) => {
        if (response.status() >= 400) {
          errors.push(`${response.status()} ${response.url()}`);
        }
      });

      await page.addInitScript((renderer) => {
        const selector =
          renderer === "react"
            ? ".recharts-responsive-container"
            : "[data-chart]";
        performance.setResourceTimingBufferSize(10_000);
        const state = { charts: [], fontLoads: [], longTasks: [] };
        Object.defineProperty(globalThis, "__chartPerformance", {
          value: state,
        });
        const seen = new Map();
        const visible = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            const chart = seen.get(entry.target);
            if (entry.isIntersecting && chart.visibleAt === undefined) {
              chart.visibleAt = entry.time;
            }
          }
        });
        const scan = () => {
          for (const host of document.querySelectorAll(selector)) {
            let chart = seen.get(host);
            if (!chart) {
              chart = {
                hostSeenAt: performance.now(),
                kind:
                  host.dataset.chart ??
                  host
                    .closest("astro-island")
                    ?.getAttribute("component-url")
                    ?.split("/")
                    .at(-1)
                    ?.split(".", 1)[0],
              };
              state.charts.push(chart);
              seen.set(host, chart);
              visible.observe(host);
            }
            if (
              host.querySelector("svg,canvas") &&
              chart.graphicAt === undefined
            ) {
              chart.graphicAt = performance.now();
            }
            const island = host.closest("astro-island");
            const isReady =
              renderer === "react"
                ? island &&
                  !island.hasAttribute("ssr") &&
                  host.querySelector("svg.recharts-surface")
                : host.getAttribute("role") === "slider";
            if (isReady && !chart.framePending) {
              chart.framePending = true;
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  chart.interactiveFrameAt = performance.now();
                }),
              );
            }
          }
        };
        new MutationObserver((records) => {
          scan();
          for (const record of records) {
            const element =
              record.target.nodeType === 1
                ? record.target
                : record.target.parentElement;
            const chart = seen.get(element?.closest(selector));
            if (chart) chart.lastMutationAt = performance.now();
          }
        }).observe(document, {
          attributes: true,
          childList: true,
          subtree: true,
        });

        const originalLoad = document.fonts.load;
        document.fonts.load = function (...args) {
          const call = { font: args[0], start: performance.now() };
          state.fontLoads.push(call);
          // Preserve the native method's receiver and return the original promise.
          // eslint-disable-next-line unicorn/no-this-outside-of-class
          const promise = Reflect.apply(originalLoad, this, args);
          promise
            .then(() => {
              call.end = performance.now();
            })
            .catch(() => {
              call.end = performance.now();
              call.failed = true;
            });
          return promise;
        };
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            state.longTasks.push({
              duration: entry.duration,
              start: entry.startTime,
            });
          }
        }).observe({ buffered: true, type: "longtask" });
      }, values.renderer);

      for (const cache of ["cold-browser", "warm-reload"]) {
        errors.length = 0;
        if (cache === "cold-browser") {
          await page.goto(new URL(pathname, values.base).href, {
            waitUntil: "domcontentloaded",
          });
        } else {
          // Avoid restoring the previous scroll offset into an offscreen chart.
          await page.evaluate(() => {
            history.scrollRestoration = "manual";
          });
          await page.reload({ waitUntil: "domcontentloaded" });
        }
        await page.waitForFunction(() =>
          globalThis.__chartPerformance.charts.some(
            (chart) => chart.interactiveFrameAt !== undefined,
          ),
        );
        // Observe the normal animation too; readiness does not imply animation completion.
        await page.waitForTimeout(1800);
        const initial = await page.evaluate(() =>
          structuredClone(globalThis.__chartPerformance),
        );
        if (run === 1) {
          await page.screenshot({
            path: path.join(
              values.out,
              `${pathname.replaceAll("/", "_")}-${cache}.png`,
            ),
          });
        }
        const hosts = await page.locator(hostSelector).all();
        for (const host of hosts) {
          await host.scrollIntoViewIfNeeded();
          await page.waitForFunction(
            (element) => {
              if (element.matches(".recharts-responsive-container")) {
                const island = element.closest("astro-island");
                return (
                  island &&
                  !island.hasAttribute("ssr") &&
                  element.querySelector("svg.recharts-surface")
                );
              }
              return (
                element.getAttribute("role") === "slider" &&
                element.querySelector("svg,canvas")
              );
            },
            await host.elementHandle(),
          );
        }
        await page.waitForTimeout(1800);
        const sample = await page.evaluate(() => ({
          ...globalThis.__chartPerformance,
          navigation: performance.getEntriesByType("navigation")[0].toJSON(),
          paints: performance
            .getEntriesByType("paint")
            .map((entry) => entry.toJSON()),
          resources: performance
            .getEntriesByType("resource")
            .map((entry) => entry.toJSON()),
        }));
        const metrics = await cdp.send("Performance.getMetrics");
        report.samples.push({
          cache,
          initial,
          pathname,
          run,
          ...sample,
          errors: [...errors],
          metrics: metrics.metrics,
        });
        assert.deepEqual(errors, [], "Browser errors invalidate this sample");
        assert.equal(sample.charts.length, pathname === "/stats/" ? 3 : 1);
        const first = Math.min(
          ...initial.charts.map(
            (chart) => chart.interactiveFrameAt ?? Infinity,
          ),
        );
        console.log(
          `${pathname} ${run} ${cache}: response ${sample.navigation.responseStart.toFixed(0)} ms; first chart frame ${first.toFixed(0)} ms`,
        );
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(reportPath, JSON.stringify(report, undefined, 2) + "\n");
}
const summary = summarize(report);
await writeFile(
  path.join(values.out, "summary.json"),
  JSON.stringify(summary, undefined, 2) + "\n",
);
console.table(
  summary.groups.map((group) => ({
    cache: group.cache,
    "median chart frame (ms)": group.firstChartFrameMs.median,
    "median first byte (ms)": group.firstByteMs.median,
    page: group.pathname,
  })),
);
console.log(`Saved ${reportPath}`);
