#!/usr/bin/env node
'use strict';
/**
 * OGQ 글자 스티커 생성기 (2026-10-23) — 손글씨 문구·공정위 문구처럼 글자가 주인공인 세트
 *   글씨: Google Fonts OFL 한글 폰트 여러 개 / 장식: rough.js 손선(밑줄·형광펜·점선·별·하트·잎·동그라미)
 *   taste-skill 원칙: 그레이디언트·흐린 그림자·이모지 없음. 흰 컷 라인으로 다크모드 대응
 * 사용: node scripts/make_ogq_text.js <spec.json>
 * spec: { outDir, main, tab, stickers:[{ text, font, ink, deco, deco2?, align? }] }
 *   deco: underline|wave|highlight|dots|box|circle|none   deco2: star|heart|leaf|sparkle|none
 */
const fs = require('fs');
const path = require('path');
const rough = require('roughjs');
const { chromium } = require('playwright');
const sharp = require('sharp');

const W = 740, H = 640;
const INK = { brown: '#4a2f1f', navy: '#22344f', green: '#2f6b40', berry: '#b8344a', teal: '#1f6f6b', plum: '#5d3a6e', gray: '#3d4148' };
const HL = { yellow: '#ffe27a', mint: '#a8e6cf', pink: '#ffc1cc', sky: '#bfe0f7', peach: '#ffd3a8' };
const FONTS = { 'Nanum Pen Script': 1.25, 'Yeon Sung': 1.0, 'Hi Melody': 1.08, 'Poor Story': 1.0, Gaegu: 1.0, 'Gowun Dodum': 0.88, Jua: 0.92, 'Gamja Flower': 1.15, 'Do Hyeon': 0.95 };
const CSS = { 'Nanum Pen Script': 'Nanum+Pen+Script', 'Yeon Sung': 'Yeon+Sung', 'Hi Melody': 'Hi+Melody', 'Poor Story': 'Poor+Story', Gaegu: 'Gaegu:wght@700', 'Gowun Dodum': 'Gowun+Dodum', Jua: 'Jua', 'Gamja Flower': 'Gamja+Flower', 'Do Hyeon': 'Do+Hyeon' };
let seed = 1; const G = rough.generator();
const o = (x = {}) => ({ roughness: 1.4, bowing: 1.2, stroke: '#4a2f1f', strokeWidth: 6, seed: seed++, ...x });
const svgOf = (d) => G.toPaths(d).map((p) => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill || 'none'}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function deco2(kind, x, y, c) {
  if (kind === 'star') return svgOf(G.path(`M${x} ${y - 30} L${x + 9} ${y - 9} L${x + 32} ${y - 8} L${x + 14} ${y + 6} L${x + 20} ${y + 28} L${x} ${y + 15} L${x - 20} ${y + 28} L${x - 14} ${y + 6} L${x - 32} ${y - 8} L${x - 9} ${y - 9} Z`, o({ fill: '#f2c14e', fillStyle: 'solid', strokeWidth: 4, stroke: c })));
  if (kind === 'heart') return svgOf(G.path(`M${x} ${y + 26} C${x - 44} ${y} ${x - 30} ${y - 32} ${x} ${y - 12} C${x + 30} ${y - 32} ${x + 44} ${y} ${x} ${y + 26} Z`, o({ fill: '#e0565b', fillStyle: 'solid', strokeWidth: 4, stroke: c })));
  if (kind === 'leaf') return svgOf(G.path(`M${x - 30} ${y + 20} Q${x - 20} ${y - 30} ${x + 30} ${y - 26} Q${x + 20} ${y + 20} ${x - 30} ${y + 20} Z`, o({ fill: '#7cb07f', fillStyle: 'solid', strokeWidth: 4, stroke: c }))) + svgOf(G.line(x - 30, y + 20, x + 18, y - 16, o({ strokeWidth: 3, stroke: c })));
  if (kind === 'sparkle') return [[x, y, 24], [x + 34, y - 26, 14]].map(([a, b, r]) => svgOf(G.path(`M${a} ${b - r} Q${a} ${b} ${a + r} ${b} Q${a} ${b} ${a} ${b + r} Q${a} ${b} ${a - r} ${b} Q${a} ${b} ${a} ${b - r} Z`, o({ fill: '#f2c14e', fillStyle: 'solid', strokeWidth: 3, stroke: c })))).join('');
  return '';
}

function sticker(st, i, widths100) {
  seed = 500 + i * 131;
  const font = st.font || 'Nanum Pen Script', fsc = FONTS[font] || 1, ink = INK[st.ink] || INK.brown;
  const lines = String(st.text).split('\n');
  const n = Math.max(...lines.map((l) => [...l].length));
  // 브라우저에서 잰 실제 폭(글자 크기 100 기준)으로 목표 폭에 맞춘다
  const maxW = st.deco === 'box' || st.deco === 'circle' || st.card ? 560 : 640;
  const maxH = (st.deco === 'box' || st.deco === 'circle' ? 400 : 470) / (lines.length * 1.18);
  const fsz = Math.round(Math.min(lines.length === 1 ? 170 : 150, maxH, (maxW * 100) / Math.max(...widths100)));
  const lh = fsz * 1.18, top = 320 - ((lines.length - 1) * lh) / 2 + fsz * 0.34;
  const hl = HL[st.hl] || HL.yellow;
  const parts = [];
  const tw = (l) => widths100[lines.indexOf(l)] * fsz / 100;
  // 바탕 장식 (글자 뒤)
  if (st.card) { const h = lines.length * lh + 90, w = Math.max(...lines.map(tw)) + 90; parts.push(svgOf(G.rectangle(370 - w / 2, 320 - h / 2 - 6, w, h, o({ fill: '#ffffff', fillStyle: 'solid', stroke: 'none', strokeWidth: 0, roughness: 0.8 })))); } // 흰 종이 카드: 다크모드에서도 깔끔
  if (st.deco === 'highlight') lines.forEach((l, k) => { const w = tw(l), y = top + k * lh; parts.push(svgOf(G.rectangle(370 - w / 2 - 14, y - fsz * 0.32, w + 28, fsz * 0.42, o({ fill: hl, fillStyle: 'solid', stroke: 'none', strokeWidth: 0, roughness: 2.2 })))); });
  if (st.deco === 'box') { const h = lines.length * lh + 70, w = Math.max(...lines.map(tw)) + 90; parts.push(svgOf(G.rectangle(370 - w / 2, 320 - h / 2, w, h, o({ fill: '#fffdf6', fillStyle: 'solid', stroke: ink, strokeWidth: 6, roughness: 1.6 })))); }
  if (st.deco === 'circle') { const w = Math.max(...lines.map(tw)) + 110, h = lines.length * lh + 110; parts.push(svgOf(G.ellipse(370, 320, w, h, o({ fill: hl, fillStyle: 'solid', stroke: ink, strokeWidth: 5, roughness: 2 })))); }
  // 글자
  lines.forEach((l, k) => parts.push(`<text x="370" y="${top + k * lh}" text-anchor="middle" font-family="${font}" font-size="${fsz}" fill="${ink}" stroke="#fff" stroke-width="${Math.round(fsz * 0.12)}" paint-order="stroke" stroke-linejoin="round">${esc(l)}</text>`));
  // 앞 장식
  const lastY = top + (lines.length - 1) * lh, lastW = tw(lines[lines.length - 1]);
  if (st.deco === 'underline') parts.push(svgOf(G.line(370 - lastW / 2, lastY + fsz * 0.22, 370 + lastW / 2, lastY + fsz * 0.18, o({ stroke: ink, strokeWidth: 7 }))));
  if (st.deco === 'wave') { const x0 = 370 - lastW / 2, y = lastY + fsz * 0.24; let d = `M${x0} ${y}`; for (let x = x0; x < 370 + lastW / 2; x += 40) d += ` q10 -14 20 0 q10 14 20 0`; parts.push(svgOf(G.path(d, o({ stroke: hl === HL.yellow ? '#e0a92a' : ink, strokeWidth: 6, roughness: 0.8 })))); }
  if (st.deco === 'dots') { const w = Math.max(...lines.map(tw)) + 60, y1 = 320 - (lines.length * lh) / 2 - 24, y2 = 320 + (lines.length * lh) / 2 + 14; for (const y of [y1, y2]) for (let x = 370 - w / 2; x <= 370 + w / 2; x += 26) parts.push(`<circle cx="${x}" cy="${y}" r="5" fill="${ink}"/>`); }
  if (st.deco2) parts.push(deco2(st.deco2, 370 + Math.min(300, Math.max(...lines.map(tw)) / 2 + 30), top - fsz * 0.75, ink));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><filter id="cut" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feMorphology in="SourceAlpha" operator="dilate" radius="10" result="d"/><feGaussianBlur in="d" stdDeviation="1" result="b"/><feComponentTransfer in="b" result="m"><feFuncA type="linear" slope="10"/></feComponentTransfer><feFlood flood-color="#fff"/><feComposite in2="m" operator="in" result="w"/><feMerge><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#cut)">${parts.join('')}</g></svg>`;
}

(async () => {
  const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const out = path.resolve(spec.outDir); fs.mkdirSync(out, { recursive: true });
  if (spec.stickers.length !== 24) throw new Error('스티커는 24개여야 함');
  const used = [...new Set(spec.stickers.map((s) => s.font || 'Nanum Pen Script'))];
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: W, height: H } });
  await pg.setContent(`<!doctype html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?${used.map((f) => 'family=' + CSS[f]).join('&')}&display=block" rel="stylesheet"><style>*{margin:0}</style><div id="s"></div>`, { waitUntil: 'networkidle' });
  await pg.evaluate(async (fs1) => { for (const f of fs1) await document.fonts.load(`40px "${f}"`, '가나다라마바사아자차카타파하'); await document.fonts.ready; }, used);
  const files = [];
  for (const [i, st] of spec.stickers.entries()) {
    const w100 = await pg.evaluate(([font, lines]) => { const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'); document.body.appendChild(svg);
      const r = lines.map((l) => { const t = document.createElementNS(ns, 'text'); t.setAttribute('font-family', font); t.setAttribute('font-size', '100'); t.textContent = l; svg.appendChild(t); return t.getComputedTextLength(); }); svg.remove(); return r; }, [st.font || 'Nanum Pen Script', String(st.text).split('\n')]);
    await pg.evaluate((s) => { document.getElementById('s').innerHTML = s; }, sticker(st, i, w100));
    const f = path.join(out, String(i + 1).padStart(2, '0') + '.png');
    await sharp(await pg.locator('#s svg').screenshot({ omitBackground: true })).resize(W, H).png({ compressionLevel: 9 }).toFile(f); files.push(f);
  }
  await b.close();
  const T = { r: 0, g: 0, b: 0, alpha: 0 };
  await sharp(files[spec.main ?? 0]).resize(240, 208, { fit: 'contain', background: T }).extend({ top: 16, bottom: 16, background: T }).png().toFile(path.join(out, 'main.png'));
  await sharp(files[spec.tab ?? spec.main ?? 0]).resize(96, 74, { fit: 'contain', background: T }).png().toFile(path.join(out, 'tab.png'));
  const tiles = await Promise.all(files.map((f) => sharp(f).resize(370, 320).toBuffer()));
  for (const [name, bg] of [['preview.png', '#e8e4dc'], ['preview-dark.png', '#1e1e1e']])
    await sharp({ create: { width: 370 * 6, height: 320 * 4, channels: 3, background: bg } }).composite(tiles.map((t, i) => ({ input: t, left: (i % 6) * 370, top: Math.floor(i / 6) * 320 }))).png().toFile(path.join(out, name));
  for (const f of [...files, path.join(out, 'main.png'), path.join(out, 'tab.png')]) {
    const m = await sharp(f).metadata(), kb = fs.statSync(f).size / 1024, want = f.endsWith('main.png') ? [240, 240] : f.endsWith('tab.png') ? [96, 74] : [W, H];
    if (m.width !== want[0] || m.height !== want[1] || kb > 1024) { console.error('❌ 규격 불일치 ' + path.basename(f)); process.exitCode = 1; }
  }
  console.log(`✅ ${files.length}장 + main + tab · 규격 검사 ${process.exitCode ? '실패' : '통과'} → ${out}`);
})().catch((e) => { console.error('❌ ' + e.message); process.exit(1); });
