// node sites/calc/test/browser.test.js — public/ 을 로컬 서버로 띄워 실제 브라우저에서 계산기·편의 기능·접근성·모바일 확인
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', 'public'), SHOT = path.join(__dirname, 'shots');
fs.mkdirSync(SHOT, { recursive: true });
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.xml': 'application/xml', '.txt': 'text/plain', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { s.writeHead(404); return s.end('404'); }
  s.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s);
}).listen(8765);
const U = (p) => `http://localhost:8765/${p ? p + '/' : ''}`;
const SLUGS = ['', 'basic', 'scientific', 'loan', 'dsr', 'prepay', 'installment', 'savings', 'compound', 'military', 'car-loan', 'car-tax', 'severance', 'rent', 'area', 'dday', 'age', 'percent', 'charcount', 'refinance', 'goal', 'avgprice', 'car-acq', 'salary', 'wage', 'unemployment', 'vat', 'subscription', 'bmi', 'winrate', 'annual-leave', 'brokerage', 'freelance-tax', 'electricity', 'area-volume', 'materials', 'slope', 'stairs', 'earthwork', 'unit-convert', 'fc-transfer', 'image', 'about', 'privacy', 'contact', 'contact/thanks'];

(async () => {
  const browser = await chromium.launch();
  let fail = 0;
  const ok = (name, cond, extra = '') => { console.log(`${cond ? '✅' : '❌'} ${name} ${cond ? '' : extra}`); if (!cond) fail++; };
  for (const [vw, tag] of [[{ width: 1280, height: 900 }, 'pc'], [{ width: 390, height: 844 }, 'mobile']]) {
    const ctx = await browser.newContext({ viewport: vw });
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && !/fonts\.g|404/.test(m.text()) && errors.push(m.text()));
    const main = async () => (await page.locator('.kpi.main b').first().innerText()).trim();
    const set = async (id, v) => { await page.fill('#' + id, String(v)); await page.dispatchEvent('#' + id, 'input'); };
    const a11yBad = [];
    for (const slug of SLUGS) {
      await page.goto(U(slug), { waitUntil: 'networkidle' });
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      if (sw > vw.width) a11yBad.push(`/${slug} 가로스크롤 ${sw}`);
      const bad = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('.calc input').forEach((i) => { if (['hidden', 'file', 'checkbox'].includes(i.type)) { if (i.type !== 'hidden' && !i.closest('label')) out.push('라벨 #' + i.id); return; } if (i.type !== 'date' && !i.getAttribute('inputmode')) out.push('키패드 #' + i.id); if (!i.closest('label')) out.push('라벨 #' + i.id); });
        document.querySelectorAll('.catnav a, .f input, .f select, .ab, .tb, .k, .fav').forEach((e) => { const r = e.getBoundingClientRect(); if (r.height && r.height < 44) out.push(`터치 ${Math.round(r.height)}px ${e.id || e.className}`); });
        if (!document.querySelector('.skip[href="#main"]') || !document.getElementById('main')) out.push('건너뛰기 없음');
        return out;
      });
      a11yBad.push(...bad.map((b) => `/${slug} ${b}`));
      await page.screenshot({ path: path.join(SHOT, `${tag}-${slug || 'home'}.png`), fullPage: ['', 'loan', 'compound', 'basic', 'scientific', 'car-tax'].includes(slug) });
    }
    ok(`[${tag}] 31페이지 접근성(키패드·라벨·터치44px·건너뛰기)·가로스크롤 없음`, a11yBad.length === 0, a11yBad.slice(0, 6).join(' | '));

    // 계산 결과
    await page.goto(U('loan'), { waitUntil: 'networkidle' });
    ok(`[${tag}] 대출 월 1,520,056원`, (await main()).includes('1,520,056'));
    ok(`[${tag}] 대출 연도별 막대 차트`, (await page.locator('#chart svg rect').count()) > 30);
    ok(`[${tag}] 대출 표 3개(비교·금리·월별 360행) + CSV 버튼`, (await page.locator('[data-csv]').count()) === 3 && (await page.locator('#tables .tbl').nth(1).locator('tbody tr').count()) === 360);
    await page.goto(U('savings'), { waitUntil: 'networkidle' }); await set('rate', '3.6');
    ok(`[${tag}] 적금 세전 이자 234,000원`, (await page.locator('#out').innerText()).includes('234,000'));
    await page.goto(U('compound'), { waitUntil: 'networkidle' }); await set('monthly', '0'); await set('rate', '7'); await set('years', '10'); await page.selectOption('#freq', 'yearly'); await page.dispatchEvent('#freq', 'input');
    ok(`[${tag}] 복리 1,000만 7% 10년 = 19,671,514원`, (await main()).includes('19,671,514'), await main());
    ok(`[${tag}] 복리 영역 차트`, (await page.locator('#chart svg path').count()) >= 4);
    await page.goto(U('military'), { waitUntil: 'networkidle' }); await set('monthly', '400,000');
    ok(`[${tag}] 군적금 국방부 예시 14,685,000원`, (await main()).includes('14,685,000'));
    await page.goto(U('car-tax'), { waitUntil: 'networkidle' });
    ok(`[${tag}] 자동차세 1,998cc 1년차 519,480원`, (await main()).includes('519,480'), await main());
    await page.goto(U('car-loan'), { waitUntil: 'networkidle' });
    ok(`[${tag}] 자동차 할부 선납 비교표 6행`, (await page.locator('#tables .tbl').first().locator('tbody tr').count()) === 6);
    await page.goto(U('installment'), { waitUntil: 'networkidle' });
    ok(`[${tag}] 할부 총수수료 97,500원`, (await page.locator('#out').innerText()).includes('97,500'));
    for (const [slug, want] of [['prepay', '800,000'], ['severance', '8,804,348'], ['rent', '416,667'], ['dsr', '30.40%']]) { await page.goto(U(slug), { waitUntil: 'networkidle' }); ok(`[${tag}] ${slug} 기본값 ${want}`, (await main()).includes(want), await main()); }
    await page.goto(U('dday'), { waitUntil: 'networkidle' }); await set('from', '2026-10-21'); await set('to', '2026-12-25');
    ok(`[${tag}] D-65`, (await main()).includes('D-65'));
    await page.goto(U('age'), { waitUntil: 'networkidle' }); await set('birth', '1990-10-22'); await set('today', '2026-10-21');
    ok(`[${tag}] 만 나이 35세`, (await main()).includes('35세'));
    await page.goto(U('area'), { waitUntil: 'networkidle' });
    ok(`[${tag}] 84㎡ = 25.41평`, (await page.inputValue('#py')) === '25.41');

    // 추가 12종
    await page.goto(U("percent"), { waitUntil: "networkidle" });
    ok(`[${tag}] 퍼센트 200의 15% = 30`, (await page.locator("#o1").innerText()).includes("= 30"));
    await page.goto(U("charcount"), { waitUntil: "networkidle" }); await set("text", "안녕 하세요");
    ok(`[${tag}] 글자 수 공백포함 6`, (await main()) === "6자");
    await page.goto(U("wage"), { waitUntil: "networkidle" });
    ok(`[${tag}] 최저임금 월 환산 2,156,880원 · 실수령 1,927,700원`, (await page.locator("#out").innerText()).includes("2,156,880") && (await main()).includes("1,927,700"), await main());
    await page.selectOption("#tax", "biz");
    ok(`[${tag}] 3.3% 선택 → 실수령 2,085,710원 · 비교표 4행`, (await main()).includes("2,085,710") && (await page.locator("#tables tbody tr").count()) === 4, await main());
    await page.goto(U("vat"), { waitUntil: "networkidle" });
    ok(`[${tag}] 부가세 합계 1,100,000원`, (await main()).includes("1,100,000"));
    await page.goto(U("subscription"), { waitUntil: "networkidle" }); await set("home", 15); await set("dep", 6); await set("acc", 15);
    ok(`[${tag}] 청약 만점 84점`, (await main()).startsWith("84점"));
    await page.goto(U("unemployment"), { waitUntil: "networkidle" }); await set("wage3m", "15,000,000");
    ok(`[${tag}] 실업급여 상한 68,100 × 180일 = 12,258,000원`, (await main()).includes("12,258,000"), await main());
    await page.goto(U("car-acq"), { waitUntil: "networkidle" });
    ok(`[${tag}] 취등록세 3,000만 승용 2,100,000원`, (await main()).includes("2,100,000"));
    await page.goto(U("salary"), { waitUntil: "networkidle" });
    ok(`[${tag}] 연봉 실수령 그래프·표`, (await page.locator("#chart svg rect").count()) >= 6 && (await page.locator("#tables tbody tr").count()) === 7);
    for (const sl of ["refinance", "goal", "avgprice", "bmi"]) { await page.goto(U(sl), { waitUntil: "networkidle" }); ok(`[${tag}] ${sl} 결과 표시`, /d/.test(await main()) || (await main()).length > 0, await main()); }

    // 추가 4종
    await page.goto(U('annual-leave'), { waitUntil: 'networkidle' }); await set('start', '2020-03-02'); await set('last', '2026-10-22');
    ok(`[${tag}] 연차 6년 근속 17일 · 표 강조 1줄`, (await main()) === '17일' && (await page.locator('#tables tr.now').count()) === 1, await main());
    await page.goto(U('brokerage'), { waitUntil: 'networkidle' });
    ok(`[${tag}] 복비 매매 5억 → 200만 원 · 보증금 칸 숨김`, (await main()).includes('2,000,000') && !(await page.locator('#deposit').isVisible()), await main());
    await page.selectOption('#deal', 'lease'); await set('deposit', '10,000,000'); await set('rent', '300,000');
    ok(`[${tag}] 복비 월세 1천/30 → 155,000원`, (await main()).includes('155,000') && (await page.locator('#deposit').isVisible()), await main());
    await page.goto(U('freelance-tax'), { waitUntil: 'networkidle' }); await set('income', '30,000,000');
    ok(`[${tag}] 3.3% 수입 3천만 → 환급 455,180원`, (await main()).includes('455,180'), await main());
    await page.goto(U('electricity'), { waitUntil: 'networkidle' });
    ok(`[${tag}] 전기 350kWh → 70,640원 · 표 8행`, (await main()).includes('70,640') && (await page.locator('#tables tbody tr').count()) === 8, await main());

    // 건축·토목 6종 — 모드 전환 시 칸이 바뀌고 결과가 맞는지
    await page.goto(U('area-volume'), { waitUntil: 'networkidle' });
    ok(`[${tag}] 면적: 기본 직사각형 10×8 = 80㎡ · 세 변 칸 숨김`, (await main()).startsWith('80') && !(await page.locator('#sa').isVisible()), await main());
    await page.selectOption('#shape', 'poly');
    ok(`[${tag}] 면적: 다각형 좌표 → 120㎡ · 가로 칸 숨김`, (await main()).startsWith('120') && !(await page.locator('#w').isVisible()) && (await page.locator('#pts').isVisible()), await main());
    await page.selectOption('#shape', 'frustum');
    ok(`[${tag}] 부피: 원뿔대 3·2·2m = 9.948㎥`, (await main()).startsWith('9.948'), await main());
    await page.goto(U('materials'), { waitUntil: 'networkidle' });
    ok(`[${tag}] 콘크리트 10×8×0.2 → 16.16㎥ · 3대`, (await main()).startsWith('16.16') && (await page.locator('#out').innerText()).includes('3대'), await main());
    await page.selectOption('#mat', 'rebar');
    ok(`[${tag}] 철근 D10 8m×100 → 0.461톤 · KS 표 12행 · 콘크리트 칸 숨김`, (await main()).startsWith('0.461') && (await page.locator('#tables tbody tr').count()) === 12 && !(await page.locator('#cw').isVisible()), await main());
    await page.selectOption('#mat', 'brick');
    ok(`[${tag}] 벽돌 (10×2.4−3.6)×75 → 1,530매, 3% 1,576매`, (await main()).startsWith('1,576'), await main());
    await page.goto(U('slope'), { waitUntil: 'networkidle' });
    ok(`[${tag}] 경사 1/12 → 8.33%`, (await main()).startsWith('8.33'), await main());
    await page.selectOption('#smode', 'deg'); await set('deg', '45');
    ok(`[${tag}] 경사 45° → 100%`, (await main()).startsWith('100'), await main());
    await page.goto(U('stairs'), { waitUntil: 'networkidle' }); await page.selectOption('#use', 'elem');
    ok(`[${tag}] 계단 2,800/175 → 16단 · 초등학교 기준 단높이 초과 경고`, (await main()).startsWith('16') && (await page.locator('#out .note.over').count()) === 1, await main());
    await page.goto(U('earthwork'), { waitUntil: 'networkidle' });
    ok(`[${tag}] 토공량 630㎥`, (await main()).startsWith('630'), await main());
    await page.goto(U('unit-convert'), { waitUntil: 'networkidle' }); await page.selectOption('#ukind', 'press'); await set('uval', '24');
    ok(`[${tag}] 단위 24MPa → 244.73kgf/cm² (맨 위)`, (await main()).startsWith('244.73'), await main());

    // 결과 그림: 건축·토목 5종 모두 SVG 그림이 나오고 모드를 바꾸면 그림도 바뀐다
    for (const [sl, prep] of [["area-volume", null], ["materials", null], ["slope", null], ["stairs", null], ["earthwork", null]]) {
      await page.goto(U(sl), { waitUntil: "networkidle" });
      ok(`[${tag}] 그림: ${sl} SVG 표시`, (await page.locator("#chart figure.diagram svg").count()) >= 1);
    }
    await page.goto(U("area-volume"), { waitUntil: "networkidle" }); const d1 = await page.locator("#chart svg").innerHTML(); await page.selectOption("#shape", "circle");
    ok(`[${tag}] 그림: 도형을 바꾸면 그림도 바뀜`, d1 !== (await page.locator("#chart svg").innerHTML()));
    await page.goto(U("materials"), { waitUntil: "networkidle" }); await page.click("[data-reset]"); // 앞 검사에서 바꾼 값이 저장돼 있으므로 처음 값으로
    ok(`[${tag}] 그림: 레미콘 차 3대 칸`, (await page.locator("#chart rect.dg-truck").count()) === 3);

    // SEO·문의 (2026-10-22)
    await page.goto(U('contact') + '?calc=wage', { waitUntil: 'networkidle' });
    ok(`[${tag}] 문의: ?calc=wage → 관련 계산기 미리 선택 · 감사 페이지로 이동 설정`, (await page.inputValue('#c-calc')) === '시급·주휴수당 계산기' && (await page.getAttribute('input[name=_next]', 'value')).endsWith('/contact/thanks/'));
    ok(`[${tag}] 문의: 이메일·내용·동의 필수`, (await page.locator('#c-email[required], #c-msg[required], #c-agree[required]').count()) === 3);
    await page.goto(U('contact/thanks'), { waitUntil: 'networkidle' });
    ok(`[${tag}] 감사 페이지 noindex`, (await page.locator('meta[name=robots][content=noindex]').count()) === 1);
    if (tag === 'pc') {
      const bad = [];
      for (const sl of SLUGS.filter((x) => x && !['about', 'privacy', 'contact', 'contact/thanks'].includes(x))) {
        await page.goto(U(sl), { waitUntil: 'domcontentloaded' });
        const n = await page.locator('.faq details').count(), og = await page.getAttribute('meta[property="og:image"]', 'content'), d = await page.getAttribute('meta[name=description]', 'content');
        if (n < 3 || !og.endsWith('/og/' + sl + '.png') || !d || d.length < 40 || (await page.locator('nav.crumb').count()) !== 1 || (await page.locator('.related .tile').count()) < 3) bad.push(`${sl}(faq ${n}, og ${og.split('/').pop()})`);
      }
      ok(`[${tag}] 모든 계산기: FAQ 3개+ · 전용 썸네일 · 설명 · 탐색경로 · 관련 링크`, bad.length === 0, bad.join(', '));
    }

    // FC 이적시장: 체크박스·선수 추가/빼기·쿠폰 한도·역산
    await page.goto(U('fc-transfer'), { waitUntil: 'networkidle' });
    ok(`[${tag}] FC 1억 → 6,000만 BP`, (await main()).startsWith('6,000만'), await main());
    await page.check('#fpc'); await page.check('#ftop');
    ok(`[${tag}] FC PC방+TOP → 8,000만`, (await main()).startsWith('8,000만'), await main());
    // 전체 판매 금액 1억 8500만 중 8500만 선수 1명에만 30% 쿠폰(한도 500만) → 나머지 1억은 쿠폰 없이
    await set('ftot', '1억 8500만'); await set('fcp1', '8500만'); await page.selectOption('#fcc1', '30'); await set('fcm1', '500만');
    ok(`[${tag}] FC 전체 금액 + 쿠폰 선수·한도 → 1억 5,300만`, (await main()).startsWith('1억 5,300만'), await main());
    ok(`[${tag}] FC 선수별 내역에 쿠폰 없는 나머지 줄`, (await page.locator('#tables').innerText()).includes('나머지 (쿠폰 없음)'));
    await set('fcp1', '3억');
    ok(`[${tag}] FC 선수 합이 전체보다 크면 안내`, (await page.locator('#out').innerText()).includes('선수 판매 금액의 합'));
    await set('fcp1', '8500만');
    await page.click('[data-fc-add]'); await set('fcp2', '3000만'); await page.click('[data-fc-add]'); await set('fcp3', '2억'); await page.click('[data-fc-del="2"]');
    ok(`[${tag}] FC 선수 빼기: 아래 줄이 당겨짐`, (await page.inputValue('#fcp2')) === '2억' && (await page.locator('.fc-row:not([hidden])').count()) === 2);
    await page.reload({ waitUntil: 'networkidle' });
    ok(`[${tag}] FC 체크박스·선수 수 저장·복원`, (await page.isChecked('#fpc')) && (await page.inputValue('#fcn')) === '2');
    await page.selectOption('#fmode', 'target');
    ok(`[${tag}] FC 역산 10억(PC+TOP) → 12억 5,000만`, (await main()).startsWith('12억 5,000만'), await main());
    await page.click('[data-reset]');
    // 이미지 계산기: 길이·면적 (글자 인식 없이 — 네트워크 불필요). 300×200px 방, 문 90px = 0.9m → 6㎡
    const pic = await ctx.newPage(); await pic.setViewportSize({ width: 500, height: 360 });
    await pic.setContent('<body style="margin:0"><svg width="500" height="360" xmlns="http://www.w3.org/2000/svg" style="background:#f4f1ea"><rect x="100" y="80" width="300" height="200" fill="#e3d9c6" stroke="#333" stroke-width="4"/></svg></body>');
    const png = await pic.screenshot(); await pic.close();
    await page.goto(U('image'), { waitUntil: 'networkidle' });
    await page.selectOption('#pmode', 'measure');
    await page.setInputFiles('#pfile', { name: 'room.png', mimeType: 'image/png', buffer: png });
    await page.waitForFunction(() => !document.getElementById('pstage').hidden && document.getElementById('pcv').width === 500); // 이미지가 다 불러와질 때까지
    const bx = await page.$eval('#pcv', (c) => { c.scrollIntoView(); const q = c.getBoundingClientRect(); return { x: q.left, y: q.top, s: q.width / c.width }; });
    for (const [x, y] of [[160, 280], [250, 280], [100, 80], [400, 80], [400, 280], [100, 280]]) await page.mouse.click(bx.x + x * bx.s, bx.y + y * bx.s);
    ok(`[${tag}] 이미지 계산기 면적 6㎡ ±2% (기준선 0.9m, 클릭 좌표 반올림 오차)`, Math.abs(parseFloat(await main()) - 6) <= 0.12, await main());
    await page.selectOption('#pmode', 'slope'); await page.waitForFunction(() => /아래쪽과 위쪽/.test(document.getElementById('out').textContent));
    const by = await page.$eval('#pcv', (c) => { c.scrollIntoView(); const q = c.getBoundingClientRect(); return { x: q.left, y: q.top, s: q.width / c.width }; }); // 선택 상자로 화면이 움직였으므로 다시 잼
    for (const [x, y] of [[100, 280], [400, 205]]) await page.mouse.click(by.x + x * by.s, by.y + y * by.s);
    ok(`[${tag}] 이미지 계산기 경사 1:4 → 14° 안팎`, Math.abs(parseFloat(await main()) - 14.04) <= 0.3, await main());
    await page.selectOption('#pmode', 'receipt'); await page.evaluate(() => { const e = document.getElementById('pocr'); e.hidden = true; });
    await set('ptotal', '37,000');
    ok(`[${tag}] 이미지 계산기 영수증 37,000원 ÷ 4명 → 9,300원`, (await main()) === '9,300원', await main());

    // 일반·공학용 계산기
    await page.goto(U('basic'), { waitUntil: 'networkidle' });
    for (const k of ['2', '+', '3', '×', '4']) await page.click(`.k[data-k="${k}"]`);
    await page.click('.k[data-k="="]');
    ok(`[${tag}] 일반 계산기 2+3×4 = 14 · 기록 저장`, (await page.locator('#res').innerText()) === '14' && (await page.locator('#history li').count()) === 1);
    await page.click('.k[data-k="AC"]'); for (const k of ['5', '0', '+', '1', '0', '%']) await page.click(`.k[data-k="${k}"]`); await page.click('.k[data-k="="]');
    ok(`[${tag}] 50+10% = 55`, (await page.locator('#res').innerText()) === '55');
    await page.goto(U('scientific'), { waitUntil: 'networkidle' });
    for (const k of ['sin', '3', '0', ')']) await page.click(`.k[data-k="${k}"]`); await page.click('.k[data-k="="]');
    ok(`[${tag}] 공학 sin(30) = 0.5`, (await page.locator('#res').innerText()) === '0.5', await page.locator('#res').innerText());
    await page.fill('#expr', '1/0'); await page.press('#expr', 'Enter');
    ok(`[${tag}] 0으로 나누기 오류 안내`, (await page.locator('#err').innerText()).includes('0으로'));

    // 편의 기능
    await page.goto(U('loan'), { waitUntil: 'networkidle' }); await set('rate', '5'); await page.waitForTimeout(600);
    await page.goto(U('loan'), { waitUntil: 'networkidle' });
    ok(`[${tag}] 입력값 자동 저장·복원`, (await page.inputValue('#rate')) === '5');
    await page.click('[data-reset]');
    ok(`[${tag}] 초기화`, (await page.inputValue('#rate')) === '4.5');
    await page.goto(U('loan') + '?rate=3&principal=100000000', { waitUntil: 'networkidle' });
    ok(`[${tag}] 공유 링크로 입력값 채우기`, (await page.inputValue('#rate')) === '3' && (await page.inputValue('#principal')) === '100,000,000');
    ok(`[${tag}] 금액 한글 읽기 "1억원"`, (await page.locator('.f small.won').first().innerText()) === '1억원');
    await page.click('.quick [data-add="10000000"] >> nth=0');
    ok(`[${tag}] 빠른 금액 +1,000만`, (await page.inputValue('#principal')) === '110,000,000');
    await page.click('[data-fav]');
    await page.goto(U(''), { waitUntil: 'networkidle' });
    ok(`[${tag}] 즐겨찾기·최근 사용 홈 표시`, (await page.locator('#favs .tile').count()) === 1 && (await page.locator('#recent .tile').count()) >= 1);
    // 최근 사용은 가로 1줄만 (열 수만큼)
    for (const sl of ['salary', 'wage', 'vat', 'bmi', 'percent', 'goal', 'refinance', 'severance']) await page.goto(U(sl), { waitUntil: 'domcontentloaded' });
    await page.goto(U(''), { waitUntil: 'networkidle' });
    const rec = await page.evaluate(() => { const g = document.getElementById('recent'); const vis = [...g.children].filter((t) => t.offsetParent); const tops = new Set(vis.map((t) => Math.round(t.getBoundingClientRect().top))); return { rows: tops.size, n: vis.length, all: g.children.length, cols: getComputedStyle(g).gridTemplateColumns.split(' ').length }; });
    ok(`[${tag}] 최근 사용 1줄 (${rec.n}개 · ${rec.cols}열)`, rec.rows === 1 && rec.n === Math.min(rec.all, rec.cols), JSON.stringify(rec));

    await page.keyboard.press('/'); await page.keyboard.type('ㄱㅈㄱ');
    ok(`[${tag}] 초성 검색 ㄱㅈㄱ → 군적금`, (await page.locator('#qr li').first().innerText()).includes('군적금'));
    await page.fill('#q', '군젹금');
    ok(`[${tag}] 오타 검색 군젹금 → 군적금 추천`, (await page.locator('#qr li.sug').count()) === 1 && (await page.locator('#qr li[role=option]').first().innerText()).includes('군적금'));
    await page.fill('#q', 'dusqhd');
    ok(`[${tag}] 한/영 실수 dusqhd → 연봉`, (await page.locator('#qr li[role=option]').first().innerText()).includes('연봉'));
    await page.fill('#q', 'ㄱㅈㄱ');
    await Promise.all([page.waitForURL('**/military/'), page.keyboard.press('Enter')]); await page.waitForLoadState('networkidle');
    ok(`[${tag}] 검색 Enter 이동`, page.url().endsWith('/military/'));
    const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.click('[data-theme-toggle]');
    const after = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    ok(`[${tag}] 다크 모드 전환(배경색 변경)`, before !== after, `${before} → ${after}`);
    await page.screenshot({ path: path.join(SHOT, `${tag}-military-dark.png`) });
    ok(`[${tag}] 콘솔·스크립트 오류 없음`, errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(fail ? `\n❌ 실패 ${fail}건` : '\n✅ 전체 통과'); process.exitCode = fail ? 1 : 0;
})();
