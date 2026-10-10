#!/usr/bin/env node
'use strict';
/**
 * 사진 개인정보 모자이크.
 *
 * 사용: node scripts/mosaic.js drafts/<이름>.mosaic.json
 *
 * spec 형식:
 * {
 *   "pad": 0.15,                 // 선택 — 영역 크기 대비 상하좌우 여유 (기본 0.15)
 *   "block": 0.06,               // 선택 — 모자이크 칸 크기(영역 짧은 변 대비 비율, 기본 0.06, 최소 8px)
 *   "items": [
 *     { "src": "input/photos/a.jpg",
 *       "regions": [ { "x": 0.41, "y": 0.22, "w": 0.10, "h": 0.14, "reason": "타인 얼굴" } ] }
 *   ]
 * }
 * 좌표: 0~1 상대값, 기준은 "EXIF 회전 보정 후 화면에 보이는 그대로"의 사진.
 *
 * 규칙:
 *  - 처리본은 input/photos/_mosaic/<원본파일명> 에 저장. 원본은 절대 덮어쓰지 않는다.
 *  - sharp 는 한 파이프라인에서 resize 가 1회만 적용된다 → 축소→버퍼→확대(nearest) 2단계로 분리.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'input', 'photos', '_mosaic');
const abs = (p) => (path.isAbsolute(p) ? p : path.join(ROOT, p));

async function pixelate(srcBuf, rect, blockPx) {
  const smallW = Math.max(1, Math.round(rect.width / blockPx));
  const smallH = Math.max(1, Math.round(rect.height / blockPx));
  // 1단계: 잘라서 축소 → 버퍼
  const small = await sharp(srcBuf).extract(rect).resize(smallW, smallH, { kernel: 'cubic', fit: 'fill' }).toBuffer();
  // 2단계: 별도 파이프라인에서 nearest 로 확대
  return sharp(small).resize(rect.width, rect.height, { kernel: 'nearest', fit: 'fill' }).toBuffer();
}

async function processItem(item, opts) {
  const src = abs(item.src);
  if (!fs.existsSync(src)) throw new Error(`원본 없음: ${item.src}`);
  // EXIF 회전 보정을 먼저 적용해 "보이는 화면" 좌표계로 맞춘다
  const oriented = await sharp(src).rotate().toBuffer();
  const meta = await sharp(oriented).metadata();
  const W = meta.width;
  const H = meta.height;

  const composites = [];
  const report = [];
  for (const r of item.regions || []) {
    const padX = r.w * opts.pad;
    const padY = r.h * opts.pad;
    const x0 = Math.max(0, Math.floor((r.x - padX) * W));
    const y0 = Math.max(0, Math.floor((r.y - padY) * H));
    const x1 = Math.min(W, Math.ceil((r.x + r.w + padX) * W));
    const y1 = Math.min(H, Math.ceil((r.y + r.h + padY) * H));
    const rect = { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
    if (rect.width < 2 || rect.height < 2) { report.push(`  ⚠️ 영역이 너무 작아 건너뜀: ${JSON.stringify(r)}`); continue; }
    const blockPx = Math.max(8, Math.round(Math.min(rect.width, rect.height) * opts.block));
    composites.push({ input: await pixelate(oriented, rect, blockPx), left: rect.left, top: rect.top });
    report.push(`  - ${r.reason || '사유 미기재'}: ${rect.width}×${rect.height}px @(${rect.left},${rect.top}) 칸 ${blockPx}px`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, path.basename(src));
  if (path.resolve(out) === path.resolve(src)) throw new Error('출력 경로가 원본과 같습니다 — 원본 덮어쓰기 금지');
  let pipe = sharp(oriented).composite(composites);
  const ext = path.extname(out).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') pipe = pipe.jpeg({ quality: 90 });
  else if (ext === '.png') pipe = pipe.png();
  else if (ext === '.webp') pipe = pipe.webp({ quality: 90 });
  await pipe.toFile(out);
  return { out, size: `${W}×${H}`, count: composites.length, report };
}

(async () => {
  const specFile = process.argv[2];
  if (!specFile) { console.error('사용법: node scripts/mosaic.js drafts/<이름>.mosaic.json'); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(abs(specFile), 'utf8'));
  const opts = { pad: spec.pad ?? 0.15, block: spec.block ?? 0.06 };
  let photos = 0;
  let regions = 0;
  for (const item of spec.items || []) {
    try {
      const r = await processItem(item, opts);
      photos++; regions += r.count;
      console.log(`✅ ${item.src} (${r.size}) → ${path.relative(ROOT, r.out)} [${r.count}개 영역]`);
      r.report.forEach((l) => console.log(l));
    } catch (e) {
      console.error(`❌ ${item.src}: ${e.message}`);
      process.exitCode = 1;
    }
  }
  console.log(`\n모자이크 처리: 사진 ${photos}장 · 영역 ${regions}개. 처리본을 Read 로 열어 실제로 가려졌는지 반드시 확인하세요.`);
})();
