import type { AstroIntegration } from "astro";

import Path from "node:path";
import Url from "node:url";

const __filename = Url.fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

export default function archiverIntegration(): AstroIntegration {
  return {
    hooks: {
      "astro:config:setup": ({ command, injectRoute, logger }) => {
        if (command === "dev") {
          injectRoute({
            entrypoint: Path.resolve(__dirname, "api.ts"),
            pattern: "/api/archive/[seasonId]",
            prerender: false,
          });

          logger.info("Archive API route injected for development");
        }
      },
    },
    name: "archiver",
  };
}
