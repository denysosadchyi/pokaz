// Локальний перегляд сайту без кешу і з автооновленням.
// Запуск: node tools/serve.mjs [порт]  (за замовчуванням 5274, слухає всю LAN)
// - кожна відповідь має Cache-Control: no-store — браузер завжди бере свіжі файли;
// - у кожну HTML-сторінку вставляється скрипт, який слухає /__reload (SSE)
//   і перезавантажує сторінку, щойно в репо змінився будь-який файл.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2] || process.env.PORT || 5274);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".pdf": "application/pdf",
  ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
};
const NO_CACHE = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", Expires: "0" };
const RELOAD = `<script>(()=>{const es=new EventSource("/__reload");` +
  `es.addEventListener("change",()=>location.reload());})();</script>`;

const clients = new Set();
let timer = null;
fs.watch(ROOT, { recursive: true }, (_e, file) => {
  if (!file || /(^|[\\/])(\.git|node_modules)([\\/]|$)/.test(file)) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    for (const res of clients) res.write(`event: change\ndata: ${file}\n\n`);
  }, 150);
});

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/__reload") {
    res.writeHead(200, { ...NO_CACHE, "Content-Type": "text/event-stream", Connection: "keep-alive" });
    res.write("retry: 1000\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }
  let p = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404, NO_CACHE); return res.end("404"); }
    const ext = path.extname(p).toLowerCase();
    let body = buf;
    if (ext === ".html") {
      const s = buf.toString("utf8");
      body = s.includes("</body>") ? s.replace("</body>", RELOAD + "</body>") : s + RELOAD;
    }
    res.writeHead(200, { ...NO_CACHE, "Content-Type": TYPES[ext] || "application/octet-stream" });
    res.end(body);
  });
}).listen(PORT, "0.0.0.0", () => console.log(`http://0.0.0.0:${PORT}/ — no-store + live reload`));
