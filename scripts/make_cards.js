#!/usr/bin/env node
'use strict';
/**
 * 카드 이미지 생성기 (1080x1080, 블로그 공통 팔레트) — 스펙 JSON 하나로 글 카드 전부 만든다.
 * 사용: node scripts/make_cards.js <spec.json>
 * 스펙: { "outDir": "assets/cards", "cards": [ { "file": "x.png", "type": "...", ... } ] }
 *   type "hero"   : tag, title[], sub, boxLabel, boxValue, boxNote, source
 *   type "list"   : tag, title[], items[{ n, head, subs[], accent? }]   (최대 3개)
 *   type "check"  : tag, title[], items[[head, sub]]                    (최대 6개)
 *   type "steps"  : tag, title[], steps[{ label, value, accent? }], note  (가로 막대 흐름, 최대 4개)
 * 사실 규칙: 카드 문구도 출처 있는 숫자만 (data/photo-guide.md).
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const F = 'Malgun Gothic, 맑은 고딕, sans-serif';
const NAVY = '#1d2a44', ORANGE = '#e8a33d', RED = '#c9562b', BG = '#f5f0e6', GRAY = '#4a5568';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const frame = (body, tag) => `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080">
<rect width="1080" height="1080" fill="${BG}"/>
<rect x="64" y="76" rx="26" width="${tag.length * 24 + 56}" height="52" fill="${ORANGE}"/>
<text x="92" y="111" font-family="${F}" font-size="24" font-weight="700" fill="${NAVY}">${esc(tag)}</text>
${body}
<rect y="994" width="1080" height="86" fill="${NAVY}"/>
<text x="64" y="1046" font-family="${F}" font-size="26" font-weight="700" fill="#fff">에이팜의 이야기 보따리</text>
<text x="1016" y="1046" text-anchor="end" font-family="${F}" font-size="22" fill="#c8cfdb">생활경제 원문 정리</text>
</svg>`;
const title = (lines, y0 = 210) => lines.map((l, i) =>
  `<text x="64" y="${y0 + i * 82}" font-family="${F}" font-size="64" font-weight="800" fill="${NAVY}">${esc(l)}</text>`).join('');
const item = (y, h, n, head, subs, accent) => {
  const color = accent ? RED : NAVY, bar = accent ? RED : ORANGE;
  return `
<rect x="64" y="${y}" rx="28" width="952" height="${h}" fill="${bar}"/>
<rect x="78" y="${y}" rx="28" width="938" height="${h}" fill="#fff"/>
<rect x="78" y="${y}" width="30" height="${h}" fill="#fff"/>
<circle cx="156" cy="${y + h / 2}" r="42" fill="${color}"/>
<text x="156" y="${y + h / 2 + 15}" text-anchor="middle" font-family="${F}" font-size="40" font-weight="800" fill="#fff">${esc(n)}</text>
<text x="230" y="${y + 62}" font-family="${F}" font-size="36" font-weight="800" fill="${NAVY}">${esc(head)}</text>
${subs.map((s, i) => `<text x="230" y="${y + 108 + i * 38}" font-family="${F}" font-size="26" fill="${GRAY}">${esc(s)}</text>`).join('')}`;
};

const render = {
  hero: (c) => frame(`
${title(c.title, 240)}
<text x="64" y="420" font-family="${F}" font-size="34" fill="${GRAY}">${esc(c.sub || '')}</text>
<rect x="64" y="490" rx="32" width="952" height="400" fill="#fff"/>
<text x="540" y="590" text-anchor="middle" font-family="${F}" font-size="34" fill="${GRAY}">${esc(c.boxLabel || '')}</text>
<text x="540" y="700" text-anchor="middle" font-family="${F}" font-size="92" font-weight="800" fill="${RED}">${esc(c.boxValue || '')}</text>
<text x="540" y="800" text-anchor="middle" font-family="${F}" font-size="32" fill="${NAVY}">${esc(c.boxNote || '')}</text>
<text x="540" y="850" text-anchor="middle" font-family="${F}" font-size="24" fill="${GRAY}">${esc(c.source ? '출처: ' + c.source : '')}</text>`, c.tag),
  list: (c) => {
    const n = c.items.length, h = 180, gap = 25, y0 = 370;
    return frame(`${title(c.title)}${c.items.map((it, i) => item(y0 + i * (h + gap), h, it.n, it.head, it.subs || [], it.accent)).join('')}`, c.tag);
  },
  check: (c) => frame(`
${title(c.title)}
<rect x="64" y="360" rx="32" width="952" height="590" fill="#fff"/>
${c.items.map(([h, s], i) => `
<text x="110" y="${430 + i * 88}" font-family="${F}" font-size="30" font-weight="800" fill="${ORANGE}">✔</text>
<text x="160" y="${430 + i * 88}" font-family="${F}" font-size="30" font-weight="800" fill="${NAVY}">${esc(h)}</text>
<text x="160" y="${468 + i * 88}" font-family="${F}" font-size="23" fill="${GRAY}">${esc(s)}</text>`).join('')}`, c.tag),
  steps: (c) => {
    const n = c.steps.length, w = 952, gap = 20, bw = (w - gap * (n - 1)) / n;
    const nums = c.steps.map((s) => parseFloat(String(s.value).replace(/[^\d.]/g, '')) || 0);
    const max = Math.max(...nums), min = Math.min(...nums) * 0.85;
    return frame(`
${title(c.title)}
${c.steps.map((s, i) => {
    const x = 64 + i * (bw + gap), hh = 120 + ((nums[i] - min) / (max - min || 1)) * 280, y = 860 - hh;
    const fill = s.accent ? RED : i === n - 1 ? ORANGE : '#c9cfdb';
    return `<rect x="${x}" y="${y}" rx="18" width="${bw}" height="${hh}" fill="${fill}"/>
<text x="${x + bw / 2}" y="${y - 22}" text-anchor="middle" font-family="${F}" font-size="44" font-weight="800" fill="${NAVY}">${esc(s.value)}</text>
<text x="${x + bw / 2}" y="905" text-anchor="middle" font-family="${F}" font-size="26" font-weight="700" fill="${NAVY}">${esc(s.label)}</text>`;
  }).join('')}
<text x="64" y="960" font-family="${F}" font-size="22" fill="${GRAY}">${esc(c.note || '')}</text>`, c.tag);
  },
};

(async () => {
  const specFile = process.argv[2];
  if (!specFile) { console.error('사용: node scripts/make_cards.js <spec.json>'); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  const outDir = path.resolve(spec.outDir || 'assets/cards');
  fs.mkdirSync(outDir, { recursive: true });
  for (const c of spec.cards) {
    if (!render[c.type]) throw new Error('알 수 없는 카드 type: ' + c.type);
    await sharp(Buffer.from(render[c.type](c))).png().toFile(path.join(outDir, c.file));
    console.log('ok', c.file);
  }
})().catch((e) => { console.error('❌ ' + e.message); process.exit(1); });
