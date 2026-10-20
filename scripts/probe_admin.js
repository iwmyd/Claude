#!/usr/bin/env node
'use strict';
/**
 * 블로그 관리 화면 실측용 probe — 읽기 전용(클릭·입력 안 함).
 * 사용: node scripts/probe_admin.js <label> <url> [<label> <url> ...]
 * 산출물: drafts/probe/admin-<label>.json (프레임별 버튼·입력·링크) + .png
 */
const fs = require('fs');
const path = require('path');
const { launchBrowser, isLoginPage, DRAFTS_DIR } = require('./lib/common');
const OUT = path.join(DRAFTS_DIR, 'probe');
fs.mkdirSync(OUT, { recursive: true });

const pairs = [];
for (let i = 2; i + 1 < process.argv.length + 1; i += 2) if (process.argv[i + 1]) pairs.push([process.argv[i], process.argv[i + 1]]);

const dumpFrame = (f) => f.evaluate(() => {
  const vis = (el) => !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  const out = [];
  for (const el of document.querySelectorAll('button,input,textarea,select,a,label,[role=button],iframe,img[alt],[onclick],span[class*=btn],li[class*=item]')) {
    if (!vis(el) && el.type !== 'file') continue;
    const a = {};
    for (const n of ['id', 'name', 'class', 'type', 'href', 'for', 'title', 'placeholder', 'value', 'src', 'accept', 'alt', 'onclick']) { const v = el.getAttribute(n); if (v) a[n] = v.slice(0, 120); }
    out.push({ tag: el.tagName.toLowerCase(), text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 50), ...a });
  }
  return out.slice(0, 400);
}).catch((e) => [{ error: e.message }]);

(async () => {
  const { context, page } = await launchBrowser();
  try {
    for (const [label, url] of pairs) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3500);
      if (isLoginPage(page.url())) { console.log('❌ 로그인 필요'); break; }
      const frames = [];
      for (const f of page.frames()) frames.push({ url: f.url(), items: await dumpFrame(f) });
      fs.writeFileSync(path.join(OUT, `admin-${label}.json`), JSON.stringify({ finalUrl: page.url(), frames }, null, 2), 'utf8');
      await page.screenshot({ path: path.join(OUT, `admin-${label}.png`) });
      console.log(`· ${label}: ${page.url()} (프레임 ${frames.length})`);
    }
  } finally { await context.close(); }
})();
