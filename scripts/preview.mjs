import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("dist");
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".json": "application/json",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".png": "image/png",
  ".css": "text/css",
};
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    let file = resolve(root, "." + pathname);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      if (!(await stat(file)).isFile()) file = resolve(root, "index.html");
    } catch {
      file = resolve(root, "index.html");
    }
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(500);
    res.end("Preview unavailable. Run npm run export:web first.");
  }
}).listen(4173, "127.0.0.1", () =>
  console.log("LockIn preview: http://localhost:4173"),
);
