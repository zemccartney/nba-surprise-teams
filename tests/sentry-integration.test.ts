import type { AstroIntegration } from "astro";

import sentry from "@sentry/astro";
import { expect, it, vi } from "vitest";

type Setup = NonNullable<AstroIntegration["hooks"]["astro:config:setup"]>;

async function injectedScripts(isServerEnabled: boolean) {
  const injectScript = vi.fn();
  const addMiddleware = vi.fn();
  const integration = sentry({
    enabled: { client: true, server: isServerEnabled },
    sourceMapsUploadOptions: { enabled: false },
  });
  const setup = integration.hooks["astro:config:setup"];
  if (!setup) throw new Error("Missing Sentry setup hook");
  await setup({
    addMiddleware,
    command: "build",
    config: { adapter: { name: "@astrojs/cloudflare" }, output: "static" },
    injectScript,
    logger: { info: vi.fn(), warn: vi.fn() },
    updateConfig: vi.fn(),
  } as unknown as Parameters<Setup>[0]);
  return { addMiddleware, injectScript };
}

it("server-disabled integration still initializes the browser but not Node prerender", async () => {
  const { injectScript } = await injectedScripts(false);
  expect(injectScript).toHaveBeenCalledWith(
    "page",
    expect.stringContaining("sentry.client.config.js"),
  );
  expect(injectScript.mock.calls.some(([stage]) => stage === "page-ssr")).toBe(
    false,
  );
});

it("enabling integration server initialization imports the Worker entry into page-ssr", async () => {
  const { addMiddleware, injectScript } = await injectedScripts(true);
  expect(injectScript).toHaveBeenCalledWith(
    "page-ssr",
    expect.stringContaining("sentry.server.config.ts"),
  );
  // The pinned SDK doesn't auto-register middleware for Astro's default static output.
  expect(addMiddleware).not.toHaveBeenCalled();
});
