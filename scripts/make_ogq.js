#!/usr/bin/env node
'use strict';
/**
 * OGQ 스티커 세트 생성 — 공식 규격(OGQ 고객센터 2026-10-21 확인):
 *   메인 240x240 1장 · 스티커 740x640 24장 · 탭 96x74 1장 · PNG · RGB · 각 1MB 이하
 * 사용: node scripts/make_ogq.js <spec.json>   → spec.outDir 에 main.png, tab.png, 01~24.png, preview.png
 * spec: { outDir, stickers: [{ text, style, sub? }] (24개) }  style: pill|tag|bubble|stamp|note|marker
 * ⚠️ OGQ 약관 제25조: 등록 시 AI 활용 여부·범위 표기 (이 세트는 Claude 가 코드로 그린 것).
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const F = 'Malgun Gothic, 맑은 고딕, sans-serif';
const C = { navy: '#1d2a44', orange: '#e8a33d', red: '#c9562b', beige: '#f5f0e6', white: '#ffffff', gray: '#4a5568' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const W = 740, H = 640;

// 글자 수에 맞춰 크기 자동 조절 (한 줄)
const fit = (text, maxW, base) => Math.min(base, Math.floor(maxW / Math.max(1, [...text].length * 0.98)));
const shadow = `<filter id="sh" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#1d2a44" flood-opacity=".22"/></filter>`;

const styles = {
  pill: ({ text, sub }, accent) => {
    const fs1 = fit(text, 560, 120);
    return `<g filter="url(#sh)"><rect x="50" y="${sub ? 170 : 200}" rx="120" width="640" height="${sub ? 300 : 240}" fill="${accent}"/></g>
<text x="370" y="${sub ? 330 : 320 + fs1 * 0.35}" text-anchor="middle" font-family="${F}" font-size="${fs1}" font-weight="800" fill="${C.white}">${esc(text)}</text>
${sub ? `<text x="370" y="420" text-anchor="middle" font-family="${F}" font-size="44" font-weight="700" fill="${C.white}" opacity=".9">${esc(sub)}</text>` : ''}`;
  },
  tag: ({ text }, accent) => {
    const fs1 = fit(text, 500, 116);
    return `<g filter="url(#sh)"><path d="M60 190 H600 L690 320 L600 450 H60 Q40 450 40 430 V210 Q40 190 60 190 Z" fill="${accent}"/></g>
<circle cx="110" cy="320" r="22" fill="${C.beige}"/>
<text x="370" y="${320 + fs1 * 0.35}" text-anchor="middle" font-family="${F}" font-size="${fs1}" font-weight="800" fill="${C.white}">${esc(text)}</text>`;
  },
  bubble: ({ text, sub }, accent) => {
    const fs1 = fit(text, 540, 112);
    return `<g filter="url(#sh)"><path d="M90 130 H650 Q700 130 700 180 V420 Q700 470 650 470 H300 L200 560 L220 470 H90 Q40 470 40 420 V180 Q40 130 90 130 Z" fill="${C.white}" stroke="${accent}" stroke-width="16"/></g>
<text x="370" y="${sub ? 290 : 300 + fs1 * 0.35}" text-anchor="middle" font-family="${F}" font-size="${fs1}" font-weight="800" fill="${C.navy}">${esc(text)}</text>
${sub ? `<text x="370" y="390" text-anchor="middle" font-family="${F}" font-size="46" font-weight="700" fill="${accent}">${esc(sub)}</text>` : ''}`;
  },
  stamp: ({ text, sub }, accent) => {
    const fs1 = fit(text, 380, 108);
    return `<g transform="rotate(-12 370 320)">
<circle cx="370" cy="320" r="250" fill="none" stroke="${accent}" stroke-width="22"/>
<circle cx="370" cy="320" r="215" fill="none" stroke="${accent}" stroke-width="6"/>
<text x="370" y="${sub ? 320 : 320 + fs1 * 0.35}" text-anchor="middle" font-family="${F}" font-size="${fs1}" font-weight="900" fill="${accent}">${esc(text)}</text>
${sub ? `<text x="370" y="410" text-anchor="middle" font-family="${F}" font-size="50" font-weight="800" fill="${accent}">${esc(sub)}</text>` : ''}</g>`;
  },
  note: ({ text, sub }, accent) => {
    // 긴 문구는 가운데 띄어쓰기에서 두 줄로
    const words = text.split(" "); let lines = [text];
    if ([...text].length > 5 && words.length > 1) {
      let best = 1, diff = 1e9;
      for (let k = 1; k < words.length; k++) { const d = Math.abs(words.slice(0, k).join(" ").length - words.slice(k).join(" ").length); if (d < diff) { diff = d; best = k; } }
      lines = [words.slice(0, best).join(" "), words.slice(best).join(" ")];
    }
    const fs1 = Math.min(...lines.map((l) => fit(l, 440, 108)));
    const lh = fs1 * 1.2, y0 = 330 - ((lines.length - 1) * lh) / 2 + fs1 * 0.35 - (sub ? 30 : 0);
    return `<g transform="rotate(-4 370 320)"><g filter="url(#sh)"><rect x="110" y="110" width="520" height="440" rx="10" fill="${C.beige}"/></g>
<rect x="290" y="80" width="160" height="62" rx="6" fill="${accent}" opacity=".85"/>
${lines.map((l, i) => `<text x="370" y="${y0 + i * lh}" text-anchor="middle" font-family="${F}" font-size="${fs1}" font-weight="800" fill="${C.navy}">${esc(l)}</text>`).join("")}
${sub ? `<text x="370" y="${y0 + lines.length * lh}" text-anchor="middle" font-family="${F}" font-size="44" font-weight="700" fill="${C.gray}">${esc(sub)}</text>` : ""}</g>`;
  },
  marker: ({ text }, accent) => {
    const fs1 = fit(text, 600, 124);
    const tw = Math.min(660, [...text].length * fs1 * 0.98 + 40);
    const base = 320 + fs1 * 0.38;
    return `<rect x="${370 - tw / 2}" y="${base - fs1 * 0.5}" width="${tw}" height="${fs1 * 0.68}" rx="${fs1 * 0.12}" fill="${accent}" opacity=".45"/>
<text x="370" y="${base}" text-anchor="middle" font-family="${F}" font-size="${fs1}" font-weight="900" fill="${C.navy}">${esc(text)}</text>`;
  },
};
const ACC = [C.navy, C.orange, C.red];
const svg = (w, h, body, vb = `0 0 ${W} ${H}`) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}"><defs>${shadow}</defs>${body}</svg>`;
const sticker = (s, i) => (styles[s.style] || styles.pill)(s, s.accent ? C[s.accent] : ACC[i % 3]);

(async () => {
  const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const out = path.resolve(spec.outDir);
  fs.mkdirSync(out, { recursive: true });
  if (spec.stickers.length !== 24) throw new Error(`스티커는 24개여야 함 (현재 ${spec.stickers.length})`);
  const files = [];
  for (const [i, s] of spec.stickers.entries()) {
    const file = path.join(out, String(i + 1).padStart(2, '0') + '.png');
    await sharp(Buffer.from(svg(W, H, sticker(s, i)))).png({ compressionLevel: 9 }).toFile(file);
    files.push(file);
  }
  // 메인 240x240: 대표 스티커 4개 2x2 (spec.mainSet, 기본 0·4·6·13)
  const set = spec.mainSet || [0, 4, 6, 13];
  const mt = await Promise.all(set.map((k) => sharp(files[k]).resize(120, 104).toBuffer()));
  await sharp({ create: { width: 240, height: 240, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(mt.map((b, i) => ({ input: b, left: (i % 2) * 120, top: 16 + Math.floor(i / 2) * 104 }))).png().toFile(path.join(out, 'main.png'));
  // 탭 96x74
  const tb = spec.tab ?? 0;
  await sharp(Buffer.from(svg(96, 74, sticker(spec.stickers[tb], tb), `20 60 700 540`))).png().toFile(path.join(out, 'tab.png'));
  // 검수용 미리보기 6x4 (회색 바탕)
  const tiles = await Promise.all(files.map((f) => sharp(f).resize(370, 320).toBuffer()));
  await sharp({ create: { width: 370 * 6, height: 320 * 4, channels: 3, background: '#dfe3ea' } })
    .composite(tiles.map((b, i) => ({ input: b, left: (i % 6) * 370, top: Math.floor(i / 6) * 320 }))).png().toFile(path.join(out, 'preview.png'));
  // 규격 검증
  for (const f of [...files, path.join(out, 'main.png'), path.join(out, 'tab.png')]) {
    const meta = await sharp(f).metadata(); const kb = fs.statSync(f).size / 1024;
    const want = f.endsWith('main.png') ? [240, 240] : f.endsWith('tab.png') ? [96, 74] : [W, H];
    const ok = meta.width === want[0] && meta.height === want[1] && kb <= 1024 && meta.format === 'png';
    if (!ok) { console.error(`❌ 규격 불일치 ${path.basename(f)} ${meta.width}x${meta.height} ${kb.toFixed(0)}KB`); process.exitCode = 1; }
  }
  console.log(`✅ ${files.length}장 + main + tab 생성 · 규격 검사 ${process.exitCode ? '실패' : '통과'} → ${out}`);
})().catch((e) => { console.error('❌ ' + e.message); process.exit(1); });
