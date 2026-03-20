import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 3000);
const host = "0.0.0.0";
const root = process.cwd();
const apiBase =
  process.env.PPB_API_BASE ||
  process.env.BULK_LISTING_API_BASE ||
  process.env.PUBLIC_API_BASE ||
  "";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

createServer(async (request, response) => {
  const urlPath = request.url === "/" ? "/index.html" : request.url;
  const filePath = normalize(join(root, urlPath));

  try {
    const contents = await readFile(filePath);
    const extension = extname(filePath);
    const isIndexHtml = extension === ".html" && urlPath === "/index.html";
    const body = isIndexHtml
      ? contents
          .toString("utf8")
          .replace(
            "</head>",
            `    <script>globalThis.PPB_API_BASE = ${JSON.stringify(apiBase)};globalThis.BULK_LISTING_API_BASE = ${JSON.stringify(apiBase)};</script>\n  </head>`
          )
      : contents;
    response.writeHead(200, {
      "content-type": mimeTypes[extension] || "text/plain; charset=utf-8"
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, host, () => {
  console.log(`Purple Polar Bear web app available on http://${host}:${port} and http://localhost:${port}`);
});
