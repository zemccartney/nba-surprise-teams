import type { AstroIntegration } from "astro";

import Fs from "node:fs/promises";
import Path from "node:path";
import { optimize } from "svgo";

/*
  Runs svgo over the SVGs Astro emits into the client build.

  Why here and not in an image service: these SVGs are referenced with a plain
  <img src={meta.src}>, so Astro's image pipeline never sees them (see
  logo.astro for why). The emitted asset is a byte-for-byte copy of the source,
  which makes the build output the right place to optimize — sources stay
  readable and diffable in git.

  Note on hashes: the filename's content hash is computed by Rolldown before
  this runs, so it is a hash of the unoptimized bytes. That is fine for cache
  busting — the hash still changes whenever the source changes — but it does
  mean the hash is not a digest of the file's final contents.

  svgo v4 dropped removeViewBox from preset-default, so viewBox survives and
  the logos still scale to whatever width/height the markup asks for. Do not
  add removeViewBox here: every logo is rendered at several sizes.
*/
const SVGO_CONFIG = {
  multipass: true,
  plugins: [{ name: "preset-default" as const }],
};

const formatKb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

const collectSvgs = async (dir: string): Promise<string[]> => {
  const entries = await Fs.readdir(dir, { withFileTypes: true });
  const found = await Promise.all(
    entries.map(async (entry) => {
      const full = Path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectSvgs(full);
      }
      return entry.name.endsWith(".svg") ? [full] : [];
    }),
  );
  return found.flat();
};

export default function svgOptimizerIntegration(): AstroIntegration {
  let clientDir: URL;

  return {
    hooks: {
      "astro:build:done": async ({ logger }) => {
        const root = Path.normalize(clientDir.pathname);
        const files = await collectSvgs(root);

        let before = 0;
        let after = 0;
        let rewritten = 0;

        await Promise.all(
          files.map(async (file) => {
            const source = await Fs.readFile(file, "utf8");
            before += Buffer.byteLength(source);

            let optimized: string;
            try {
              optimized = optimize(source, SVGO_CONFIG).data;
            } catch (error) {
              // A file svgo cannot parse is left exactly as it was.
              logger.warn(
                `Skipped ${Path.relative(root, file)}: ${error instanceof Error ? error.message : String(error)}`,
              );
              after += Buffer.byteLength(source);
              return;
            }

            // Never trade a smaller source for a larger output.
            if (Buffer.byteLength(optimized) >= Buffer.byteLength(source)) {
              after += Buffer.byteLength(source);
              return;
            }

            await Fs.writeFile(file, optimized, "utf8");
            after += Buffer.byteLength(optimized);
            rewritten += 1;
          }),
        );

        if (files.length === 0) {
          return;
        }

        const saved = before - after;
        logger.info(
          `Optimized ${rewritten}/${files.length} SVGs: ${formatKb(before)} to ${formatKb(after)} (saved ${formatKb(saved)}, ${((saved / before) * 100).toFixed(1)}%)`,
        );
      },
      "astro:config:done": ({ config }) => {
        clientDir = config.build.client;
      },
    },
    name: "svg-optimizer",
  };
}
