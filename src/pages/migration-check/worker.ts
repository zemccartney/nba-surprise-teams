import type { APIRoute } from "astro";

import * as Sentry from "@sentry/cloudflare";
import { z } from "astro/zod";
import { env } from "cloudflare:workers";

import {
  isProbeAuthorized,
  probeAuth,
} from "../../diagnostics/migration-probe";
import liveLoader from "../../loaders/live";

// eslint-disable-next-line unicorn/consistent-boolean-name -- Astro route API.
export const prerender = false;
export const POST: APIRoute = async ({ request }) => {
  if (
    !(await isProbeAuthorized(
      request,
      Reflect.get(env, "PUBLIC_DEPLOY_ENV"),
      probeAuth,
    ))
  )
    return new Response(undefined, { status: 404 });
  const parsed = z
    .object({ action: z.enum(["nba", "sentry"]) })
    .safeParse(await request.json().catch(() => false));
  if (!parsed.success) return new Response(undefined, { status: 400 });
  const { action } = parsed.data;
  if (action === "nba") {
    try {
      // Direct loader invocation bypasses KV without deleting any cached keys.
      const result = await liveLoader("2026", { includeSchedule: true });
      return Response.json({
        completedGames: result.games.length,
        scheduledGames: result.schedule?.length,
        source: "fresh NBA fetch; no KV reads/writes",
      });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 502 },
      );
    }
  }
  const client = Sentry.getClient();
  const marker = "NBASTT cf migration worker smoke " + new Date().toISOString();
  const eventId = Sentry.withScope((scope) => {
    scope.addEventProcessor((event) => {
      delete event.request;
      return event;
    });
    return Sentry.captureException(new Error(marker));
  });
  return Response.json({
    enabled: Boolean(client?.getDsn()),
    environment: client?.getOptions().environment,
    eventId,
    flushed: await Sentry.flush(5000),
    marker,
    release: client?.getOptions().release,
  });
};
