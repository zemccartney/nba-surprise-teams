#!/usr/bin/env node
/*
  Baseline capture: fetch pages + assets with Node fetch (what the server ships),
  then load each page in headless Chrome for screenshots, console errors, timing.
  See README.md in this directory.
*/
import { mkdir, writeFile } from "node:fs/promises";
import Path from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";

const DEFAULT_PAGES = [
  "/",
  "/archive",
  "/stats",
  "/about",
  "/2025",
  "/2025/CHA",
  "/2024",
  "/2024/TOR",
  "/2011",
  "/2011/CHA",
  "/nope",
];

const VIEWPORTS = {
  desktop: { height: 900, width: 1440 },
  mobile: { height: 844, width: 390 },
  tablet: { height: 1024, width: 768 },
  // past Tailwind's 2xl breakpoint (1536px): catches container max-width regressions
  wide: { height: 1080, width: 1920 },
};

const { values: args } = parseArgs({
  allowNegative: true,
  options: {
    base: { type: "string" },
    chrome: { type: "string" },
    label: { type: "string" },
    out: { type: "string" },
    pages: { type: "string" },
    screenshots: { default: true, type: "boolean" },
    // ms to wait after scrolling, for late paints. The charts mount lazily and
    // skip their animation under the reduced-motion emulation set below.
    settle: { default: "2000", type: "string" },
    "third-party": { default: false, type: "boolean" },
  },
});

if (!args.base || !args.label) {
  console.error(
    "usage: capture.mjs --base <url> --label <name> [--out dir] [--pages /a,/b] [--no-screenshots] [--chrome path]",
  );
  process.exit(1);
}

const base = args.base.replace(/\/$/, "");
const pages = args.pages ? args.pages.split(",") : DEFAULT_PAGES;
const today = new Date().toISOString().slice(0, 10);
const outDir =
  args.out ?? Path.join(import.meta.dirname, "runs", `${today}-${args.label}`);

await mkdir(Path.join(outDir, "html"), { recursive: true });
await mkdir(Path.join(outDir, "screens"), { recursive: true });

const origin = new URL(base).origin;
const sameOrigin = (u) => new URL(u).origin === origin;
const sum = (list) => list.reduce((n, a) => n + (a.bytes ?? 0), 0);

const slugify = (p) =>
  p === "/" ? "home" : p.replaceAll(/^\/|\/$/g, "").replaceAll("/", "_");

const headersToObject = (headers) => Object.fromEntries(headers.entries());

// Follow redirects manually so the chain is recorded (Cloudflare 308s /about -> /about/)
const fetchWithChain = async (url) => {
  const chain = [];
  let current = url;
  for (let i = 0; i < 5; i++) {
    const res = await fetch(current, {
      headers: { "User-Agent": "nbastt-baseline/1.0" },
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      chain.push({ status: res.status, url: current });
      current = new URL(res.headers.get("location"), current).toString();
      continue;
    }
    return { chain, res, url: current };
  }
  throw new Error(`Too many redirects from ${url}`);
};

const assetCache = new Map();
const fetchAsset = async (url) => {
  if (assetCache.has(url)) {
    return assetCache.get(url);
  }
  const res = await fetch(url, {
    headers: { "User-Agent": "nbastt-baseline/1.0" },
  });
  const body = await res.arrayBuffer();
  const info = {
    bytes: body.byteLength,
    cacheControl: res.headers.get("cache-control"),
    contentEncoding: res.headers.get("content-encoding"),
    contentLength: Number(res.headers.get("content-length")) || undefined,
    contentType: res.headers.get("content-type"),
    status: res.status,
    url,
  };
  assetCache.set(url, info);
  return info;
};

const inventory = (html, pageUrl) => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]);
  const external = scripts
    .map((attrs) => attrs.match(/\bsrc=["']([^"']+)["']/)?.[1])
    .filter(Boolean)
    .map((src) => new URL(src, pageUrl).toString());
  const inline = scripts.length - external.length;
  const stylesheets = [
    ...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/g),
  ]
    .map((m) => m[0].match(/\bhref=["']([^"']+)["']/)?.[1])
    .filter(Boolean)
    .map((href) => new URL(href, pageUrl).toString());
  const inlineStyles = (html.match(/<style\b/g) ?? []).length;
  const islands = [
    ...html.matchAll(/fetch\('([^']*_server-islands[^']*)'\)/g),
  ].map((m) => new URL(m[1], pageUrl).toString());
  const hydrated = [...html.matchAll(/<astro-island\b[^>]*>/g)].length;
  return { external, hydrated, inline, inlineStyles, islands, stylesheets };
};

const results = [];
const browser = args.screenshots
  ? await chromium.launch(
      args.chrome || process.env.CHROME_PATH
        ? { executablePath: args.chrome || process.env.CHROME_PATH }
        : { channel: "chrome" },
    )
  : undefined;

for (const pagePath of pages) {
  const slug = slugify(pagePath);
  const startUrl = base + pagePath;
  process.stdout.write(`${pagePath} ... `);

  const { chain, res, url: finalUrl } = await fetchWithChain(startUrl);
  const html = await res.text();
  await writeFile(Path.join(outDir, "html", `${slug}.html`), html);

  const inv = inventory(html, finalUrl);

  const scriptAssets = [];
  for (const u of inv.external) {
    scriptAssets.push(
      sameOrigin(u) ? await fetchAsset(u) : { external: true, url: u },
    );
  }
  const styleAssets = [];
  for (const u of inv.stylesheets) {
    styleAssets.push(
      sameOrigin(u) ? await fetchAsset(u) : { external: true, url: u },
    );
  }
  const islandResponses = [];
  for (const u of inv.islands) {
    const r = await fetch(u, {
      headers: { "User-Agent": "nbastt-baseline/1.0" },
    });
    const body = await r.text();
    islandResponses.push({
      bytes: Buffer.byteLength(body),
      headers: headersToObject(r.headers),
      status: r.status,
      url: u,
    });
  }

  const record = {
    browser: {},
    cssBytes: sum(styleAssets),
    finalUrl,
    htmlBytes: Buffer.byteLength(html),
    hydratedIslands: inv.hydrated,
    inlineScripts: inv.inline,
    inlineStyles: inv.inlineStyles,
    jsBytes: sum(scriptAssets),
    page: pagePath,
    redirects: chain,
    responseHeaders: headersToObject(res.headers),
    scripts: scriptAssets,
    serverIslands: islandResponses,
    status: res.status,
    stylesheets: styleAssets,
  };

  if (browser) {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      const context = await browser.newContext({
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
        viewport,
      });
      const page = await context.newPage();
      if (!args["third-party"]) {
        // Deterministic screenshots: third-party embeds (Apple Podcasts on /about)
        // paint on their own schedule. Pass --third-party to load them.
        await page.route("**/*", (route) =>
          sameOrigin(route.request().url()) ? route.continue() : route.abort(),
        );
      }
      const consoleMessages = [];
      const failedRequests = [];
      page.on("console", (msg) => {
        if (["error", "warning"].includes(msg.type())) {
          consoleMessages.push({ text: msg.text(), type: msg.type() });
        }
      });
      page.on("pageerror", (err) => {
        consoleMessages.push({ text: String(err), type: "pageerror" });
      });
      page.on("requestfailed", (req) => {
        failedRequests.push({
          error: req.failure()?.errorText,
          url: req.url(),
        });
      });
      // What the browser actually loads, by resource type: covers island modules
      // pulled in via dynamic import that no <script src> tag mentions.
      // Same-origin only in `resources`; everything else (Cloudflare beacon,
      // the Apple Podcasts embed on /about) lands in `thirdParty`.
      const resources = {};
      const thirdParty = {};
      const pendingBodies = [];
      page.on("response", (res) => {
        const type = res.request().resourceType();
        const bucket = sameOrigin(res.url()) ? resources : thirdParty;
        const entry = (bucket[type] ??= { bytes: 0, count: 0, urls: [] });
        entry.count += 1;
        if (["document", "script", "stylesheet"].includes(type)) {
          entry.urls.push(res.url());
        }
        pendingBodies.push(
          res
            .body()
            .then((b) => {
              entry.bytes += b.byteLength;
            })
            .catch(() => {
              // body unavailable (redirect, preflight, aborted); count the request, not the bytes
            }),
        );
      });

      await page.goto(startUrl, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      // Scroll through so client:visible islands hydrate before the full-page shot
      await page.evaluate(async () => {
        const step = window.innerHeight;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 100));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(Number(args.settle));
      await Promise.all(pendingBodies);

      const timing = await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0];
        return nav
          ? {
              domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
              load: Math.round(nav.loadEventEnd),
              transferSize: nav.transferSize,
            }
          : undefined;
      });
      const documentHeight = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );

      await page.screenshot({
        fullPage: true,
        path: Path.join(outDir, "screens", `${slug}-${name}.png`),
      });

      record.browser[name] = {
        consoleMessages,
        documentHeight,
        failedRequests,
        resources,
        thirdParty,
        timing,
      };
      await context.close();
    }
    // Headline numbers come from what desktop Chrome actually loaded
    const loaded = record.browser.desktop?.resources ?? {};
    record.jsBytes = loaded.script?.bytes ?? record.jsBytes;
    record.cssBytes = loaded.stylesheet?.bytes ?? record.cssBytes;
    record.loadedBytes = Object.values(loaded).reduce((n, r) => n + r.bytes, 0);
  }

  results.push(record);
  console.log(
    `${record.status}  html ${record.htmlBytes}B  js ${record.jsBytes}B  css ${record.cssBytes}B  total ${record.loadedBytes ?? "-"}B  islands ${inv.islands.length}`,
  );
}

await browser?.close();

const summary = {
  base,
  capturedAt: new Date().toISOString(),
  label: args.label,
  pages: results,
  viewports: VIEWPORTS,
};
await writeFile(
  Path.join(outDir, "summary.json"),
  JSON.stringify(summary, undefined, 2) + "\n",
);

const kb = (n) => (n / 1024).toFixed(1);
const lines = [
  `# Baseline: ${args.label}`,
  "",
  `- base: ${base}`,
  `- captured: ${summary.capturedAt}`,
  "",
  "JS / CSS / total KB are what desktop Chrome loaded (uncompressed), including island modules.",
  "",
  "| page | status | html KB | ext scripts | inline scripts | JS KB | CSS KB | total KB | server islands | hydrated | console errs (d/t/m/w) |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
];
for (const r of results) {
  const errs = ["desktop", "tablet", "mobile", "wide"]
    .map((v) => r.browser[v]?.consoleMessages.length ?? "-")
    .join("/");
  lines.push(
    `| ${r.page} | ${r.status} | ${kb(r.htmlBytes)} | ${r.scripts.length} | ${r.inlineScripts} | ${kb(r.jsBytes)} | ${kb(r.cssBytes)} | ${r.loadedBytes === undefined ? "-" : kb(r.loadedBytes)} | ${r.serverIslands.length} | ${r.hydratedIslands} | ${errs} |`,
  );
}
lines.push("", "## Scripts loaded (desktop, same-origin)", "");
for (const r of results) {
  const urls = r.browser.desktop?.resources.script?.urls ?? [];
  lines.push(`- ${r.page}: ${urls.length} script(s)`);
  for (const u of urls) lines.push(`  - ${u}`);
}
lines.push("", "## Third-party loaded (desktop)", "");
for (const r of results) {
  const tp = r.browser.desktop?.thirdParty ?? {};
  const total = Object.values(tp).reduce((n, x) => n + x.bytes, 0);
  const hosts = new Set(
    Object.values(tp)
      .flatMap((x) => x.urls)
      .map((u) => new URL(u).host),
  );
  lines.push(
    `- ${r.page}: ${kb(total)} KB across ${Object.values(tp).reduce((n, x) => n + x.count, 0)} request(s)${hosts.size > 0 ? ` from ${[...hosts].join(", ")}` : ""}`,
  );
}
lines.push("", "## Server island responses", "");
for (const r of results) {
  for (const island of r.serverIslands) {
    lines.push(
      `- ${r.page}: ${island.status} ${island.bytes}B  cache-control: \`${island.headers["cache-control"] ?? "-"}\`  cf-cache-status: ${island.headers["cf-cache-status"] ?? "-"}  age: ${island.headers.age ?? "-"}`,
    );
  }
}
lines.push("", "## External scripts (not same-origin)", "");
const externals = new Set(
  results.flatMap((r) => r.scripts.filter((s) => s.external).map((s) => s.url)),
);
for (const u of externals) lines.push(`- ${u}`);
await writeFile(Path.join(outDir, "summary.md"), lines.join("\n") + "\n");
console.log(`\nwrote ${outDir}`);
