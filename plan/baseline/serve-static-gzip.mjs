// Local static-build measurement only; deliberately does not emulate Worker routes.
import { readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import Path from "node:path";
import { gzipSync } from "node:zlib";

const [directory, port] = process.argv.slice(2);
if (!directory || !port)
  throw new Error("Usage: node serve-static-gzip.mjs <build-directory> <port>");
const root = Path.resolve(directory);
const types = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".woff2", "font/woff2"],
]);
const server = createServer((request, response) => {
  try {
    let file = Path.resolve(
      root,
      "." +
        decodeURIComponent(
          new URL(request.url ?? "/", "http://localhost").pathname,
        ),
    );
    if (file !== root && !file.startsWith(root + Path.sep)) {
      response.writeHead(403).end();
      return;
    }
    if (statSync(file).isDirectory()) file = Path.join(file, "index.html");
    let bytes = readFileSync(file);
    const extension = Path.extname(file);
    const compressed =
      request.headers["accept-encoding"]?.includes("gzip") &&
      [".css", ".html", ".js", ".json", ".svg"].includes(extension);
    if (compressed) bytes = gzipSync(bytes, { level: 9 });
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Length": bytes.length,
      "Content-Type": types.get(extension) ?? "application/octet-stream",
      ...(compressed && { "Content-Encoding": "gzip" }),
    });
    response.end(bytes);
  } catch {
    response.writeHead(404).end();
  }
});
server.listen(Number(port), "127.0.0.1", () =>
  console.log(`Static gzip fixture: http://127.0.0.1:${port}`),
);
process.on("SIGINT", () => {
  server.closeAllConnections();
  server.close();
});
process.on("SIGTERM", () => {
  server.closeAllConnections();
  server.close();
});
