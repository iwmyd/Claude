#!/usr/bin/env node
'use strict';
/**
 * 셀렉터 진단용 DOM 덤프 — 읽기 전용. 어떤 버튼도 클릭하지 않고, 아무것도 저장하지 않는다.
 * (발행 차단 가드는 동일하게 설치된다.)
 *
 * 사용:
 *   node scripts/probe_selectors.js                    # 에디터 진입 직후 상태 덤프
 *   node scripts/probe_selectors.js --wait 60 --label map
 *       → 60초 동안 사용자가 직접 지도 팝업 등을 열어 두면, 그 상태를 덤프한다.
 *   node scripts/probe_selectors.js --match "추가"      # 텍스트/클래스에 "추가"가 들어간 요소만 추려서 출력
 *
 * 산출물: drafts/probe/probe-<label>-<시각>.json (요약) / .html (에디터 프레임 전체 HTML)
 */
const fs = require('fs');
const path = require('path');
const { launchBrowser, installPublishGuard, isLoginPage, getEditorFrame, WRITE_URL, DRAFTS_DIR, timestamp } = require('./lib/common');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const WAIT = Number(opt('--wait', '0'));
const LABEL = opt('--label', 'editor');
const MATCH = opt('--match', '');

// 현재 스크립트가 쓰는 셀렉터 — 존재/가시성 점검
const CHECK = [
  '.se-title-text', '.se-section-text p.se-text-paragraph', '.se-popup-button-cancel', '.se-help-panel-close-button',
  'button.se-image-toolbar-button', '.se-insert-quotation-default-toolbar-button', '.se-insert-horizontal-line-default-toolbar-button',
  '.se-text-format-toolbar-button', '.se-font-size-code-toolbar-button',
  'button.se-video-toolbar-button', 'button.se-map-toolbar-button', 'button.se-place-toolbar-button',
  '.se-popup-video-upload', 'button.nvu_btn_append.nvu_local', 'button.nvu_btn_close',
  'button[data-testid="seOnePublishBtn"]', 'button[class*="publish_btn"]', 'input#tag-input', 'button[class*="save_btn"]',
  '.se-popup-close-button', '[class*="se-popup-dim"]',
];

async function dumpFrame(frame) {
  return frame.evaluate(({ CHECK, MATCH }) => {
    const vis = (el) => !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
    const short = (s, n = 40) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
    const desc = (el) => ({
      tag: el.tagName.toLowerCase(), id: el.id || undefined, cls: short(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className, 160),
      text: short(el.innerText || el.value || ''), testid: el.getAttribute('data-testid') || undefined,
      aria: el.getAttribute('aria-label') || undefined, placeholder: el.getAttribute('placeholder') || undefined,
      disabled: el.disabled || el.getAttribute('aria-disabled') === 'true' || undefined, visible: vis(el),
    });
    const m = (d) => !MATCH || JSON.stringify(d).includes(MATCH);
    const checks = CHECK.map((s) => { const els = [...document.querySelectorAll(s)]; return { sel: s, count: els.length, visible: els.filter(vis).length }; });
    const buttons = [...document.querySelectorAll('button, [role="button"]')].map(desc).filter((d) => d.visible).filter(m);
    const inputs = [...document.querySelectorAll('input, textarea, [contenteditable="true"]')].map(desc).filter(m);
    const popups = [...document.querySelectorAll('[class*="popup"], [class*="layer"], [role="dialog"]')].filter(vis)
      .filter((el) => !el.parentElement.closest('[class*="popup"], [class*="layer"], [role="dialog"]'))
      .map((el) => ({ ...desc(el), html: el.outerHTML.slice(0, 4000) }));
    const comps = [...document.querySelectorAll('.se-component')].map((c) => short(c.className, 120));
    return { url: location.href, checks, buttons, inputs, popups, comps };
  }, { CHECK, MATCH });
}

(async () => {
  const { context, page } = await launchBrowser();
  try {
    await page.goto(WRITE_URL, { waitUntil: 'domcontentloaded' });
    if (isLoginPage(page.url())) throw new Error('로그인이 필요합니다 → npm run login');
    const ed = await getEditorFrame(page);
    const guard = await installPublishGuard(page, ed);
    console.log(`발행 가드: ${guard ? '✅' : '❌'} (probe 는 어떤 버튼도 클릭하지 않습니다)`);
    if (WAIT > 0) {
      console.log(`👉 ${WAIT}초 동안 진단할 화면(팝업 등)을 직접 열어 두세요. 저장·발행은 누르지 마세요.`);
      await page.waitForTimeout(WAIT * 1000);
    }
    const result = { label: LABEL, at: new Date().toISOString(), top: await dumpFrame(page.mainFrame()) };
    if (ed !== page.mainFrame()) result.editor = await dumpFrame(ed);

    const dir = path.join(DRAFTS_DIR, 'probe');
    fs.mkdirSync(dir, { recursive: true });
    const base = path.join(dir, `probe-${LABEL}-${timestamp()}`);
    fs.writeFileSync(base + '.json', JSON.stringify(result, null, 2), 'utf8');
    fs.writeFileSync(base + '.html', await ed.content(), 'utf8');
    await page.screenshot({ path: base + '.png' }).catch(() => {});

    const target = result.editor || result.top;
    console.log('\n[셀렉터 점검] (count / visible)');
    for (const c of target.checks) console.log(`  ${c.count ? (c.visible ? '✅' : '👻') : '❌'} ${c.sel}  ${c.count}/${c.visible}`);
    if (MATCH) {
      console.log(`\n["${MATCH}" 포함 요소]`);
      [...target.buttons, ...target.inputs].forEach((d) => console.log('  ' + JSON.stringify(d)));
    }
    console.log(`\n보이는 팝업 ${target.popups.length}개 · 버튼 ${target.buttons.length}개 · 컴포넌트 ${target.comps.length}개`);
    console.log(`덤프: ${path.relative(process.cwd(), base)}.json / .html / .png`);
  } catch (e) {
    console.error('❌ ' + e.message);
    process.exitCode = 1;
  } finally {
    await context.close();
  }
})();
