// 종합계산기 대표 이미지(og 1200x630)·아이콘(svg, 32/180/512) — 새 디자인(Swiss·카테고리 색)과 같은 톤
// 사용: node sites/calc/brand/make-brand.js   → sites/calc/assets/ (계산기별 공유 썸네일은 assets/og/<slug>.png)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, '..', 'assets');
const ICONS = require('../icons');
const CALCS = require('../pages').filter((p) => p.calc), n = CALCS.length;
// 계산기 색: style.css 의 [data-tone] 정의를 그대로 읽는다
const TONES = Object.fromEntries([...fs.readFileSync(path.join(__dirname, '..', 'assets', 'style.css'), 'utf8').matchAll(/\[data-tone="(\w+)"\]\s*\{ --tb: (#\w+); --tsb: (#\w+); \}/g)].map((m) => [m[1], [m[2], m[3]]]));
const CATNAME = { build: '건축·토목', basic: '기본 계산기', loan: '대출·금융', save: '저축·투자', car: '자동차', work: '근로·세금', home: '부동산', life: '날짜·생활', game: '게임' };
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const ogCalc = (p) => { const [c, bg] = TONES[p.tone] || ['#0f172a', '#f1f5f9']; const t = p.short;
  return `<div id="b" style="width:1200px;height:630px;background:#f8fafc;font-family:'IBM Plex Sans KR';color:#0f172a;padding:64px 80px;display:flex;flex-direction:column;justify-content:space-between;border-top:14px solid ${c}">
 <div style="display:flex;align-items:center;justify-content:space-between"><div style="display:flex;align-items:center;gap:16px"><div style="width:64px;height:64px;border-radius:18px;background:#0f172a;display:grid;place-items:center">${svgIcon('calculator', '#fff', 38)}</div><div style="font-size:28px;font-weight:700;color:#475569">에이팜 종합계산기</div></div>
  <div style="background:${bg};border:2px solid ${c}33;border-radius:14px;padding:10px 18px;font-size:24px;font-weight:700;color:${c}">${CATNAME[p.cat]}</div></div>
 <div style="display:flex;align-items:center;gap:36px"><div style="flex:none;width:150px;height:150px;border-radius:36px;background:${c};display:grid;place-items:center">${svgIcon(p.icon, '#fff', 88)}</div>
  <div style="min-width:0"><div style="font-size:${t.length > 14 ? 64 : 78}px;font-weight:700;letter-spacing:-.03em;line-height:1.12;word-break:keep-all">${esc(t)}</div><div style="font-size:34px;font-weight:500;color:#334155;margin-top:14px;word-break:keep-all">${esc(p.lead)}</div></div></div>
 <div style="display:flex;justify-content:space-between;font-size:26px;font-weight:500;color:#475569"><span>무료 · 회원가입 없이 바로 계산</span><b style="color:${c}">aipomcalc.com</b></div>
</div>`; };
const CATS = [['기본 계산기', '#334155', '#f1f5f9', 'calculator'], ['대출·금융', '#1d4ed8', '#eff6ff', 'landmark'], ['저축·투자', '#047857', '#ecfdf5', 'piggy'], ['자동차', '#b91c1c', '#fef2f2', 'car'], ['근로·세금', '#b45309', '#fffbeb', 'briefcase'], ['부동산', '#c2410c', '#fff7ed', 'home'], ['날짜·생활', '#be123c', '#fff1f2', 'calendar'], ['건축·토목', '#4d7c0f', '#f7fee7', 'ruler'], ['게임', '#6d28d9', '#f5f3ff', 'gamepad']];
const svgIcon = (k, color, size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`;
const FONT = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@500;700&display=swap" rel="stylesheet">';

const og = `<div id="b" style="width:1200px;height:630px;background:#f8fafc;font-family:'IBM Plex Sans KR';color:#0f172a;padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between">
 <div style="display:flex;align-items:center;gap:18px">
  <div style="width:76px;height:76px;border-radius:20px;background:#0f172a;display:grid;place-items:center">${svgIcon('calculator', '#fff', 46)}</div>
  <div style="font-size:30px;font-weight:700;color:#475569">aipomcalc.com</div></div>
 <div><div style="font-size:92px;font-weight:700;letter-spacing:-.03em;line-height:1.1">에이팜 종합계산기</div>
  <div style="font-size:34px;font-weight:500;color:#334155;margin-top:14px">대출이자 · 복리 · 군적금 · 자동차세 · 공학용까지 ${n}가지 계산</div></div>
 <div style="display:flex;gap:14px;flex-wrap:wrap">${CATS.map(([t, c, bg, i]) => `<div style="display:flex;align-items:center;gap:10px;background:${bg};border:2px solid ${c}33;border-radius:16px;padding:12px 18px;font-size:26px;font-weight:700;color:${c}">${svgIcon(i, c, 30)}${t}</div>`).join('')}</div>
</div>`;
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#0f172a"/><g transform="translate(12 12) scale(1.6667)" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS.calculator}</g><circle cx="50" cy="14" r="6" fill="#2563eb"/></svg>`;

(async () => {
  const b = await chromium.launch(), pg = await b.newPage();
  await pg.setViewportSize({ width: 1200, height: 630 });
  await pg.setContent(`<!doctype html><meta charset="utf-8">${FONT}<style>*{margin:0;box-sizing:border-box}</style>${og}`, { waitUntil: 'networkidle' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.locator('#b').screenshot({ path: path.join(OUT, 'og.png') });
  fs.mkdirSync(path.join(OUT, 'og'), { recursive: true });
  for (const p of CALCS) {
    await pg.setContent(`<!doctype html><meta charset="utf-8">${FONT}<style>*{margin:0;box-sizing:border-box}</style>${ogCalc(p)}`, { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts.ready);
    await pg.locator('#b').screenshot({ path: path.join(OUT, 'og', p.slug + '.png') });
  }
  fs.writeFileSync(path.join(OUT, 'icon.svg'), iconSvg);
  for (const s of [32, 180, 512]) {
    await pg.setViewportSize({ width: s, height: s });
    await pg.setContent(`<style>*{margin:0}</style><div id="i" style="width:${s}px;height:${s}px">${iconSvg.replace('<svg ', `<svg width="${s}" height="${s}" `)}</div>`);
    await pg.locator('#i').screenshot({ path: path.join(OUT, `icon-${s}.png`), omitBackground: true });
  }
  await b.close();
  console.log(`✅ og.png · 계산기별 og/*.png ${CALCS.length}장 · icon.svg · icon-32/180/512.png`);
})();
