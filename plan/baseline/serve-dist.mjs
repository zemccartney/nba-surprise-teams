// Minimal stand-in for `wrangler pages dev` over a prerendered dist:
// serves <path>/index.html for "/path/", 308s "/path" -> "/path/", and falls
// back to 404.html with status 404. Used when wrangler's dev proxy dies under
// the capture load.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import Path from "node:path";

const root = process.argv[2];
const port = Number(process.argv[3] ?? 8790);
const types = {
  ".css": "text/css",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
};
const exists = async (p) => {
  try {
    const info = await stat(p);
    return info.isFile();
  } catch {
    return false;
  }
};

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const path = Path.normalize(decodeURIComponent(url.pathname));
  const send = (status, file) => {
    res.writeHead(status, {
      "content-type": types[Path.extname(file)] ?? "application/octet-stream",
    });
    createReadStream(file).pipe(res);
  };
  // a real file (asset)
  const direct = Path.join(root, path);
  if (!path.endsWith("/") && (await exists(direct))) return send(200, direct);
  // directory index
  const index = Path.join(root, path, "index.html");
  if (await exists(index)) {
    if (path.endsWith("/") || path === "/") return send(200, index);
    res.writeHead(308, { location: url.pathname + "/" + url.search });
    return res.end();
  }
  const notFound = Path.join(root, "404.html");
  if (await exists(notFound)) return send(404, notFound);
  res.writeHead(404).end("not found");
}).listen(port, () =>
  console.log("static-pages on " + port + " serving " + root),
);
