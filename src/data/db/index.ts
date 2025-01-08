import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client/web";

/*
  Must be factored as a factory due to Cloudflare's model, per https://docs.astro.build/en/guides/environment-variables/#limitations
  "@astrojs/cloudflare is a bit different than other adapters. Environment variables are scoped to the request, unlike Node.js where it’s global."
*/
export default (...args: Parameters<typeof createClient>) => {
  const turso = createClient(...args);

  return drizzle(turso);
};
