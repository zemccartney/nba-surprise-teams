/* global document */
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const preview = process.argv.includes("--preview");
const root = fileURLToPath(new URL("../", import.meta.url));
const output = fileURLToPath(new URL("../public/og.png", import.meta.url));
const server = await createServer({
  configFile: false,
  root,
  server: { host: "127.0.0.1", port: preview ? 5173 : 0 },
});

let browser;
try {
  await server.listen();
  const url = new URL("scripts/og/", server.resolvedUrls.local[0]).href;

  if (preview) {
    console.log(`Edit scripts/og/index.html and preview at ${url}`);
    console.log("Press Ctrl+C to stop. Generate with pnpm run og:generate.");
    await new Promise((resolve) => {
      process.once("SIGINT", resolve);
      process.once("SIGTERM", resolve);
    });
  } else {
    browser = await chromium.launch();
    const page = await browser.newPage({
      colorScheme: "dark",
      deviceScaleFactor: 1,
      viewport: { height: 630, width: 1200 },
    });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      if (!document.fonts.check('64px "Sixtyfour Variable"')) {
        throw new Error(
          "Title font did not load; refusing to capture fallback text.",
        );
      }
      await Promise.all([...document.images].map((image) => image.decode()));
    });
    await page.locator("#og-image").screenshot({ path: output });
    console.log(
      `Saved ${output} (1200 × 630). Commit this PNG with your edits.`,
    );
    console.log(`
Next: add these tags to src/layouts/layout.astro when you're happy with the image.
The template has NOT been modified.

<meta content="https://nbastt.grepco.net/og.png" property="og:image" />
<meta content="1200" property="og:image:width" />
<meta content="630" property="og:image:height" />
<meta content="image/png" property="og:image:type" />
<meta content="NBA Surprise Teams Tracker" property="og:image:alt" />
<meta content="summary_large_image" name="twitter:card" />
<meta content="https://nbastt.grepco.net/og.png" name="twitter:image" />
<meta content="NBA Surprise Teams Tracker" name="twitter:image:alt" />
`);
  }
} finally {
  await browser?.close();
  await server.close();
}
