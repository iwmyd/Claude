'use strict';
/**
 * 공통 모듈 — 브라우저 실행, 에디터 프레임 획득, 발행 차단 가드.
 *
 * ⚠️ 절대 규칙 2: installPublishGuard 는 어떤 경우에도 제거·우회하지 않는다.
 *    이 툴은 임시저장까지만 한다. 발행은 항상 사람이 자기 브라우저에서 한다.
 */
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
const PROFILE_DIR = path.join(ROOT, 'naver-profile');
const DRAFTS_DIR = path.join(ROOT, 'drafts');
const WRITE_URL = 'https://blog.naver.com/GoBlogWrite.naver';
const LOGIN_URL = 'https://nid.naver.com/nidlogin.login?url=' + encodeURIComponent('https://blog.naver.com');
// 1400 이하에서는 패널이 열릴 때 속성 툴바가 잘려 서식 버튼 클릭이 불안정해진다 (실측).
const VIEWPORT = { width: 1600, height: 1000 };

const REAL_PUBLISH_SELECTOR = 'button[data-testid="seOnePublishBtn"]';

/**
 * 진짜 발행 버튼(패널 안의 최종 발행)을 캡처 단계에서 원천 차단하는 스크립트.
 * window 캡처 리스너는 document·요소 리스너보다 먼저 실행되므로 에디터 핸들러에 도달하지 못한다.
 * addInitScript(모든 프레임·모든 로드에 주입) + 로드 후 evaluate 로 이중 설치한다.
 */
const GUARD_SRC = `(() => {
  if (window.__naverPublishGuard) return true;
  const SEL = ${JSON.stringify(REAL_PUBLISH_SELECTOR)};
  const state = { blocked: 0, installedAt: Date.now() };
  Object.defineProperty(window, '__naverPublishGuard', { value: state, writable: false, configurable: false });
  const hit = (e) => {
    const t = e.target;
    const el = t && (t.nodeType === 1 ? t : t.parentElement);
    return !!(el && el.closest && el.closest(SEL));
  };
  const block = (e) => {
    if (!hit(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    state.blocked++;
    try { console.warn('[publish-guard] 발행 버튼 동작을 차단했습니다 (' + e.type + ')'); } catch (_) {}
  };
  for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'touchstart', 'touchend', 'submit']) {
    window.addEventListener(type, block, true);
  }
  window.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') block(e); }, true);
  window.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') block(e); }, true);
  return true;
})();`;

async function launchBrowser({ headless = false } = {}) {
  const { chromium } = require('playwright');
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    viewport: VIEWPORT,
    locale: 'ko-KR',
    args: [`--window-size=${VIEWPORT.width + 40},${VIEWPORT.height + 140}`],
  });
  // 모든 페이지·프레임 로드 시점에 가드 주입 (1차)
  await context.addInitScript(GUARD_SRC);
  const page = context.pages()[0] || (await context.newPage());
  return { context, page };
}

/** 로드 후 모든 프레임에 가드 재설치 + 에디터 프레임에서 설치 여부 검증 (2차). */
async function installPublishGuard(page, editor) {
  for (const f of page.frames()) {
    try { await f.evaluate(GUARD_SRC); } catch (_) { /* 교차 출처 프레임 등은 무시 */ }
  }
  const okEditor = await editor.evaluate(() => !!window.__naverPublishGuard).catch(() => false);
  const okTop = await page.evaluate(() => !!window.__naverPublishGuard).catch(() => false);
  return okEditor && okTop;
}

async function guardStatus(editor) {
  return editor.evaluate(() => (window.__naverPublishGuard ? { installed: true, blocked: window.__naverPublishGuard.blocked } : { installed: false, blocked: 0 }))
    .catch(() => ({ installed: false, blocked: 0 }));
}

function isLoginPage(url) {
  return /nid\.naver\.com/.test(url);
}

/** 에디터는 iframe#mainFrame 안에 있다. 프레임이 없으면 페이지 자체가 에디터 (실측). */
async function getEditorFrame(page, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const handle = await page.$('iframe#mainFrame');
    if (handle) {
      const frame = await handle.contentFrame();
      if (frame && (await frame.$('.se-title-text').catch(() => null))) return frame;
    } else if (await page.$('.se-title-text')) {
      return page.mainFrame();
    }
    await page.waitForTimeout(500);
  }
  throw new Error('에디터(.se-title-text)를 찾지 못했습니다. 로그인 상태와 셀렉터를 확인하세요 → npm run probe');
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function waitForEnter(message) {
  return new Promise((resolve) => {
    process.stdout.write(message);
    process.stdin.resume();
    process.stdin.once('data', () => { process.stdin.pause(); resolve(); });
  });
}

module.exports = {
  ROOT, PROFILE_DIR, DRAFTS_DIR, WRITE_URL, LOGIN_URL, VIEWPORT, REAL_PUBLISH_SELECTOR, GUARD_SRC,
  launchBrowser, installPublishGuard, guardStatus, isLoginPage, getEditorFrame, timestamp, waitForEnter,
};
