#!/usr/bin/env node
'use strict';
/**
 * 초안 JSON → 네이버 블로그 스마트에디터 ONE 자동 입력 → 임시저장 (발행 절대 안 함).
 *
 * 사용:
 *   node scripts/naver_draft.js drafts/xxx.json              # 입력 + 임시저장 + 검증
 *   node scripts/naver_draft.js drafts/xxx.json --dry-run    # 저장 클릭만 생략 (셀렉터 디버깅 중엔 항상 이것부터)
 *   node scripts/naver_draft.js drafts/xxx.json --validate-only   # 브라우저 없이 JSON 검증만
 *   옵션: --keep-open (끝나고 Enter 칠 때까지 브라우저 유지)
 *
 * 순서 (실측 기반, 바꾸지 말 것):
 *   가드 설치 → 팝업 정리 → 본문 전체(첫 text 직후 동영상, 맨 끝 지도) → 첫 줄 보정 → 제목(맨 마지막)
 *   → 태그(발행 패널 열기·Escape로 닫기) → 임시저장 → 텍스트 덤프 + 스크린샷 대조 → "자동 처리 결과" 출력
 *
 * 산출물: drafts/<이름>.dump.txt, drafts/<이름>.png, drafts/<이름>.manual.txt, drafts/<이름>.result.json
 */
const fs = require('fs');
const path = require('path');
const {
  launchBrowser, installPublishGuard, guardStatus, isLoginPage, getEditorFrame, waitForEnter,
  WRITE_URL, REAL_PUBLISH_SELECTOR,
} = require('./lib/common');
const { loadDraft, expectedPieces, norm, manualManuscript, resolvePath } = require('./lib/draft');

// ───────────────────────── 셀렉터 ─────────────────────────
// [실측] = 2026-10 확인된 값. [미실측] = 첫 실행 때 probe 로 확인 후 CLAUDE.md 에 기록할 것.
const SEL = {
  title: '.se-title-text', // [실측]
  bodyPara: '.se-section-text p.se-text-paragraph', // [실측] 범위를 넓히면 제목 오염
  draftPopupCancel: '.se-popup-button-cancel', // [실측] "작성 중인 글" → 새로 쓰기
  helpClose: '.se-help-panel-close-button', // [실측]
  imageBtn: 'button.se-image-toolbar-button', // [실측]
  quoteBtn: '.se-insert-quotation-default-toolbar-button', // [실측]
  hrBtn: '.se-insert-horizontal-line-default-toolbar-button', // [실측]
  formatBtn: '.se-text-format-toolbar-button', // [실측]
  fontSizeBtn: '.se-font-size-code-toolbar-button', // [실측]
  videoPopup: '.se-popup-video-upload', // [실측]
  videoAppend: 'button.nvu_btn_append.nvu_local', // [실측]
  videoTitle: '.se-popup-video-upload input[placeholder*="제목"]', // [실측]
  videoClose: 'button.nvu_btn_close', // [실측]
  realPublish: REAL_PUBLISH_SELECTOR, // [실측] 절대 클릭 금지 — 가드가 차단
  tagInput: 'input#tag-input', // [실측]
  saveBtn: 'button[class*="save_btn"]', // [실측] 해시 클래스 → 부분 일치, 폴백 "저장" 텍스트
  // ↓ [미실측] 후보를 순서대로 시도
  videoBtn: ['button.se-video-toolbar-button', 'button[data-name="video"]'],
  mapBtn: ['button.se-map-toolbar-button', 'button.se-place-toolbar-button', 'button[data-name="map"]'],
  publishPanelOpen: ['button[class*="publish_btn"]'],
  popupClose: ['.se-popup-close-button', 'button[class*="popup-close"]', 'button[aria-label*="닫기"]'],
};

// ───────────────────────── 인자 ─────────────────────────
const args = process.argv.slice(2);
const draftFile = args.find((a) => !a.startsWith('--'));
const DRY_RUN = args.includes('--dry-run');
const VALIDATE_ONLY = args.includes('--validate-only');
const KEEP_OPEN = args.includes('--keep-open');

if (!draftFile) {
  console.error('사용법: node scripts/naver_draft.js drafts/<초안>.json [--dry-run] [--validate-only] [--keep-open]');
  process.exit(1);
}

const { draft, errors, warnings } = loadDraft(path.resolve(draftFile));
if (errors.length) {
  console.error('❌ 초안 JSON 오류:\n  - ' + errors.join('\n  - '));
  process.exit(1);
}
warnings.forEach((w) => console.warn('⚠️ ' + w));

const base = path.join(path.dirname(path.resolve(draftFile)), path.basename(draftFile, '.json'));
const OUT = {
  dump: base + '.dump.txt',
  shot: base + '.png',
  manual: base + '.manual.txt',
  result: base + '.result.json',
};
// 수동 붙여넣기용 원고는 항상 만들어 둔다 (자동화 3회 실패 시 즉시 사용)
fs.writeFileSync(OUT.manual, manualManuscript(draft), 'utf8');

if (VALIDATE_ONLY) {
  console.log('✅ 초안 JSON 검증 통과 (브라우저 미실행). 수동 원고: ' + path.relative(process.cwd(), OUT.manual));
  process.exit(0);
}

// ───────────────────────── 결과 기록 ─────────────────────────
const R = {
  guard: { ok: false, note: '' },
  blocks: { ok: 0, total: draft.blocks.length, failed: [] },
  subtitle: { ok: 0, total: draft.blocks.filter((b) => b.type === 'subtitle').length, failed: [] },
  video: { status: draft.video ? 'pending' : 'na', note: '' },
  place: { status: draft.place ? 'pending' : 'na', note: '' },
  firstLine: { fixed: false, note: '' },
  title: { ok: false, attempts: 0 },
  tags: { status: draft.tags.length ? 'pending' : 'na', got: [], note: '' },
  save: { status: DRY_RUN ? 'skipped' : 'pending', note: '' },
  verify: { ok: false, missing: [], outOfOrder: [], titleOk: false },
};
const log = (...a) => console.log('·', ...a);

// ───────────────────────── 헬퍼 ─────────────────────────
const sleep = (page, ms) => page.waitForTimeout(ms);

/** 에디터 문서에 조회 헬퍼를 심는다 (재로딩 대비해 매번 존재 확인). */
async function ensureHelpers(ed) {
  await ed.evaluate(() => {
    if (window.__nd) return;
    const bodyComps = () => [...document.querySelectorAll('.se-component')]
      .filter((c) => !c.classList.contains('se-documentTitle') && !(c.parentElement && c.parentElement.closest('.se-component')));
    const typeOf = (c) => {
      const cls = [...c.classList].find((k) => k.startsWith('se-') && k !== 'se-component' && !k.startsWith('se-l-') && !k.startsWith('se-component-'));
      return cls ? cls.slice(3) : 'unknown';
    };
    const visible = (el) => {
      if (!el || !el.getClientRects().length) return false;
      const st = getComputedStyle(el);
      return st.visibility !== 'hidden' && st.display !== 'none' && st.opacity !== '0';
    };
    window.__nd = {
      bodyComps,
      typeOf,
      visible,
      summary: () => bodyComps().map(typeOf),
      count: (cls) => bodyComps().filter((c) => c.classList.contains(cls)).length,
      caretInLastText: () => {
        const s = getSelection();
        if (!s || !s.rangeCount) return false;
        const n = s.anchorNode;
        const el = n && (n.nodeType === 1 ? n : n.parentElement);
        const comp = el && el.closest('.se-component');
        const comps = bodyComps();
        const last = comps[comps.length - 1];
        return !!(comp && comp === last && comp.classList.contains('se-text'));
      },
      caretInLast: () => {
        const s = getSelection();
        if (!s || !s.rangeCount) return false;
        const n = s.anchorNode;
        const el = n && (n.nodeType === 1 ? n : n.parentElement);
        const comps = bodyComps();
        return !!(el && el.closest('.se-component') === comps[comps.length - 1]);
      },
      caretSnapshot: () => {
        const s = getSelection();
        const n = s && s.rangeCount ? s.anchorNode : null;
        const el = n && (n.nodeType === 1 ? n : n.parentElement);
        const comp = el && el.closest('.se-component');
        return comp ? typeOf(comp) : (el ? el.className || el.tagName : 'none');
      },
    };
  });
}

/**
 * 보이는 요소 중 텍스트가 일치하는 것에 표식을 달고 Locator 반환 (없으면 null).
 * 클래스명이 해시로 바뀌는 버튼("발행", "저장", "추가", "확인")을 텍스트로 잡기 위함.
 */
async function markByText(ctx, { texts, tags = 'button', scope = null, exclude = null, exact = true, pick = 'first' }) {
  const id = 'm' + Math.random().toString(36).slice(2, 9);
  const found = await ctx.evaluate(({ texts, tags, scope, exclude, exact, pick, id }) => {
    const roots = scope ? [...document.querySelectorAll(scope)] : [document];
    const vis = (el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
    const list = [];
    for (const r of roots) {
      for (const el of r.querySelectorAll(tags)) {
        if (!vis(el)) continue;
        if (exclude && el.closest(exclude)) continue;
        const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
        if (texts.some((x) => (exact ? t === x : t.includes(x)))) list.push(el);
      }
    }
    if (!list.length) return false;
    const el = pick === 'last' ? list[list.length - 1] : list[0];
    el.setAttribute('data-nd-mark', id);
    return true;
  }, { texts, tags, scope, exclude, exact, pick, id });
  return found ? ctx.locator(`[data-nd-mark="${id}"]`) : null;
}

/** 클릭이 안 되는 빈 문단(높이 0 등)에 캐럿을 놓는다. focus() 를 먼저 해야 한다 — 나중에 하면 캐럿이 문서 처음으로 튄다(모의 테스트로 확인). */
async function placeCaret(loc) {
  await loc.evaluate((el) => {
    const p = el.matches('p') ? el : el.querySelector('p') || el;
    (p.closest('[contenteditable="true"]') || p).focus();
    const r = document.createRange(); r.selectNodeContents(p); r.collapse(false);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  });
}

/** 캐럿이 selector 안에 있는지 — 엉뚱한 곳(본문 첫 줄 등)에 입력하는 사고 방지 */
async function caretInside(ed, selector) {
  return ed.evaluate((sel) => {
    const s = getSelection();
    if (!s || !s.rangeCount) return false;
    const n = s.anchorNode;
    const el = n && (n.nodeType === 1 ? n : n.parentElement);
    return !!(el && el.closest(sel));
  }, selector);
}

/** 후보 셀렉터 중 처음 보이는 것 */
async function firstVisible(ctx, candidates) {
  for (const s of [].concat(candidates)) {
    const loc = ctx.locator(s).first();
    if (await loc.isVisible().catch(() => false)) return { loc, sel: s };
  }
  return null;
}

/** 한글은 insertText 로만 (type 은 IME 조합이 꼬임). 이모지는 별도 호출로 분리 (함께 넣으면 뒤 텍스트 유실). */
const EMOJI_SPLIT = /(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*️?)/u;
async function typeText(page, text) {
  const parts = text.split(new RegExp(EMOJI_SPLIT.source, 'gu')).filter((s) => s !== '');
  for (const part of parts) {
    await page.keyboard.insertText(part);
    await sleep(page, EMOJI_SPLIT.test(part) ? 150 : 40);
  }
}

async function typeLines(page, lines) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]) await typeText(page, lines[i]);
    if (i < lines.length - 1) { await page.keyboard.press('Enter'); await sleep(page, 60); }
  }
}

/** dim 레이어가 남으면 이후 모든 클릭이 "intercepts pointer events" 로 실패한다 → 강제 제거 폴백 */
async function forceRemoveDim(ed, popupSel) {
  return ed.evaluate((popupSel) => {
    let n = 0;
    const kill = (el) => { el.remove(); n++; };
    if (popupSel) document.querySelectorAll(popupSel).forEach(kill);
    document.querySelectorAll('.se-popup-dim, .se-popup-dim-transparent, [class*="se-popup-dim"]').forEach(kill);
    return n;
  }, popupSel).catch(() => 0);
}

/** 캐럿을 문서 맨 끝의 텍스트 문단에 둔다. 마지막이 사진·인용구 등이면 뒤에 새 문단을 만든다. */
async function focusEnd(ed, page) {
  await ensureHelpers(ed);
  const lastType = await ed.evaluate(() => { const c = window.__nd.bodyComps(); return c.length ? window.__nd.typeOf(c[c.length - 1]) : 'none'; });
  if (lastType === 'text') {
    await ed.locator(SEL.bodyPara).last().click();
    await page.keyboard.press('End');
    return 'last-text';
  }
  const lastComp = ed.locator('.se-component:not(.se-documentTitle)').last();
  // 전략 1: 컴포넌트 클릭 후 ↓ / 전략 2: 컴포넌트 클릭 후 Enter / 전략 3: 컴포넌트 아래 빈 공간 클릭
  const strategies = [
    async () => { await lastComp.click({ position: { x: 5, y: 5 } }); await page.keyboard.press('ArrowDown'); },
    async () => { await lastComp.click({ position: { x: 5, y: 5 } }); await page.keyboard.press('Enter'); },
    async () => {
      const box = await lastComp.boundingBox();
      if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height + 25);
    },
  ];
  for (let i = 0; i < strategies.length; i++) {
    try { await strategies[i](); } catch (_) { continue; }
    await sleep(page, 250);
    if (await ed.evaluate(() => window.__nd.caretInLastText())) return `after-${lastType}#${i + 1}`;
  }
  throw new Error(`마지막 컴포넌트(${lastType}) 뒤로 캐럿을 옮기지 못했습니다 — probe 필요`);
}

/**
 * 컴포넌트(사진·인용구·구분선·동영상·지도) 삽입 전 준비.
 * 불변식: 블록 사이에서 캐럿은 항상 "문서 끝의 빈 문단"에 있다.
 * Enter 로 빈 문단을 하나 더 만들고 ↑ 로 올라가 그 자리에 삽입하면, 아래 빈 문단이 삽입 후 착지점으로 남는다.
 * (컴포넌트 뒤로 캐럿을 빼내는 것보다 훨씬 안정적. focusEnd 는 폴백)
 */
/** ND_DEBUG=1 일 때만: 캐럿이 있는 컴포넌트 + 전체 컴포넌트 순서 (캐럿 문제 실측용) */
async function dbg(ed, label) {
  if (!process.env.ND_DEBUG) return;
  const s = await ed.evaluate(() => ({ caret: window.__nd.caretSnapshot(), comps: window.__nd.summary().join(',') })).catch((e) => ({ err: String(e) }));
  console.log(`  [dbg] ${label}: caret=${s.caret} | ${s.comps || s.err}`);
}

async function prepareSlot(ed, page) {
  await dbg(ed, 'prepareSlot 시작');
  // [실측 2026-10-11] Enter 반영 전에 ↑ 가 먼저 처리되면 캐럿이 위 컴포넌트(소제목 등)로 올라가
  // 사진이 소제목 "앞"에 들어간다(간헐적 레이스). → 새 문단 생성을 확인한 뒤 ↑, ↑ 후 위치도 확인.
  for (let attempt = 1; attempt <= 2; attempt++) {
    await focusCaretBack(ed, page);
    await dbg(ed, 'prepareSlot focusCaretBack 후');
    const paras = () => ed.evaluate(() => window.__nd.bodyComps().reduce((n, c) => n + c.querySelectorAll('p').length, 0));
    const before = await paras();
    await page.keyboard.press('Enter');
    const deadline = Date.now() + 2000;
    while ((await paras()) <= before && Date.now() < deadline) await sleep(page, 80);
    await sleep(page, 80);
    await page.keyboard.press('ArrowUp');
    await sleep(page, 120);
    await dbg(ed, 'prepareSlot Enter↑ 후');
    if (await ed.evaluate(() => window.__nd.caretInLastText())) return;
    log(`착지 문단 준비: ↑ 후 캐럿이 마지막 텍스트를 벗어남(${await ed.evaluate(() => window.__nd.caretSnapshot())}) → 재시도 ${attempt}`);
    // 위로 올라간 경우 만들어 둔 빈 문단 쪽으로 복귀 (focusEnd 가 마지막 문단으로 옮김)
    await focusEnd(ed, page);
    await page.keyboard.press('ArrowUp');
    await sleep(page, 120);
    if (await ed.evaluate(() => window.__nd.caretInLastText())) return;
  }
  throw new Error('착지 문단 준비 실패 — 캐럿이 마지막 텍스트 컴포넌트에 없음 (삽입하면 순서가 틀어짐)');
}

// 본문에 주소를 치면 에디터가 링크 미리보기 카드(se-oglink)를 비동기로 붙인다. 카드는 생성이 끝난 순간의 캐럿 위치에 들어가므로
// 기다리지 않고 진행하면 맨 마지막 제목 입력 중에 생겨 글 맨 위로 간다(2026-10-22 실측) → 카드가 생길 때까지 기다린 뒤 캐럿을 문서 끝으로.
const URL_RE = /https?:\/\/\S+/;
async function waitOglink(ed, page, before) {
  const made = await waitCount(ed, page, 'se-oglink', before, 12000);
  log(made ? '링크 카드 생성 확인' : '링크 카드 안 생김(12초) — 그대로 진행');
  if (made) { await sleep(page, 300); if (!(await ed.evaluate(() => window.__nd.caretInLastText()))) await focusEnd(ed, page); }
  return made;
}

async function waitCount(ed, page, cls, before, timeout) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if ((await ed.evaluate((c) => window.__nd.count(c), cls)) > before) return true;
    await sleep(page, 400);
  }
  return false;
}

// ── 서식 ──
async function readFormatLabel(ed) {
  return (await ed.locator(SEL.formatBtn).first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
}

// [실측 2026-10-11] 옵션 버튼 innerText 가 "소제목 소제목"(라벨+툴팁)이라 텍스트 정확 일치로는 못 찾는다 → data-value 로 고른다.
const FORMAT_VALUE = { 본문: 'text', 소제목: 'sectionTitle', 인용구: 'quotation' };

async function setParagraphFormat(ed, page, label) {
  await ed.locator(SEL.formatBtn).first().click();
  await sleep(page, 250);
  let opt = ed.locator(`button[data-name="text-format"][data-value="${FORMAT_VALUE[label]}"]`).filter({ visible: true }).first();
  if (!(await opt.isVisible().catch(() => false))) {
    opt = await markByText(ed, { texts: [label], tags: '.se-toolbar-option-label, button, li, [role="option"]', exclude: SEL.formatBtn, pick: 'last' });
  }
  if (!opt) { await page.keyboard.press('Escape'); throw new Error(`문단 서식 옵션 "${label}" 을 못 찾음`); }
  await opt.click();
  await sleep(page, 200);
  const got = await readFormatLabel(ed);
  if (!got.includes(label)) throw new Error(`문단 서식 검증 실패: 기대 "${label}", 실제 "${got}"`);
}

async function readFontSize(ed) {
  return (await ed.locator(SEL.fontSizeBtn).first().innerText().catch(() => '')).replace(/\s+/g, '').trim();
}

async function setFontSize(ed, page, size) {
  await ed.locator(SEL.fontSizeBtn).first().click();
  await sleep(page, 250);
  const opt = ed.locator(`[class*="fs${size}"]:not(${SEL.fontSizeBtn})`).filter({ visible: true }).first();
  if (!(await opt.isVisible().catch(() => false))) { await page.keyboard.press('Escape'); throw new Error(`글자 크기 옵션 fs${size} 없음`); }
  await opt.click();
  await sleep(page, 200);
  const got = await readFontSize(ed);
  if (!got.includes(String(size))) throw new Error(`글자 크기 검증 실패: 기대 ${size}, 실제 "${got}"`);
}

// ── 블록 입력 ──
async function insertSubtitle(ed, page, text, bodySize) {
  // 순서가 핵심: 서식 → 크기 → 텍스트 입력 (입력 후 바꾸면 이미 쓴 글자엔 적용 안 됨)
  let formatted = true;
  try {
    await setParagraphFormat(ed, page, '소제목');
    await setFontSize(ed, page, 19);
  } catch (e) {
    formatted = false;
    log(`소제목 서식 실패 → 텍스트만 입력: ${e.message}`);
  }
  // 소제목 서식은 컴포넌트 종류가 바뀔 수 있어 "마지막 컴포넌트 안"인지만 확인 (텍스트 컴포넌트로 되돌리면 서식이 사라짐)
  if (!(await ed.evaluate(() => window.__nd.caretInLast()))) {
    log('소제목: 캐럿이 문서 끝이 아님 → 마지막 문단 클릭');
    await ed.locator('.se-component:not(.se-documentTitle)').last().locator('p').last().click();
    await page.keyboard.press('End');
  }
  await typeText(page, text);
  await page.keyboard.press('Enter');
  await sleep(page, 150);
  // 다음 문단은 "본문"으로 명시 복귀 + 라벨 재확인
  try {
    await setParagraphFormat(ed, page, '본문');
    if (bodySize && !(await readFontSize(ed)).includes(bodySize)) await setFontSize(ed, page, bodySize);
  } catch (e) {
    log(`본문 복귀 실패: ${e.message}`);
    formatted = false;
  }
  await dbg(ed, '소제목 본문 복귀 후');
  await focusCaretBack(ed, page);
  await dbg(ed, '소제목 focusCaretBack 후');
  return formatted;
}

/** 드롭다운 조작 뒤 캐럿이 문서 끝 텍스트에 있는지 확인하고, 아니면 되돌린다. */
async function focusCaretBack(ed, page) {
  if (!(await ed.evaluate(() => window.__nd.caretInLastText()))) await focusEnd(ed, page);
}

async function insertImage(ed, page, block) {
  await prepareSlot(ed, page);
  const abs = resolvePath(block.path);
  const before = await ed.evaluate(() => window.__nd.count('se-image'));
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 15000 }),
    ed.locator(SEL.imageBtn).first().click(),
  ]);
  await chooser.setFiles(abs);
  if (!(await waitCount(ed, page, 'se-image', before, 90000))) throw new Error(`사진 업로드 확인 실패: ${block.path}`);
  // 업로드 완료(이미지 로드) 대기
  await ed.waitForFunction(() => {
    const imgs = window.__nd.bodyComps().filter((c) => c.classList.contains('se-image'));
    const img = imgs[imgs.length - 1] && imgs[imgs.length - 1].querySelector('img');
    return !!(img && img.complete && img.naturalWidth > 0);
  }, null, { timeout: 90000 }).catch(() => log(`사진 로드 대기 시간 초과(계속 진행): ${block.path}`));
  await sleep(page, 400);
  if (block.caption && block.caption.trim()) {
    // [실측 2026-10-11] 캡션 칸은 사진을 선택해야 보인다. 안 보일 때 DOM 으로 캐럿을 놓으면(placeCaret) 에디터가 무시하고
    // 사진 아래 문단에 입력된다 → placeCaret 폴백 금지. 또 캡션 입력 중에도 DOM selection 은 캡션 밖이라 caretInside 로는
    // 판정 불가 → 캡션이 활성화되면 나타나는 캡션 툴바(__se-toolbar-slot)로 판정한다.
    const comp = ed.locator('.se-component.se-image').last();
    const capWrap = comp.locator('.se-caption').first();
    const cap = comp.locator('.se-caption p.se-text-paragraph').first();
    try {
      await comp.locator('img').first().click({ timeout: 5000 });
      await cap.waitFor({ state: 'visible', timeout: 5000 });
      await cap.click({ timeout: 5000 });
      await sleep(page, 300);
      // 슬롯 자체는 크기 0(툴바가 떠 있는 구조)이라 isVisible 은 항상 false → display 로 판정
      const capActive = await capWrap.evaluate((el) => {
        const slot = [...el.children].find((c) => c.classList.contains('__se-toolbar-slot'));
        return !!(slot && getComputedStyle(slot).display !== 'none');
      }).catch(() => false);
      if (!capActive) throw new Error('캡션 활성화 확인 실패(캡션 툴바 표시 안 됨) — 입력 생략');
      await typeText(page, block.caption.trim());
      await sleep(page, 200);
      const got = norm(await cap.innerText().catch(() => ''));
      if (!got.includes(norm(block.caption.trim()))) log(`캡션 입력 후 확인 실패(${block.path}): 캡션 칸 내용 "${got.slice(0, 30)}"`);
    } catch (e) {
      log(`캡션 입력 실패(${block.path}): ${e.message.split('\n')[0]}`);
    }
  }
  return focusEnd(ed, page);
}

async function insertQuote(ed, page, text) {
  await prepareSlot(ed, page);
  const before = await ed.evaluate(() => window.__nd.count('se-quotation'));
  await ed.locator(SEL.quoteBtn).first().click();
  if (!(await waitCount(ed, page, 'se-quotation', before, 10000))) throw new Error('인용구 컴포넌트 생성 확인 실패');
  await sleep(page, 250);
  await typeLines(page, text.split('\n'));
  return focusEnd(ed, page);
}

async function insertDivider(ed, page) {
  await prepareSlot(ed, page);
  const before = await ed.evaluate(() => window.__nd.count('se-horizontalLine'));
  await ed.locator(SEL.hrBtn).first().click();
  if (!(await waitCount(ed, page, 'se-horizontalLine', before, 10000))) throw new Error('구분선 생성 확인 실패');
  return focusEnd(ed, page);
}

async function insertVideo(ed, page, video) {
  const btn = await firstVisible(ed, SEL.videoBtn);
  if (!btn) throw new Error('동영상 툴바 버튼 없음 — probe 필요');
  const before = await ed.evaluate(() => window.__nd.count('se-video'));
  await prepareSlot(ed, page);
  await btn.loc.click();
  await ed.locator(SEL.videoPopup).first().waitFor({ state: 'visible', timeout: 15000 });
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 15000 }),
    ed.locator(SEL.videoAppend).first().click(),
  ]);
  await chooser.setFiles(resolvePath(video.path));
  log('동영상 업로드 중… (수 분 걸릴 수 있음)');

  const titleInput = ed.locator(SEL.videoTitle).first();
  await titleInput.waitFor({ state: 'visible', timeout: 60000 });
  await titleInput.click();
  await titleInput.fill('');
  await page.keyboard.insertText(video.title);

  // 업로드 완료 → 확인(첨부) 버튼 활성화 대기 (최대 10분)
  const deadline = Date.now() + 10 * 60 * 1000;
  let confirmed = false;
  while (Date.now() < deadline) {
    const ok = await markByText(ed, { texts: ['확인', '첨부', '완료', '등록'], scope: SEL.videoPopup });
    if (ok && (await ok.isEnabled().catch(() => false)) && !(await ok.evaluate((el) => el.className.includes('disabled') || el.getAttribute('aria-disabled') === 'true'))) {
      await ok.click();
      confirmed = true;
      break;
    }
    await sleep(page, 3000);
  }
  if (!confirmed) throw new Error('동영상 업로드 완료(확인 버튼 활성화)를 10분 안에 확인하지 못함');

  // 팝업 확실히 닫기 — 안 닫으면 dim 잔류로 이후 클릭 전부 실패
  await sleep(page, 1500);
  if (await ed.locator(SEL.videoPopup).first().isVisible().catch(() => false)) {
    await ed.locator(SEL.videoClose).first().click({ timeout: 3000 }).catch(() => {});
    await sleep(page, 800);
    if (await ed.locator(SEL.videoPopup).first().isVisible().catch(() => false)) {
      const n = await forceRemoveDim(ed, SEL.videoPopup);
      log(`동영상 팝업 강제 제거 (${n}개 요소)`);
    }
  }
  if (!(await waitCount(ed, page, 'se-video', before, 60000))) throw new Error('본문에 동영상 컴포넌트가 생기지 않음');
  return focusEnd(ed, page);
}

async function closePopupSafely(ed, page, popupLoc) {
  for (const s of SEL.popupClose) {
    const c = popupLoc ? popupLoc.locator(s).first() : ed.locator(s).first();
    if (await c.isVisible().catch(() => false)) { await c.click().catch(() => {}); await sleep(page, 500); break; }
  }
  // 장소 팝업은 Escape 로 안 닫힘(실측) → 닫기 버튼 후에도 남으면 DOM 강제 제거
  const still = popupLoc && (await popupLoc.isVisible().catch(() => false));
  if (still) {
    const n = await forceRemoveDim(ed, null);
    await popupLoc.evaluate((el) => el.remove()).catch(() => {});
    log(`팝업 강제 제거 (dim ${n}개)`);
  } else {
    await forceRemoveDim(ed, null);
  }
}

async function insertPlace(ed, page, place) {
  const btn = await firstVisible(ed, SEL.mapBtn);
  if (!btn) throw new Error('지도 툴바 버튼 없음 — probe 필요');
  await prepareSlot(ed, page);
  await btn.loc.click();
  await sleep(page, 1000);
  // 팝업 내 검색 입력란 [미실측: placeholder 기반]
  const input = ed.locator('[class*="popup"] input[type="text"], [class*="popup"] input:not([type])').filter({ visible: true }).first();
  await input.waitFor({ state: 'visible', timeout: 10000 });
  const popup = input.locator('xpath=ancestor::*[contains(@class,"se-popup")][1]');
  await input.click();
  await input.fill('');
  await page.keyboard.insertText(place.query);
  await page.keyboard.press('Enter');
  await sleep(page, 2000);

  // 결과 항목: "추가" 버튼을 가진 li
  const items = await ed.evaluate(() => {
    const vis = (el) => el.getClientRects().length > 0;
    return [...document.querySelectorAll('[class*="se-popup"] li')].filter(vis).map((li, i) => {
      li.setAttribute('data-nd-place', String(i));
      const nameEl = li.querySelector('strong, [class*="title"], [class*="name"]');
      const name = (nameEl ? nameEl.innerText : li.innerText.split('\n')[0] || '').trim();
      const hasAdd = [...li.querySelectorAll('button')].some((b) => b.textContent.trim() === '추가');
      return { i, name, hasAdd };
    }).filter((x) => x.hasAdd || x.name);
  });
  if (!items.length) {
    await closePopupSafely(ed, page, popup);
    return { status: 'manual', note: `"${place.query}" 검색 결과 0건 → 지도 수동 첨부 필요` };
  }
  const n = (s) => s.replace(/\s+/g, '');
  const pick = items.find((x) => n(x.name) === n(place.name))
    || items.find((x) => n(x.name).includes(n(place.name)) || n(place.name).includes(n(x.name)))
    || items[0];
  const item = ed.locator(`[data-nd-place="${pick.i}"]`);
  // "추가" 는 hover 전 not visible → hover 후 클릭, 폴백은 DOM 직접 click
  await item.hover();
  await sleep(page, 300);
  const add = item.locator('button', { hasText: '추가' }).first();
  try { await add.click({ timeout: 3000 }); } catch (_) { await add.evaluate((el) => el.click()); }
  await sleep(page, 500);
  // 확인 버튼은 "추가" 전까지 disabled
  const confirm = await markByText(ed, { texts: ['확인'], scope: '[class*="se-popup"]', pick: 'last' });
  if (!confirm) throw new Error('지도 팝업 확인 버튼 없음');
  await confirm.click({ timeout: 5000 });
  await sleep(page, 1500);
  await closePopupSafely(ed, page, (await popup.isVisible().catch(() => false)) ? popup : null);
  const exact = n(pick.name) === n(place.name);
  return { status: 'ok', note: `선택: "${pick.name}"${exact ? '' : ' (정확 일치 아님 — 육안 확인)'}` };
}

// ── 제목 ──
async function readTitle(ed) {
  return (await ed.locator(SEL.title).first().innerText().catch(() => '')).replace(/\n+/g, ' ').trim();
}

async function setTitle(ed, page, title) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    R.title.attempts = attempt;
    const t = ed.locator(SEL.title).first();
    try { await t.click({ timeout: 5000 }); } catch (_) { await placeCaret(t); }
    if (!(await caretInside(ed, SEL.title))) { log(`제목: 캐럿이 제목 밖에 있음 → 입력하지 않음 (시도 ${attempt})`); await placeCaret(t); continue; }
    // 제목 문단 내용만 선택 (Ctrl+A 는 문서 전체를 잡을 수 있어 금지)
    await t.evaluate((el) => {
      const p = el.querySelector('p.se-text-paragraph') || el;
      const r = document.createRange();
      r.selectNodeContents(p);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    });
    if ((await readTitle(ed)).length) await page.keyboard.press('Backspace');
    await typeText(page, title);
    await sleep(page, 400);
    const got = await readTitle(ed);
    if (norm(got) === norm(title)) { R.title.ok = true; return; }
    // 제목이 본문으로 새어 들어갔으면 재시도하지 않는다 (재시도할수록 본문 오염이 쌓임)
    if (norm(await readBodyText(ed)).includes(norm(title))) {
      R.title.polluted = true;
      log('❗ 제목 텍스트가 본문에 들어감 — 재시도 중단. 본문 첫 줄을 수동 확인/삭제 필요');
      return;
    }
    log(`제목 불일치(시도 ${attempt}): "${got}" → 재입력`);
  }
}

// ── 첫 줄 보정 ──
async function readBodyText(ed) {
  return ed.evaluate((sel) => [...document.querySelectorAll(sel)].map((p) => p.innerText).join('\n'), SEL.bodyPara);
}

async function fixFirstLine(ed, page) {
  const firstText = draft.blocks.find((b) => b.type === 'text').text.split('\n').find((l) => l.trim()).trim();
  const probe = norm(firstText).slice(0, 12);
  const body = norm(await readBodyText(ed));
  if (body.includes(probe)) return;
  log(`본문 첫 줄 누락 감지 → 맨 앞 보정 삽입: "${firstText.slice(0, 20)}…"`);
  await ed.locator(SEL.bodyPara).first().click();
  await page.keyboard.press('Home');
  await typeText(page, firstText);
  await page.keyboard.press('Enter');
  R.firstLine.fixed = true;
  R.firstLine.note = '첫 줄 보정 삽입함';
}

// ── 태그 ──
async function openPublishPanel(ed, page) {
  // 우상단 "발행" 버튼(패널 열기). 진짜 발행 버튼(seOnePublishBtn)은 제외 — 가드가 어차피 차단.
  let opener = await firstVisible(ed, SEL.publishPanelOpen.map((s) => `${s}:not([data-testid="seOnePublishBtn"])`));
  let loc = opener && opener.loc;
  if (!loc) loc = await markByText(ed, { texts: ['발행'], exclude: SEL.realPublish });
  if (!loc) throw new Error('발행 패널 열기 버튼 없음 — probe 필요');
  if (await loc.evaluate((el, s) => !!el.closest(s), SEL.realPublish)) throw new Error('안전 중단: 패널 열기 버튼이 진짜 발행 버튼으로 잡힘');
  await loc.click();
  await ed.locator(SEL.tagInput).first().waitFor({ state: 'visible', timeout: 10000 });
}

async function readTags(ed) {
  // 칩 클래스는 해시가 바뀜 → 태그 영역 텍스트를 # 로 쪼개 센다
  return ed.evaluate((sel) => {
    const input = document.querySelector(sel);
    if (!input) return [];
    let box = input.parentElement;
    for (let i = 0; i < 4 && box && !/#/.test(box.innerText || ''); i++) box = box.parentElement;
    const txt = (box && box.innerText) || '';
    return txt.split('#').map((s) => s.split('\n')[0].trim()).filter(Boolean);
  }, SEL.tagInput);
}

async function inputTags(ed, page, tags) {
  const g = await guardStatus(ed);
  if (!g.installed) throw new Error('발행 가드 미설치 상태 — 안전을 위해 발행 패널을 열지 않음');
  await openPublishPanel(ed, page);
  const input = ed.locator(SEL.tagInput).first();
  const existing = await readTags(ed);
  for (const tag of tags) {
    if (existing.includes(tag)) continue;
    await input.click();
    await page.keyboard.insertText(tag);
    await page.keyboard.press('Enter');
    await sleep(page, 250);
  }
  const got = await readTags(ed);
  R.tags.got = got;
  // 패널만 닫기
  await page.keyboard.press('Escape');
  await sleep(page, 500);
  if (await input.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await sleep(page, 500);
  }
  const missing = tags.filter((t) => !got.includes(t));
  return { missing, panelClosed: !(await input.isVisible().catch(() => false)) };
}

// ── 저장 ──
async function clickSave(ed, page) {
  let loc = (await firstVisible(ed, [SEL.saveBtn])) ? ed.locator(SEL.saveBtn).first() : null;
  if (!loc) loc = await markByText(ed, { texts: ['저장'], exclude: SEL.realPublish });
  if (!loc) throw new Error('임시저장 버튼 없음');
  if (await loc.evaluate((el, s) => !!el.closest(s), SEL.realPublish)) throw new Error('안전 중단: 저장 버튼이 발행 버튼으로 잡힘');
  await loc.click();
  await sleep(page, 2500);
}

// ── 이중 검증: 덤프 + 대조 ──
async function dumpAndVerify(ed, page) {
  const dump = await ed.evaluate(() => {
    const title = (document.querySelector('.se-title-text') || {}).innerText || '';
    const lines = [];
    for (const c of window.__nd.bodyComps()) {
      const type = window.__nd.typeOf(c);
      const text = (c.innerText || '').replace(/\n{2,}/g, '\n').trim();
      lines.push(`[${type}] ${text}`);
    }
    return { title: title.trim(), lines, comps: window.__nd.summary() };
  });
  fs.writeFileSync(OUT.dump, `[제목] ${dump.title}\n\n${dump.lines.join('\n')}\n`, 'utf8');
  await page.screenshot({ path: OUT.shot }).catch(() => {});

  R.verify.titleOk = norm(dump.title) === norm(draft.title);
  // 제목 오염 검사: 제목 전문이 본문 컴포넌트에 들어가 있으면 실패
  R.verify.titleInBody = dump.lines.some((l) => norm(l).includes(norm(draft.title)));
  const hay = norm(dump.lines.join('\n'));
  let cursor = 0;
  const captionHay = norm(dump.lines.filter((l) => l.startsWith('[image]')).join('\n'));
  for (const piece of expectedPieces(draft)) {
    const needle = norm(piece.text);
    if (piece.kind === 'caption') {
      // 캡션은 사진 컴포넌트 안에 있어야 통과 (본문으로 새면 실패)
      if (!captionHay.includes(needle)) R.verify.missing.push(`[caption→사진 밖/누락] ${piece.text}`);
      continue;
    }
    const at = hay.indexOf(needle, cursor);
    if (at >= 0) { cursor = at + needle.length; continue; }
    if (hay.includes(needle)) R.verify.outOfOrder.push(piece.text);
    else R.verify.missing.push(`[${piece.kind}] ${piece.text}`);
  }
  // 컴포넌트 개수 대조
  const want = (t) => draft.blocks.filter((b) => b.type === t).length;
  const have = (t) => dump.comps.filter((c) => c === t).length;
  const countIssues = [];
  if (have('image') < want('image')) countIssues.push(`사진 ${have('image')}/${want('image')}`);
  if (have('quotation') < want('quote')) countIssues.push(`인용구 ${have('quotation')}/${want('quote')}`);
  if (have('horizontalLine') < want('divider')) countIssues.push(`구분선 ${have('horizontalLine')}/${want('divider')}`);
  if (draft.video && R.video.status === 'ok' && have('video') < 1) countIssues.push('동영상 0/1');
  R.verify.countIssues = countIssues;
  // 컴포넌트 순서 대조 — 텍스트 대조만으론 "사진이 소제목 앞으로 감" 같은 배치 오류를 못 잡는다(2026-10-11 실측)
  const TYPE = { image: 'image', quote: 'quotation', divider: 'horizontalLine' };
  if (!R.subtitle.failed.length) TYPE.subtitle = 'sectionTitle';
  const watched = new Set(Object.values(TYPE));
  // 링크 카드: 실제로 생겼을 때만 "주소가 든 text 블록 바로 뒤"에 있어야 한다 (글 맨 위로 가는 실패를 잡는다)
  const og = have('oglink') > 0; if (og) watched.add('oglink');
  const wantSeq = draft.blocks.flatMap((b) => [TYPE[b.type], og && b.type === 'text' && URL_RE.test(b.text) ? 'oglink' : null]).filter(Boolean);
  const haveSeq = dump.comps.filter((c) => watched.has(c));
  R.verify.orderIssue = null;
  if (!countIssues.length && wantSeq.join(',') !== haveSeq.join(',')) {
    const i = wantSeq.findIndex((t, k) => t !== haveSeq[k]);
    R.verify.orderIssue = `컴포넌트 ${i + 1}번째부터 다름 — 기대 ${wantSeq.slice(Math.max(0, i - 1), i + 2).join('→')}, 실제 ${haveSeq.slice(Math.max(0, i - 1), i + 2).join('→')}`;
  }
  R.verify.ok = R.verify.titleOk && !R.verify.titleInBody && !R.verify.missing.length && !R.verify.outOfOrder.length && !countIssues.length && !R.verify.orderIssue;
}

// ───────────────────────── 메인 ─────────────────────────
(async () => {
  const { context, page } = await launchBrowser();
  let fatal = null;
  try {
    page.on('console', (m) => { if (m.text().includes('[publish-guard]')) console.warn('🛡️ ' + m.text()); });
    await page.goto(WRITE_URL, { waitUntil: 'domcontentloaded' });
    if (isLoginPage(page.url())) throw new Error('로그인이 필요합니다 → npm run login (또는 /setup-login)');
    const ed = await getEditorFrame(page);

    // 1) 발행 차단 가드 — 에디터 로드 직후 (절대 규칙 2)
    R.guard.ok = await installPublishGuard(page, ed);
    R.guard.note = R.guard.ok ? '설치 확인' : '설치 확인 실패 — 태그 입력(발행 패널) 생략';
    log('발행 가드: ' + R.guard.note);

    // 2) 팝업 정리
    const cancel = ed.locator(SEL.draftPopupCancel).first();
    if (await cancel.waitFor({ state: 'visible', timeout: 4000 }).then(() => true).catch(() => false)) {
      await cancel.click(); log('"작성 중인 글" 팝업 → 새로 쓰기'); await sleep(page, 800);
    }
    const help = ed.locator(SEL.helpClose).first();
    if (await help.isVisible().catch(() => false)) { await help.click().catch(() => {}); await sleep(page, 400); }
    await ensureHelpers(ed);

    // 3) 본문 (제목은 맨 마지막)
    await ed.locator(SEL.bodyPara).first().click();
    const bodySize = (await readFontSize(ed)).match(/\d+/)?.[0] || null;
    let firstTextSeen = false;
    for (let i = 0; i < draft.blocks.length; i++) {
      const b = draft.blocks[i];
      const next = draft.blocks[i + 1];
      try {
        if (b.type === 'text') {
          const hasUrl = URL_RE.test(b.text);
          const ogBefore = hasUrl ? await ed.evaluate(() => window.__nd.count('se-oglink')) : 0;
          await typeLines(page, b.text.split('\n'));
          await page.keyboard.press('Enter');
          if (hasUrl) { await prepareSlot(ed, page); await waitOglink(ed, page, ogBefore); } // 카드 뒤에 착지 문단을 미리 (사진과 같은 캐럿 불변식)
          if (next && next.type === 'text') await page.keyboard.press('Enter'); // 연속 text 사이 빈 줄
          await sleep(page, 100);
          if (!firstTextSeen && draft.video) {
            firstTextSeen = true;
            try {
              await insertVideo(ed, page, draft.video);
              R.video.status = 'ok';
            } catch (e) {
              R.video.status = 'manual'; R.video.note = e.message;
              log('동영상 실패: ' + e.message);
              await forceRemoveDim(ed, SEL.videoPopup);
              await focusEnd(ed, page);
            }
          }
          firstTextSeen = true;
        } else if (b.type === 'subtitle') {
          const ok = await insertSubtitle(ed, page, b.text.trim(), bodySize);
          if (ok) R.subtitle.ok++; else R.subtitle.failed.push(b.text);
        } else if (b.type === 'image') {
          const how = await insertImage(ed, page, b);
          log(`사진 ${path.basename(b.path)} (캐럿 복귀: ${how})`);
        } else if (b.type === 'quote') {
          await insertQuote(ed, page, b.text);
        } else if (b.type === 'divider') {
          await insertDivider(ed, page);
        }
        R.blocks.ok++;
      } catch (e) {
        if (page.isClosed()) throw new Error('브라우저가 닫혀 중단: ' + e.message.split('\n')[0]);
        R.blocks.failed.push(`blocks[${i}] ${b.type}: ${e.message.split('\n')[0]}`);
        log(`❗ blocks[${i}] ${b.type} 실패: ${e.message.split('\n')[0]}`);
        await forceRemoveDim(ed, null);
        await focusEnd(ed, page).catch(() => {});
      }
    }

    // 4) 지도 — 글 맨 끝
    if (draft.place) {
      try {
        const r = await insertPlace(ed, page, draft.place);
        R.place.status = r.status; R.place.note = r.note;
      } catch (e) {
        R.place.status = 'manual'; R.place.note = e.message;
        await forceRemoveDim(ed, null);
      }
    }

    // 5) 첫 줄 누락 검사 → 6) 제목 (맨 마지막)
    await fixFirstLine(ed, page);
    await setTitle(ed, page, draft.title);

    // 7) 태그 (발행 패널 → Escape)
    if (draft.tags.length) {
      if (!R.guard.ok) {
        R.tags.status = 'manual'; R.tags.note = '가드 미확인으로 생략';
      } else {
        try {
          const r = await inputTags(ed, page, draft.tags);
          R.tags.status = r.missing.length ? 'partial' : 'ok';
          R.tags.note = r.missing.length ? `누락: ${r.missing.join(', ')}` : '';
          if (!r.panelClosed) R.tags.note += ' / 발행 패널이 닫히지 않음';
        } catch (e) {
          R.tags.status = 'manual'; R.tags.note = e.message;
          await page.keyboard.press('Escape').catch(() => {});
        }
      }
    }

    // 8) 임시저장 (dry-run 이면 생략)
    if (!DRY_RUN) {
      if (!R.title.ok || R.title.polluted || R.blocks.failed.length) {
        // 망가진 초안을 저장하면 "저장 글"에 실패본만 쌓인다 → 저장 생략, 원인 수정 후 재실행
        R.save.status = 'fail';
        R.save.note = '제목/본문 단계 실패로 저장 생략 (브라우저를 닫으면 입력 내용은 버려짐)';
      } else {
        try { await clickSave(ed, page); R.save.status = 'ok'; } catch (e) { R.save.status = 'fail'; R.save.note = e.message; }
      }
    }

    // 9) 이중 검증
    await dumpAndVerify(ed, page);
    const g = await guardStatus(ed);
    R.guard.blocked = g.blocked;
  } catch (e) {
    fatal = e;
  } finally {
    printResult(fatal);
    fs.writeFileSync(OUT.result, JSON.stringify({ ...R, fatal: fatal ? fatal.message : null, dryRun: DRY_RUN }, null, 2), 'utf8');
    if (KEEP_OPEN) await waitForEnter('\n브라우저를 확인한 뒤 Enter 를 누르면 닫습니다… ');
    await context.close();
    const success = !fatal && R.verify.ok && R.blocks.failed.length === 0 && (DRY_RUN || R.save.status === 'ok');
    process.exitCode = success ? 0 : 2;
  }
})();

function printResult(fatal) {
  const rel = (p) => path.relative(process.cwd(), p);
  const st = (s) => ({ ok: '✅', na: '➖ 해당 없음', manual: '❗수동 필요', partial: '❗수동 필요(일부)', pending: '❗수동 필요(미실행)', fail: '❌', skipped: '⏭ dry-run 생략' }[s] || s);
  const L = [];
  L.push('', '===== 자동 처리 결과 =====');
  if (fatal) L.push(`❌ 치명적 오류: ${fatal.message}`);
  L.push(`발행 가드   : ${R.guard.ok ? '✅ 설치 확인' : '❌ ' + R.guard.note}${R.guard.blocked ? ` (발행 시도 ${R.guard.blocked}회 차단)` : ''}`);
  L.push(`본문 블록   : ${R.blocks.failed.length ? '❗' : '✅'} ${R.blocks.ok}/${R.blocks.total}`);
  R.blocks.failed.forEach((f) => L.push(`              - ${f}`));
  L.push(`소제목 서식 : ${R.subtitle.total ? (R.subtitle.failed.length ? `❗수동 필요 ${R.subtitle.failed.length}건 (${R.subtitle.failed.join(' / ')})` : `✅ ${R.subtitle.ok}/${R.subtitle.total}`) : '➖ 해당 없음'}`);
  L.push(`동영상      : ${st(R.video.status)}${R.video.note ? ' — ' + R.video.note : ''}`);
  L.push(`지도        : ${st(R.place.status)}${R.place.note ? ' — ' + R.place.note : ''}`);
  L.push(`첫 줄 보정  : ${R.firstLine.fixed ? '⚠️ 보정 삽입함' : '✅ 이상 없음'}`);
  L.push(`제목        : ${R.title.ok ? '✅' : '❌ 불일치'} (시도 ${R.title.attempts}회)`);
  L.push(`태그        : ${st(R.tags.status)}${R.tags.got.length ? ` [${R.tags.got.length}개 확인]` : ''}${R.tags.note ? ' — ' + R.tags.note : ''}`);
  L.push(`임시저장    : ${st(R.save.status)}${R.save.note ? ' — ' + R.save.note : ''}`);
  if (R.verify.ok) L.push('본문 대조   : ✅ 제목·본문 전문 일치');
  else {
    L.push(`본문 대조   : ❌ 불일치 — 성공 보고 금지 (제목 ${R.verify.titleOk ? '일치' : '불일치'}, 누락 ${R.verify.missing.length}, 순서 ${R.verify.outOfOrder.length})`);
    R.verify.missing.slice(0, 10).forEach((m) => L.push(`              누락: ${m}`));
    if (R.verify.titleInBody) L.push('              ❗ 제목 텍스트가 본문에 섞여 있음 (제목 오염 — 본문 첫 줄 확인)');
    R.verify.outOfOrder.slice(0, 5).forEach((m) => L.push(`              순서: ${m}`));
    (R.verify.countIssues || []).forEach((m) => L.push(`              개수: ${m}`));
    if (R.verify.orderIssue) L.push(`              배치: ${R.verify.orderIssue}`);
  }
  L.push(`산출물      : 덤프 ${rel(OUT.dump)} · 스크린샷 ${rel(OUT.shot)} · 수동원고 ${rel(OUT.manual)}`);
  L.push('==========================');
  console.log(L.join('\n'));
}
