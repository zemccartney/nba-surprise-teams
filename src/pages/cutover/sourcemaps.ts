import type { APIRoute } from "astro";

import * as Sentry from "@sentry/cloudflare";
import { PUBLIC_DEPLOY_ENV } from "astro:env/client";
import { env } from "cloudflare:workers";
import { createHash, timingSafeEqual } from "node:crypto";

// TEMPORARY authenticated preview-only mapping check; remove after one event.
// eslint-disable-next-line unicorn/consistent-boolean-name
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const secret = (env as unknown as { CUTOVER_PROBE_TOKEN?: string })
    .CUTOVER_PROBE_TOKEN;
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer /, "");
  if (
    PUBLIC_DEPLOY_ENV !== "preview" ||
    !secret ||
    !supplied ||
    !timingSafeEqual(
      createHash("sha256").update(secret).digest(),
      createHash("sha256").update(supplied).digest(),
    )
  )
    return new Response("Not found", {
      headers: { "Cache-Control": "no-store" },
      status: 404,
    });

  const marker = `NBASTT server source-map lifecycle smoke ${new Date().toISOString()}`;
  let eventId: string | undefined;
  Sentry.withScope((scope) => {
    scope.addEventProcessor((event) => {
      if (event.request) {
        delete event.request.headers;
        delete event.request.data;
      }
      return event;
    });
    eventId = Sentry.captureException(new Error(marker));
  });
  const flushed = await Sentry.flush(5000);
  return Response.json(
    { eventId, flushed, marker },
    { headers: { "Cache-Control": "no-store" } },
  );
};
