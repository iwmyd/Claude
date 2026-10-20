// 종합계산기 대표 이미지(og 1200x630)·아이콘(32/180/512, svg) 생성 — HTML/CSS → Playwright 캡처
// 사용: node sites/calc/brand/make-brand.js   → sites/calc/assets/ 에 저장 (build.js 가 public/ 으로 복사)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '..', 'assets');
const C = { navy: '#1d2a44', orange: '#e8a33d', red: '#a3401c', beige: '#f5f0e6', ink: '#2b3548' };
const FONT = `<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" rel="stylesheet">`;
const CATS = ['대출·금융', '저축·예금', '근로·부동산', '날짜·생활'];
const n = require('../pages').filter((p) => p.calc).length + require('../pages-extra').filter((p) => p.calc).length;

const og = `<div id="b" style="width:1200px;height:630px;background:${C.beige};color:${C.navy};display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 110px;font-family:Pretendard">
  <div style="width:100%;border-top:8px solid ${C.navy};border-bottom:2px solid ${C.navy};height:18px;margin-bottom:44px"></div>
  <div style="font-size:30px;letter-spacing:.3em;font-weight:700;color:${C.red}">생활경제 계산 도구</div>
  <div style="font-size:104px;font-weight:800;letter-spacing:-.03em;margin:14px 0 10px;line-height:1.1">에이팜 종합계산기</div>
  <div style="font-size:34px;font-weight:500;color:${C.ink}">대출이자 · 적금 · 군적금 · 퇴직금 · 디데이까지 ${n}가지 계산을 한곳에서</div>
  <div style="width:100%;border-top:2px solid ${C.navy};margin-top:44px;padding-top:22px;display:flex;justify-content:center;font-size:30px;font-weight:700">
    ${CATS.map((c, i) => `<span style="padding:0 30px;${i ? `border-left:2px solid ${C.navy}55` : ''}">${c}</span>`).join('')}
  </div></div>`;
// 아이콘: 네이비 둥근 사각형 + 계산기 "=" 와 오렌지 점 (작은 크기에서도 형태가 보이도록 단순하게)
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${C.navy}"/><rect x="14" y="22" width="36" height="6" rx="3" fill="#fff"/><rect x="14" y="36" width="36" height="6" rx="3" fill="#fff"/><circle cx="48" cy="16" r="6" fill="${C.orange}"/></svg>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(`<!doctype html><meta charset="utf-8">${FONT}<style>*{margin:0;box-sizing:border-box}</style><body>${og}</body>`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#b').screenshot({ path: path.join(OUT, 'og.png') });
  fs.writeFileSync(path.join(OUT, 'icon.svg'), iconSvg);
  for (const s of [32, 180, 512]) {
    await page.setViewportSize({ width: s, height: s });
    await page.setContent(`<!doctype html><style>*{margin:0}body{background:transparent}</style><div id="i" style="width:${s}px;height:${s}px">${iconSvg.replace('<svg ', `<svg width="${s}" height="${s}" `)}</div>`);
    await page.locator('#i').screenshot({ path: path.join(OUT, `icon-${s}.png`), omitBackground: true });
  }
  await browser.close();
  console.log('✅ og.png(1200x630) · icon.svg · icon-32/180/512.png →', OUT);
})();
