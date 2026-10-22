#!/usr/bin/env node
'use strict';
/**
 * OGQ 캐릭터 스티커 생성기 — 다람쥐 '토리' (2026-10-23)
 *   손그림 선: rough.js(MIT) 로 모든 도형을 흔들리는 손선으로 / 글씨: Google Fonts 'Gaegu'(OFL, 상업 이용 가능)
 *   taste-skill 원칙 적용: 그레이디언트·흐린 그림자·기본 폰트·이모지 없음, 색은 주제(다람쥐·도토리·숲)에서
 *   규격: 스티커 740x640 ×24 · 메인 240x240 · 탭 96x74 · PNG 투명 배경 · 흰 컷 라인(다크모드)
 * 사용: node scripts/make_ogq_char.js <spec.json>
 * spec: { outDir, mainSet:[i,i,i,i], tab:i, stickers:[{ text, sub?, face, pose, prop?, color? }] }
 *   face: happy|smile|wink|wow|love|sad|sleepy|smug|cry|yum|shy   pose: wave|up|hold|hug|cheer|point|sit|think|bow|run
 *   prop: acorn|heart|cup|spoon|star|sign|zzz|sweat|note|camera|phone|bag|cake|bowl|magnifier|sparkle|exclaim|question
 */
const fs = require('fs');
const path = require('path');
const rough = require('roughjs');
const { chromium } = require('playwright');
const sharp = require('sharp');

const W = 740, H = 640;
// 색: 다람쥐 털(밤색)·배(크림)·도토리·숲(초록)·하늘(파랑) — 잉크는 검정 대신 짙은 고동색
const K = { fur: '#c98a4b', furD: '#a96b33', belly: '#fbecd3', ink: '#3a2617', cheek: '#f3a29a', acorn: '#a8692f', cap: '#6b4423',
  leaf: '#4f8a5b', sky: '#4a86c5', berry: '#e0565b', sun: '#f2c14e', white: '#ffffff', paper: '#fffaf0' };
const TXT = { leaf: '#2f6b40', sky: '#2c6aa8', berry: '#c23b45', ink: '#3a2617', acorn: '#8a5220' };

let seed = 1;
const G = rough.generator();
const opt = (o = {}) => ({ roughness: 1.1, bowing: 0.8, stroke: K.ink, strokeWidth: 5, fillStyle: 'solid', seed: seed++, ...o });
const toSvg = (dr) => G.toPaths(dr).map((p) => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill || 'none'}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
const ell = (x, y, w, h, o) => toSvg(G.ellipse(x, y, w, h, opt(o)));
const pth = (d, o) => toSvg(G.path(d, opt(o)));
const line = (x1, y1, x2, y2, o) => toSvg(G.line(x1, y1, x2, y2, opt({ strokeWidth: 5, ...o })));
const rot = (svg, a, x, y) => `<g transform="rotate(${a} ${x} ${y})">${svg}</g>`;

// ── 얼굴 ── (머리 중심 cx, cy)
function face(kind, cx, cy) {
  const eL = cx - 42, eR = cx + 42, ey = cy + 4, s = [];
  const dot = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="11" ry="14" fill="${K.ink}"/><circle cx="${x + 4}" cy="${y - 5}" r="4" fill="#fff"/>`;
  const arc = (x, y, up = true) => `<path d="M${x - 13} ${y + (up ? 4 : -4)} Q${x} ${y + (up ? -12 : 12)} ${x + 13} ${y + (up ? 4 : -4)}" stroke="${K.ink}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  if (kind === 'wink') s.push(dot(eL, ey), arc(eR, ey));
  else if (kind === 'happy' || kind === 'yum') s.push(arc(eL, ey), arc(eR, ey));
  else if (kind === 'sleepy') s.push(arc(eL, ey + 2, false), arc(eR, ey + 2, false));
  else if (kind === 'smug') s.push(`<path d="M${eL - 13} ${ey} H${eL + 13}" stroke="${K.ink}" stroke-width="7" stroke-linecap="round"/><path d="M${eR - 13} ${ey} H${eR + 13}" stroke="${K.ink}" stroke-width="7" stroke-linecap="round"/>`);
  else if (kind === 'love') s.push(...[eL, eR].map((x) => `<path d="M${x} ${ey + 10} C${x - 22} ${ey - 4} ${x - 10} ${ey - 20} ${x} ${ey - 8} C${x + 10} ${ey - 20} ${x + 22} ${ey - 4} ${x} ${ey + 10} Z" fill="${K.berry}" stroke="${K.ink}" stroke-width="3"/>`));
  else if (kind === 'wow') s.push(`<circle cx="${eL}" cy="${ey}" r="13" fill="${K.ink}"/><circle cx="${eL + 4}" cy="${ey - 4}" r="4" fill="#fff"/><circle cx="${eR}" cy="${ey}" r="13" fill="${K.ink}"/><circle cx="${eR + 4}" cy="${ey - 4}" r="4" fill="#fff"/>`);
  else if (kind === 'cry' || kind === 'sad') s.push(arc(eL, ey + 2, false), arc(eR, ey + 2, false));
  else s.push(dot(eL, ey), dot(eR, ey)); // smile, shy
  // 볼
  s.push(`<ellipse cx="${cx - 62}" cy="${cy + 30}" rx="17" ry="10" fill="${K.cheek}" opacity=".85"/><ellipse cx="${cx + 62}" cy="${cy + 30}" rx="17" ry="10" fill="${K.cheek}" opacity=".85"/>`);
  // 코·입
  s.push(`<ellipse cx="${cx}" cy="${cy + 26}" rx="8" ry="6" fill="${K.ink}"/>`);
  if (kind === 'wow') s.push(`<ellipse cx="${cx}" cy="${cy + 48}" rx="9" ry="11" fill="${K.ink}"/>`);
  else if (kind === 'sad' || kind === 'cry') s.push(`<path d="M${cx - 12} ${cy + 46} Q${cx} ${cy + 36} ${cx + 12} ${cy + 46}" stroke="${K.ink}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
  else if (kind === 'yum') s.push(`<path d="M${cx - 16} ${cy + 36} Q${cx - 8} ${cy + 46} ${cx} ${cy + 36} Q${cx + 8} ${cy + 46} ${cx + 16} ${cy + 36}" stroke="${K.ink}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M${cx + 4} ${cy + 40} q8 12 14 2" fill="${K.berry}" stroke="${K.ink}" stroke-width="3"/>`);
  else s.push(`<path d="M${cx - 16} ${cy + 36} Q${cx - 8} ${cy + 46} ${cx} ${cy + 36} Q${cx + 8} ${cy + 46} ${cx + 16} ${cy + 36}" stroke="${K.ink}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
  if (kind === 'cry') s.push(`<path d="M${eL - 4} ${ey + 14} q-6 22 4 30 q10 -8 2 -30 z" fill="${K.sky}" stroke="${K.ink}" stroke-width="3"/><path d="M${eR + 4} ${ey + 14} q6 22 -4 30 q-10 -8 -2 -30 z" fill="${K.sky}" stroke="${K.ink}" stroke-width="3"/>`);
  if (kind === 'shy') s.push(`<path d="M${cx - 80} ${cy + 22} l10 -8 M${cx - 70} ${cy + 26} l10 -8 M${cx + 60} ${cy + 22} l10 -8 M${cx + 70} ${cy + 26} l10 -8" stroke="${K.berry}" stroke-width="4" stroke-linecap="round"/>`);
  return s.join('');
}

// ── 소품 ── (x, y 는 손 위치)
function prop(kind, x, y) {
  switch (kind) {
    case 'acorn': return ell(x, y + 8, 52, 60, { fill: K.acorn }) + pth(`M${x - 32} ${y - 6} Q${x} ${y - 34} ${x + 32} ${y - 6} Q${x} ${y + 6} ${x - 32} ${y - 6} Z`, { fill: K.cap }) + line(x, y - 22, x + 6, y - 38, { strokeWidth: 5 });
    case 'heart': return pth(`M${x} ${y + 36} C${x - 60} ${y} ${x - 40} ${y - 44} ${x} ${y - 16} C${x + 40} ${y - 44} ${x + 60} ${y} ${x} ${y + 36} Z`, { fill: K.berry });
    case 'cup': return pth(`M${x - 30} ${y - 28} L${x + 30} ${y - 28} L${x + 24} ${y + 34} L${x - 24} ${y + 34} Z`, { fill: K.white }) + pth(`M${x - 31} ${y - 6} L${x + 29} ${y - 6} L${x + 27} ${y + 12} L${x - 28} ${y + 12} Z`, { fill: K.acorn, strokeWidth: 3 }) + `<path d="M${x - 8} ${y - 40} q6 -10 0 -20 M${x + 8} ${y - 40} q6 -10 0 -20" stroke="${K.ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case 'spoon': return ell(x, y - 30, 30, 40, { fill: '#d9d4c7' }) + line(x, y - 10, x, y + 40, { strokeWidth: 8 });
    case 'star': return pth(`M${x} ${y - 40} L${x + 12} ${y - 12} L${x + 42} ${y - 10} L${x + 18} ${y + 8} L${x + 26} ${y + 38} L${x} ${y + 20} L${x - 26} ${y + 38} L${x - 18} ${y + 8} L${x - 42} ${y - 10} L${x - 12} ${y - 12} Z`, { fill: K.sun });
    case 'bowl': return pth(`M${x - 54} ${y - 6} Q${x} ${y + 70} ${x + 54} ${y - 6} Z`, { fill: K.white }) + ell(x, y - 6, 108, 22, { fill: K.sun, strokeWidth: 4 }) + `<path d="M${x - 18} ${y - 26} q6 -10 0 -20 M${x + 4} ${y - 30} q6 -10 0 -20 M${x + 24} ${y - 26} q6 -10 0 -20" stroke="${K.ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case 'cake': return pth(`M${x - 40} ${y - 6} L${x + 40} ${y - 6} L${x + 40} ${y + 40} L${x - 40} ${y + 40} Z`, { fill: K.paper }) + pth(`M${x - 40} ${y - 6} Q${x} ${y - 30} ${x + 40} ${y - 6} Z`, { fill: K.cheek }) + ell(x, y - 26, 18, 18, { fill: K.berry, strokeWidth: 3 });
    case 'camera': return pth(`M${x - 44} ${y - 22} L${x + 44} ${y - 22} L${x + 44} ${y + 30} L${x - 44} ${y + 30} Z`, { fill: '#5b6b7a' }) + ell(x, y + 4, 40, 40, { fill: '#d6e6f5', strokeWidth: 4 }) + pth(`M${x - 18} ${y - 22} L${x - 10} ${y - 34} L${x + 10} ${y - 34} L${x + 18} ${y - 22}`, { fill: '#5b6b7a', strokeWidth: 4 });
    case 'phone': return pth(`M${x - 22} ${y - 40} L${x + 22} ${y - 40} L${x + 22} ${y + 40} L${x - 22} ${y + 40} Z`, { fill: '#2f3a46' }) + pth(`M${x - 15} ${y - 30} L${x + 15} ${y - 30} L${x + 15} ${y + 26} L${x - 15} ${y + 26} Z`, { fill: '#cfe3f3', strokeWidth: 2 });
    case 'note': return pth(`M${x - 38} ${y - 44} L${x + 38} ${y - 44} L${x + 38} ${y + 40} L${x - 38} ${y + 40} Z`, { fill: K.paper }) + [0, 1, 2].map((i) => line(x - 24, y - 22 + i * 22, x + 24, y - 22 + i * 22, { strokeWidth: 3, stroke: K.sky })).join('');
    case 'bag': return pth(`M${x - 36} ${y - 14} L${x + 36} ${y - 14} L${x + 30} ${y + 44} L${x - 30} ${y + 44} Z`, { fill: K.sun }) + `<path d="M${x - 16} ${y - 14} q16 -36 32 0" stroke="${K.ink}" stroke-width="5" fill="none"/>`;
    case 'magnifier': return ell(x - 6, y - 14, 56, 56, { fill: '#e3f0fb' }) + line(x + 14, y + 8, x + 40, y + 40, { strokeWidth: 10 });
    case 'laptop': return pth(`M${x - 70} ${y - 50} L${x + 70} ${y - 50} L${x + 62} ${y + 30} L${x - 62} ${y + 30} Z`, { fill: '#5b6b7a' }) + pth(`M${x - 56} ${y - 40} L${x + 56} ${y - 40} L${x + 50} ${y + 20} L${x - 50} ${y + 20} Z`, { fill: '#dcebf7', strokeWidth: 3 }) + pth(`M${x - 84} ${y + 30} L${x + 84} ${y + 30} L${x + 92} ${y + 46} L${x - 92} ${y + 46} Z`, { fill: '#8696a6' }) + ell(x, y - 12, 26, 26, { fill: K.leaf, strokeWidth: 3 });
    case 'sign': return '';
    default: return '';
  }
}
// 머리 주변 효과
function fx(kind, cx, cy) {
  switch (kind) {
    case 'zzz': return `<text x="${cx + 110}" y="${cy - 70}" font-family="Gaegu" font-weight="700" font-size="84" fill="${K.sky}" stroke="#fff" stroke-width="8" paint-order="stroke">z</text><text x="${cx + 150}" y="${cy - 120}" font-family="Gaegu" font-weight="700" font-size="64" stroke="#fff" stroke-width="8" paint-order="stroke" fill="${K.sky}">z</text>`;
    case 'sweat': return pth(`M${cx + 108} ${cy - 50} q-16 26 0 34 q16 -8 0 -34 z`, { fill: '#bfe0f7', strokeWidth: 3 });
    case 'sparkle': return [[cx - 130, cy - 60, 22], [cx + 128, cy - 80, 28], [cx + 150, cy + 10, 16]].map(([x, y, r]) => pth(`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`, { fill: K.sun, strokeWidth: 3 })).join('');
    case 'exclaim': return `<text x="${cx + 112}" y="${cy - 40}" font-family="Gaegu" font-weight="700" font-size="96" fill="${K.berry}" stroke="${K.ink}" stroke-width="2">!</text>`;
    case 'question': return `<text x="${cx + 108}" y="${cy - 40}" font-family="Gaegu" font-weight="700" font-size="96" fill="${K.sky}" stroke="${K.ink}" stroke-width="2">?</text>`;
    case 'hearts': return pth(`M${cx + 130} ${cy - 40} c-20 -14 -14 -34 0 -22 c14 -12 20 8 0 22 z`, { fill: K.berry, strokeWidth: 3 }) + pth(`M${cx - 136} ${cy - 70} c-14 -10 -10 -24 0 -16 c10 -8 14 6 0 16 z`, { fill: K.berry, strokeWidth: 3 });
    default: return '';
  }
}

// ── 다람쥐 본체 ── cx: 몸 중심 x, by: 발 바닥 y, sc: 배율
function squirrel(st, cx, by) {
  const hx = cx, hy = by - 225; // 머리 중심
  const out = [];
  const MK = st.char === 'monkey'; // 원숭이 '팜이' (오리지널 — 특정 IP 를 닮지 않게: 갈색 털, 소용돌이 꼬리+도토리, 머리털 세 가닥+잎)
  const F = MK ? { fur: '#a8683f', furD: '#7f4a2b', belly: '#f7dcc0' } : { fur: K.fur, furD: K.furD, belly: K.belly };
  const tx = cx + 70, ty = by - 40;
  if (MK) {
    out.push(pth(`M${cx + 60} ${by - 40} C${cx + 170} ${by - 30} ${cx + 200} ${by - 150} ${cx + 160} ${by - 220} C${cx + 130} ${by - 270} ${cx + 70} ${by - 250} ${cx + 80} ${by - 210} C${cx + 88} ${by - 180} ${cx + 128} ${by - 186} ${cx + 126} ${by - 214}`, { strokeWidth: 22, stroke: K.ink, fill: 'none', roughness: 0.6 }));
    out.push(pth(`M${cx + 60} ${by - 40} C${cx + 170} ${by - 30} ${cx + 200} ${by - 150} ${cx + 160} ${by - 220} C${cx + 130} ${by - 270} ${cx + 70} ${by - 250} ${cx + 80} ${by - 210} C${cx + 88} ${by - 180} ${cx + 128} ${by - 186} ${cx + 126} ${by - 214}`, { strokeWidth: 13, stroke: F.fur, fill: 'none', roughness: 0.6 }));
  } else out.push(pth(`M${tx - 10} ${ty} C${tx + 120} ${ty + 10} ${tx + 150} ${ty - 140} ${tx + 90} ${ty - 210} C${tx + 50} ${ty - 260} ${tx - 20} ${ty - 230} ${tx + 10} ${ty - 180} C${tx + 30} ${ty - 150} ${tx + 70} ${ty - 160} ${tx + 60} ${ty - 120} C${tx + 50} ${ty - 70} ${tx - 30} ${ty - 70} ${tx - 10} ${ty} Z`, { fill: K.furD }));
  if (!MK) out.push(pth(`M${tx + 40} ${ty - 40} C${tx + 90} ${ty - 70} ${tx + 100} ${ty - 140} ${tx + 74} ${ty - 180}`, { strokeWidth: 4, stroke: '#8a5526' }));
  // 몸
  out.push(ell(cx, by - 78, 170, 150, { fill: F.fur }));
  out.push(ell(cx, by - 70, 104, 108, { fill: F.belly, strokeWidth: 0, stroke: 'none' }));
  // 발
  out.push(ell(cx - 46, by - 8, 62, 30, { fill: F.furD }), ell(cx + 46, by - 8, 62, 30, { fill: F.furD }));
  // 팔 (포즈별)
  const front = []; // 머리보다 위로 올린 팔은 머리 다음에 그려야 보인다
  const arm = (x, y, a) => rot(ell(x, y, 34, 66, { fill: F.fur }), a, x, y);
  const P = st.pose || 'wave';
  let hand = [cx + 70, by - 120];
  if (P === 'wave') { out.push(arm(cx - 70, by - 100, 30)); front.push(arm(cx + 104, by - 196, -150)); hand = [cx + 110, by - 205]; }
  else if (P === 'up' || P === 'cheer') { front.push(arm(cx - 104, by - 196, 150), arm(cx + 104, by - 196, -150)); hand = [cx + 110, by - 205]; }
  else if (P === 'hold' || P === 'hug') { out.push(arm(cx - 44, by - 104, -50), arm(cx + 44, by - 104, 50)); hand = [cx, by - 96]; }
  else if (P === 'point') { out.push(arm(cx - 70, by - 100, 30), arm(cx + 100, by - 130, -100)); hand = [cx + 136, by - 136]; }
  else if (P === 'think') { out.push(arm(cx - 70, by - 100, 30)); front.push(arm(cx + 52, by - 160, 150)); hand = [cx + 30, by - 175]; }
  else if (P === 'bow') { out.push(arm(cx - 40, by - 96, -30), arm(cx + 40, by - 96, 30)); hand = [cx, by - 80]; }
  else if (P === 'run') { out.push(arm(cx - 84, by - 120, 70), arm(cx + 84, by - 90, -40)); hand = [cx + 104, by - 70]; }
  else { out.push(arm(cx - 70, by - 100, 30), arm(cx + 70, by - 100, -30)); hand = [cx + 80, by - 80]; }
  // 머리
  const headTilt = P === 'think' ? -8 : P === 'bow' ? 10 : 0;
  const head = [];
  if (MK) {
    head.push(ell(hx - 118, hy + 6, 70, 76, { fill: F.fur }), ell(hx - 118, hy + 8, 38, 44, { fill: F.belly, strokeWidth: 0, stroke: 'none' }), ell(hx + 118, hy + 6, 70, 76, { fill: F.fur }), ell(hx + 118, hy + 8, 38, 44, { fill: F.belly, strokeWidth: 0, stroke: 'none' }));
  } else {
  head.push(pth(`M${hx - 86} ${hy - 50} L${hx - 70} ${hy - 128} L${hx - 30} ${hy - 82} Z`, { fill: K.fur }), pth(`M${hx + 86} ${hy - 50} L${hx + 70} ${hy - 128} L${hx + 30} ${hy - 82} Z`, { fill: K.fur }));
  head.push(`<path d="M${hx - 70} ${hy - 128} l-8 -16 M${hx - 70} ${hy - 128} l4 -18 M${hx + 70} ${hy - 128} l8 -16 M${hx + 70} ${hy - 128} l-4 -18" stroke="${K.ink}" stroke-width="5" stroke-linecap="round"/>`);
  }
  head.push(ell(hx, hy, 230, 196, { fill: F.fur }));
  if (MK) { // 하트 모양 얼굴 가면 + 머리털 세 가닥 + 잎
    head.push(pth(`M${hx} ${hy - 30} C${hx - 30} ${hy - 70} ${hx - 100} ${hy - 50} ${hx - 92} ${hy + 10} C${hx - 86} ${hy + 70} ${hx - 30} ${hy + 84} ${hx} ${hy + 84} C${hx + 30} ${hy + 84} ${hx + 86} ${hy + 70} ${hx + 92} ${hy + 10} C${hx + 100} ${hy - 50} ${hx + 30} ${hy - 70} ${hx} ${hy - 30} Z`, { fill: F.belly, strokeWidth: 0, stroke: 'none', roughness: 0.5 }));
    head.push(`<path d="M${hx - 14} ${hy - 96} q-6 -34 -26 -40 M${hx} ${hy - 98} q2 -38 -6 -52 M${hx + 14} ${hy - 96} q14 -30 34 -34" stroke="${K.ink}" stroke-width="6" fill="none" stroke-linecap="round"/>`);
    head.push(rot(pth(`M${hx + 30} ${hy - 128} Q${hx + 62} ${hy - 168} ${hx + 96} ${hy - 136} Q${hx + 62} ${hy - 110} ${hx + 30} ${hy - 128} Z`, { fill: K.leaf, strokeWidth: 4 }), -10, hx + 30, hy - 128));
  } else head.push(ell(hx, hy + 36, 132, 90, { fill: K.belly, strokeWidth: 0, stroke: 'none' }));
  head.push(face(st.face || 'smile', hx, hy));
  out.push(rot(head.join(''), headTilt, hx, hy + 80));
  out.push(...front);
  // 손에 든 소품 (몸 앞)
  if (st.prop && !['zzz', 'sweat', 'sparkle', 'exclaim', 'question', 'hearts'].includes(st.prop)) out.push(`<g transform="translate(${hand[0]} ${hand[1]}) scale(1.35) translate(${-hand[0]} ${-hand[1]})">${prop(st.prop, hand[0], hand[1])}</g>`); // 소품은 1.35배 (작으면 모바일에서 안 보임)
  out.push(fx(st.prop, hx, hy));
  if (st.fx) out.push(fx(st.fx, hx, hy));
  return out.join('');
}

// 글씨: 한 줄 또는 두 줄, 손글씨 굵게 + 흰 테두리
function caption(text, sub, color, y0) {
  const lines = String(text).split('\n');
  const n = Math.max(...lines.map((l) => [...l].length));
  const fs1 = Math.min(lines.length > 1 ? 104 : 126, Math.floor(680 / Math.max(1, n * 0.92)));
  const c = TXT[color] || TXT.ink;
  const t = lines.map((l, i) => `<text x="370" y="${y0 + i * fs1 * 0.95}" text-anchor="middle" font-family="Gaegu" font-weight="700" font-size="${fs1}" fill="${c}" stroke="#fff" stroke-width="16" paint-order="stroke" stroke-linejoin="round">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`).join('');
  const s = sub ? `<text x="370" y="${y0 + lines.length * fs1 * 0.95 - fs1 * 0.25}" text-anchor="middle" font-family="Gaegu" font-weight="700" font-size="46" fill="${K.ink}" stroke="#fff" stroke-width="12" paint-order="stroke">${sub}</text>` : '';
  return t + s;
}

function stickerSvg(st, i) {
  seed = 1000 + i * 97; // 같은 스티커는 같은 손선 (재생성해도 동일)
  const twoLine = String(st.text).includes('\n');
  // 캐릭터 원본 크기: x -115~+235 (꼬리 포함), y -378~+10 → 글자 아래 남은 공간에 꽉 차게 배율 계산
  const textBottom = twoLine ? 232 : 150, bottom = 624;
  const sc = Math.min(1.32, (bottom - textBottom) / 390), midX = 48;
  const body = `<g transform="translate(${370 - midX * sc} ${bottom - 10 * sc}) scale(${sc})">${squirrel(st, 0, 0)}</g>` + caption(st.text, st.sub, st.color, twoLine ? 100 : 122);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><filter id="cut" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feMorphology in="SourceAlpha" operator="dilate" radius="12" result="d"/><feGaussianBlur in="d" stdDeviation="1" result="b"/><feComponentTransfer in="b" result="m"><feFuncA type="linear" slope="10"/></feComponentTransfer><feFlood flood-color="#fff"/><feComposite in2="m" operator="in" result="w"/><feMerge><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<g filter="url(#cut)">${body}</g></svg>`;
}

const FONT = '<link href="https://fonts.googleapis.com/css2?family=Gaegu:wght@700&display=block" rel="stylesheet">';
(async () => {
  const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const out = path.resolve(spec.outDir); fs.mkdirSync(out, { recursive: true });
  if (spec.stickers.length !== 24) throw new Error('스티커는 24개여야 함 (현재 ' + spec.stickers.length + ')');
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: W, height: H } });
  await pg.setContent(`<!doctype html><meta charset="utf-8">${FONT}<style>*{margin:0}body{background:transparent}</style><div id="s"></div>`, { waitUntil: 'networkidle' });
  await pg.evaluate(async () => { await document.fonts.load('700 40px Gaegu', '가나다'); await document.fonts.ready; });
  const files = [];
  for (const [i, st] of spec.stickers.entries()) {
    await pg.evaluate((svg) => { document.getElementById('s').innerHTML = svg; }, stickerSvg(st, i));
    const f = path.join(out, String(i + 1).padStart(2, '0') + '.png');
    const buf = await pg.locator('#s svg').screenshot({ omitBackground: true });
    await sharp(buf).resize(W, H).png({ compressionLevel: 9 }).toFile(f); files.push(f);
  }
  await b.close();
  // 메인 240: 대표 1장 크게 / 탭 96x74
  const mainIdx = spec.main ?? 0;
  await sharp(files[mainIdx]).resize(240, 208, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).extend({ top: 16, bottom: 16, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(out, 'main.png'));
  await sharp(files[spec.tab ?? mainIdx]).resize(96, 74, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(out, 'tab.png'));
  const tiles = await Promise.all(files.map((f) => sharp(f).resize(370, 320).toBuffer()));
  for (const [name, bg] of [['preview.png', '#e8e4dc'], ['preview-dark.png', '#1e1e1e']])
    await sharp({ create: { width: 370 * 6, height: 320 * 4, channels: 3, background: bg } }).composite(tiles.map((t, i) => ({ input: t, left: (i % 6) * 370, top: Math.floor(i / 6) * 320 }))).png().toFile(path.join(out, name));
  for (const f of [...files, path.join(out, 'main.png'), path.join(out, 'tab.png')]) {
    const m = await sharp(f).metadata(), kb = fs.statSync(f).size / 1024;
    const want = f.endsWith('main.png') ? [240, 240] : f.endsWith('tab.png') ? [96, 74] : [W, H];
    if (m.width !== want[0] || m.height !== want[1] || kb > 1024) { console.error('❌ 규격 불일치 ' + path.basename(f)); process.exitCode = 1; }
  }
  console.log(`✅ ${files.length}장 + main + tab · 규격 검사 ${process.exitCode ? '실패' : '통과'} → ${out}`);
})().catch((e) => { console.error('❌ ' + e.message); process.exit(1); });
