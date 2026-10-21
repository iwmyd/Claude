// node sites/calc/test/a11y.test.js — 모든 페이지를 axe-core 로 접근성 검사 (WCAG 2.1 A·AA). 라이트·다크 모드 둘 다.
// serious·critical 위반이 하나라도 있으면 실패 → deploy.sh 가 배포를 멈춘다.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const ROOT = path.join(__dirname, '..', 'public');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { s.writeHead(404); return s.end('404'); }
  s.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s);
}).listen(8766);
const pages = fs.readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(ROOT, d.name, 'index.html'))).map((d) => d.name);

(async () => {
  const browser = await chromium.launch();
  let fail = 0;
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme });
    const page = await ctx.newPage();
    for (const slug of ['', ...pages, 'contact/thanks']) {
      await page.goto(`http://localhost:8766/${slug ? slug + '/' : ''}`, { waitUntil: 'networkidle' });
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('ins.adsbygoogle').analyze();
      const bad = r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
      if (bad.length) { fail++; console.log(`❌ [${scheme}] /${slug} ` + bad.map((v) => `${v.id}(${v.nodes.length}): ${v.nodes[0].target.join(' ')}${v.id === 'color-contrast' ? ' → ' + ((v.nodes[0].any[0] || {}).message || '').slice(0, 140) : ''}`).join(' | ')); }
    }
    console.log(`[${scheme}] ${pages.length + 1}페이지 검사`);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(fail ? `\n❌ 접근성 실패 ${fail}건` : '\n✅ 전체 통과');
  process.exitCode = fail ? 1 : 0;
})();
