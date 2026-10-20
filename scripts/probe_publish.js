#!/usr/bin/env node
'use strict';
/**
 * 발행 패널(예약 UI)·저장 글 목록 실측용 probe. 입력·저장·발행 안 함.
 * 클릭: 발행 패널 열기 버튼 → "예약" 옵션 / Escape 후 "저장" 숫자(목록 열기). 진짜 발행 버튼은 가드가 차단.
 * 산출물: drafts/probe/publish-<step>.json + .png
 */
const fs = require('fs');
const path = require('path');
const { launchBrowser, installPublishGuard, isLoginPage, getEditorFrame, WRITE_URL, DRAFTS_DIR, REAL_PUBLISH_SELECTOR } = require('./lib/common');
const OUT = path.join(DRAFTS_DIR, 'probe');
fs.mkdirSync(OUT, { recursive: true });

const RX = /예약|발행 ?시간|현재|날짜|시간|time|date|hour|minute|reserv|radio|저장|임시|목록|불러|count|publish/i;

async function dump(ed, page, step) {
  const items = await ed.evaluate((src) => {
    const rx = new RegExp(src, 'i');
    const vis = (el) => !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
    const out = [];
    for (const el of document.querySelectorAll('button,input,select,label,a,li,[role],span,div')) {
      if (!vis(el)) continue;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
      const attrs = [...el.attributes].map((a) => `${a.name}=${a.value}`).join(' ');
      const hay = `${own} ${attrs}`;
      if (!rx.test(hay)) continue;
      if (el.tagName === 'DIV' && !own) continue;
      out.push({ tag: el.tagName.toLowerCase(), text: (el.innerText || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 60), attrs: attrs.slice(0, 300) });
    }
    return out.slice(0, 300);
  }, RX.source);
  fs.writeFileSync(path.join(OUT, `publish-${step}.json`), JSON.stringify(items, null, 2), 'utf8');
  await page.screenshot({ path: path.join(OUT, `publish-${step}.png`) });
  console.log(`· ${step}: ${items.length}개 요소 덤프`);
}

(async () => {
  const { context, page } = await launchBrowser();
  try {
    await page.goto(WRITE_URL, { waitUntil: 'domcontentloaded' });
    if (isLoginPage(page.url())) throw new Error('로그인 필요');
    const ed = await getEditorFrame(page);
    if (!(await installPublishGuard(page, ed))) throw new Error('가드 설치 실패 → 중단');
    const cancel = ed.locator('.se-popup-button-cancel').first();
    if (await cancel.isVisible().catch(() => false)) await cancel.click();
    await page.waitForTimeout(1500);
    await dump(ed, page, '0-editor');

    const opener = ed.locator(`button[class*="publish_btn"]:not(${REAL_PUBLISH_SELECTOR})`).first();
    await opener.click();
    await ed.locator('input#tag-input').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(800);
    await dump(ed, page, '1-panel');

    const resv = ed.locator('label[for="radio_time2"]').first();
    if (await resv.isVisible().catch(() => false)) {
      if (await resv.evaluate((el, s) => !!el.closest(s), REAL_PUBLISH_SELECTOR)) throw new Error('안전 중단: 예약 옵션이 발행 버튼으로 잡힘');
      await resv.click(); await page.waitForTimeout(1000);
      await dump(ed, page, '2-reserve');
      const html = await ed.evaluate(() => { const r = document.querySelector("#radio_time2"); let b = r; for (let i = 0; i < 5 && b; i++) b = b.parentElement; return b ? b.outerHTML : ""; });
      fs.writeFileSync(path.join(OUT, "publish-2-reserve.html"), html, "utf8");
    } else console.log('❗ 예약 옵션 못 찾음 — 1-panel 덤프 확인');

    await page.keyboard.press('Escape'); await page.waitForTimeout(600);
    await page.keyboard.press('Escape'); await page.waitForTimeout(600);
    const cnt = ed.locator('button[class*="save_count"], button[class*="count"]').first();
    if (await cnt.isVisible().catch(() => false)) { await cnt.click(); await page.waitForTimeout(1500); await dump(ed, page, '3-savelist');
      const html = await ed.evaluate(() => { const d = document.querySelector("[class*=date__]"); let b = d; for (let i = 0; i < 4 && b; i++) b = b.parentElement; return b ? b.outerHTML : ""; });
      fs.writeFileSync(path.join(OUT, "publish-3-savelist.html"), html, "utf8"); }
    else console.log('❗ 저장 숫자 버튼 못 찾음');
  } catch (e) { console.error('❌ ' + e.message); }
  finally { await context.close(); }
})();
