#!/usr/bin/env node
/**
 * Serves the static export (`out/`) the way GitHub Pages serves a project
 * site: under a base path, with directory index files, `.html` fallback and
 * the custom `404.html`.
 *
 *   npm run build:pages && npm run preview:pages
 *   → http://localhost:4173/qr-code-studio/
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../out", import.meta.url));
const basePath = (process.env.PAGES_BASE_PATH ?? "/qr-code-studio").replace(/\/+$/, "");
const port = Number(process.env.PORT ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function send(res, status, path) {
  const body = await readFile(path);
  res.writeHead(status, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream" });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname === "/" && basePath) {
      res.writeHead(302, { Location: `${basePath}/` });
      return res.end();
    }
    if (basePath && url.pathname !== basePath && !url.pathname.startsWith(`${basePath}/`)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found (outside the base path)");
    }

    const relative = decodeURIComponent(url.pathname.slice(basePath.length)) || "/";
    const target = normalize(join(root, relative));
    // Never serve anything outside out/ (path traversal).
    if (target !== root && !target.startsWith(root + sep)) {
      res.writeHead(400);
      return res.end();
    }

    if (await isDirectory(target)) {
      // GitHub Pages redirects /dir to /dir/ and serves dir/index.html.
      if (!url.pathname.endsWith("/")) {
        res.writeHead(301, { Location: `${url.pathname}/${url.search}` });
        return res.end();
      }
      if (await isFile(join(target, "index.html"))) return send(res, 200, join(target, "index.html"));
    }
    if (await isFile(target)) return send(res, 200, target);
    if (await isFile(`${target}.html`)) return send(res, 200, `${target}.html`);
    return send(res, 404, join(root, "404.html"));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(String(error));
  }
});

server.listen(port, () => {
  console.log(`Static preview: http://localhost:${port}${basePath}/`);
});
