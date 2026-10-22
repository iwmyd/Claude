// OGQ 업로드용 로컬 파일 서버 (localhost 전용, CORS 허용 — 브라우저 탭에서 fetch 후 드롭)
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.argv[2];
http.createServer((q, s) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  s.setHeader('Access-Control-Allow-Origin', 'https://creators.ogq.me');
  s.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (q.method === 'OPTIONS') { s.writeHead(204, { 'Access-Control-Allow-Headers': '*' }); return s.end(); }
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || !f.endsWith('.png')) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'Content-Type': 'image/png' }); fs.createReadStream(f).pipe(s);
}).listen(8799, '127.0.0.1', () => console.log('ready'));
