import type { APIRoute } from "astro";

import * as Sentry from "@sentry/cloudflare";
import { PUBLIC_DEPLOY_ENV } from "astro:env/client";
import { env } from "cloudflare:workers";
import { createHash, timingSafeEqual } from "node:crypto";

// TEMPORARY: production Sentry check before any custom-domain transfer.
// eslint-disable-next-line unicorn/consistent-boolean-name
export const prerender = false;

export const POST: APIRoute = ({ request, url }) => {
  const secret = (env as unknown as { CUTOVER_PROBE_TOKEN?: string })
    .CUTOVER_PROBE_TOKEN;
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer /, "");
  if (
    PUBLIC_DEPLOY_ENV !== "production" ||
    url.hostname !== "nba-surprise-teams.zemccartney.workers.dev" ||
    !secret ||
    !supplied ||
    !timingSafeEqual(
      createHash("sha256").update(secret).digest(),
      createHash("sha256").update(supplied).digest(),
    )
  ) {
    return new Response("Not found", {
      headers: { "Cache-Control": "no-store" },
      status: 404,
    });
  }
  const id = url.searchParams.get("id");
  if (!id || !/^[a-f\d]{24}$/.test(id))
    return new Response("Invalid probe ID", { status: 400 });
  Sentry.getIsolationScope().addEventProcessor((event) => {
    if (event.request) {
      delete event.request.headers;
      delete event.request.data;
    }
    return event;
  });
  // No explicit capture: exercise the SDK's automatic Astro middleware capture.
  throw new Error(`NBASTT production middleware smoke ${id}`);
};
