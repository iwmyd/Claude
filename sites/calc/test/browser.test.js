// node sites/calc/test/browser.test.js — public/ 을 로컬 서버로 띄워 실제 브라우저에서 계산기 동작·오류·모바일 확인
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', 'public'), SHOT = path.join(__dirname, 'shots');
fs.mkdirSync(SHOT, { recursive: true });
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { s.writeHead(404); return s.end('404'); }
  s.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s);
}).listen(8765);

(async () => {
  const browser = await chromium.launch();
  let fail = 0;
  const ok = (name, cond, extra = '') => { console.log(`${cond ? '✅' : '❌'} ${name} ${extra}`); if (!cond) fail++; };
  for (const [vw, tag] of [[{ width: 1280, height: 900 }, 'pc'], [{ width: 390, height: 844 }, 'mobile']]) {
    const page = await browser.newPage({ viewport: vw });
    const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    for (const slug of ['', 'loan', 'savings', 'prepay', 'severance', 'rent', 'dsr', 'installment', 'military', 'dday', 'age', 'area', 'about', 'privacy']) {
      await page.goto(`http://localhost:8765/${slug ? slug + '/' : ''}`, { waitUntil: 'networkidle' });
      const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
      ok(`[${tag}] /${slug} 가로 스크롤 없음`, scrollW <= vw.width, `(${scrollW}px)`);
      await page.screenshot({ path: path.join(SHOT, `${tag}-${slug || 'home'}.png`), fullPage: slug === 'loan' || slug === '' });
    }
    // 동작 확인
    await page.goto('http://localhost:8765/loan/', { waitUntil: 'networkidle' });
    ok(`[${tag}] 대출 기본값 월 1,520,056원`, (await page.locator('.kpi.main b').innerText()).includes('1,520,056'));
    await page.fill('#rate', '3'); await page.dispatchEvent('#rate', 'input');
    ok(`[${tag}] 금리 3% 입력 → 다시 계산`, !(await page.locator('.kpi.main b').innerText()).includes('1,520,056'));
    ok(`[${tag}] 스케줄 360행`, (await page.locator('#sched tbody tr').count()) === 360);
    await page.goto('http://localhost:8765/savings/', { waitUntil: 'networkidle' });
    await page.fill('#rate', '3.6'); await page.dispatchEvent('#rate', 'input');
    ok(`[${tag}] 적금 월100만 3.6% 12개월 세전 234,000원`, (await page.locator('#out').innerText()).includes('234,000'));
    await page.goto('http://localhost:8765/prepay/', { waitUntil: 'networkidle' });
    ok(`[${tag}] 중도상환 기본값 800,000원`, (await page.locator('.kpi.main b').innerText()).includes('800,000'));
    await page.goto("http://localhost:8765/severance/", { waitUntil: "networkidle" });
    ok(`[${tag}] 퇴직금 기본값 8,804,348원`, (await page.locator(".kpi.main b").innerText()).includes("8,804,348"));
    await page.goto("http://localhost:8765/rent/", { waitUntil: "networkidle" });
    ok(`[${tag}] 전월세 기본값 월 416,667원`, (await page.locator(".kpi.main b").innerText()).includes("416,667"));
    await page.goto("http://localhost:8765/dsr/", { waitUntil: "networkidle" });
    ok(`[${tag}] DSR 기본값 30.40%`, (await page.locator(".kpi.main b").innerText()).includes("30.40%"));
    await page.goto("http://localhost:8765/installment/", { waitUntil: "networkidle" });
    ok(`[${tag}] 할부 총수수료 97,500원`, (await page.locator("#out").innerText()).includes("97,500"));
    await page.goto("http://localhost:8765/military/", { waitUntil: "networkidle" });
    await page.fill("#monthly", "400,000"); await page.dispatchEvent("#monthly", "input");
    ok(`[${tag}] 군적금 국방부 예시 14,685,000원`, (await page.locator(".kpi.main b").innerText()).includes("14,685,000"));
    await page.goto("http://localhost:8765/age/", { waitUntil: "networkidle" });
    await page.fill("#birth", "1990-10-22"); await page.fill("#today", "2026-10-21"); await page.dispatchEvent("#today", "input");
    ok(`[${tag}] 만 나이 35세`, (await page.locator(".kpi.main b").innerText()).includes("35세"));
    await page.goto("http://localhost:8765/dday/", { waitUntil: "networkidle" });
    await page.fill("#from", "2026-10-21"); await page.fill("#to", "2026-12-25"); await page.dispatchEvent("#to", "input");
    ok(`[${tag}] D-65`, (await page.locator(".kpi.main b").innerText()).includes("D-65"));
    await page.goto("http://localhost:8765/area/", { waitUntil: "networkidle" });
    ok(`[${tag}] 84㎡ = 25.41평`, (await page.inputValue("#py")) === "25.41");
    ok(`[${tag}] 콘솔·스크립트 오류 없음`, errors.length === 0, errors.join(' | '));
    await page.close();
  }
  await browser.close(); server.close();
  console.log(fail ? `\n❌ 실패 ${fail}건` : '\n✅ 전체 통과'); process.exitCode = fail ? 1 : 0;
})();
