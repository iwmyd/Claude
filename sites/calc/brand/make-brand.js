// 종합계산기 대표 이미지(og 1200x630)·아이콘(svg, 32/180/512) — 새 디자인(Swiss·카테고리 색)과 같은 톤
// 사용: node sites/calc/brand/make-brand.js   → sites/calc/assets/
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, '..', 'assets');
const ICONS = require('../icons');
const n = require('../pages').filter((p) => p.calc).length;
const CATS = [['기본 계산기', '#334155', '#f1f5f9', 'calculator'], ['대출·금융', '#1d4ed8', '#eff6ff', 'landmark'], ['저축·투자', '#047857', '#ecfdf5', 'piggy'], ['자동차', '#b91c1c', '#fef2f2', 'car'], ['근로·부동산', '#b45309', '#fffbeb', 'briefcase'], ['날짜·생활', '#be123c', '#fff1f2', 'calendar']];
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
  fs.writeFileSync(path.join(OUT, 'icon.svg'), iconSvg);
  for (const s of [32, 180, 512]) {
    await pg.setViewportSize({ width: s, height: s });
    await pg.setContent(`<style>*{margin:0}</style><div id="i" style="width:${s}px;height:${s}px">${iconSvg.replace('<svg ', `<svg width="${s}" height="${s}" `)}</div>`);
    await pg.locator('#i').screenshot({ path: path.join(OUT, `icon-${s}.png`), omitBackground: true });
  }
  await b.close();
  console.log('✅ og.png · icon.svg · icon-32/180/512.png');
})();
