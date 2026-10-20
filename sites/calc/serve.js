// 로컬 미리보기: node sites/calc/serve.js [포트=8080] → http://localhost:8080
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, 'public'), PORT = Number(process.argv[2]) || 8080;
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };
http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  let f = path.join(ROOT, p); if (!f.startsWith(ROOT)) { s.writeHead(403); return s.end(); }
  if (!fs.existsSync(f)) { s.writeHead(404, { 'Content-Type': T['.html'] }); return fs.createReadStream(path.join(ROOT, '404.html')).pipe(s); }
  s.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s);
}).listen(PORT, () => console.log(`미리보기: http://localhost:${PORT}`));
