#!/usr/bin/env node
'use strict';
/**
 * 블로그 꾸미기 적용 (data/blog-branding.md 기준). 글 편집기·발행과 무관한 관리 화면만 다룬다.
 * 사용: node scripts/apply_branding.js intro      — 소개글 저장
 * 단계별로 실행 → 저장 후 화면 값을 다시 읽어 검증 → drafts/probe/apply-<step>.png
 */
const fs = require('fs');
const path = require('path');
const { launchBrowser, isLoginPage, DRAFTS_DIR } = require('./lib/common');
const OUT = path.join(DRAFTS_DIR, 'probe');
const BLOG = 'iwmyd99';
const INTRO = '뉴스 제목 말고 정부 보도자료·공고문 원문을 끝까지 읽고 정리합니다.\n정책 혜택, 금리·부동산, 환율, 제도 변화를 생활 언어로 풀어드려요.';

const frameBy = async (page, rx, ms = 15000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { const f = page.frames().find((x) => rx.test(x.url())); if (f) return f; await page.waitForTimeout(300); }
  throw new Error('프레임 없음: ' + rx);
};

const CATS = ['정책·혜택', '금리·부동산', '환율·경제', '제도 변화']; // 최종 순서
const RENAME = { from: '게시판', to: '제도 변화' }; // 기존 글(최적요금제 = social)이 들어 있는 기본 카테고리

// [실측] 트리 항목 = #tree li.tree-node span._categoryName, 선택 항목 = li.tree-selected. 새 항목 기본 이름 "게시판"
const readCats = (f) => f.evaluate(() => [...document.querySelectorAll('#tree span._categoryName')].map((s) => s.innerText.trim()));

const TITLE_IMG = path.join(__dirname, '..', 'assets', 'banners', 'blog-2026', 'editorial-966x300.png');
const visDump = (f, tag) => f.evaluate(() => {
  const vis = (el) => !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  return [...document.querySelectorAll('input,button,a,label')].filter((el) => vis(el) || el.type === 'file')
    .map((el) => `${el.tagName.toLowerCase()} | ${(el.innerText || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 30)} | id=${el.id} class=${(el.className || '').toString().slice(0, 80)} type=${el.type || ''}`);
}).then((l) => fs.writeFileSync(path.join(OUT, `title-${tag}.txt`), l.join('\n'), 'utf8'));

const steps = {
  async title(page) {
    await page.goto(`https://admin.blog.naver.com/Remocon.naver?blogId=${BLOG}&loadType=admin&Redirect=Remocon&SelectedMenu=title`, { waitUntil: 'domcontentloaded' });
    const f = page.mainFrame();
    await f.locator('#list_menu1').waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(1500);
    await f.locator('#title_tab2 a._registry').click(); await page.waitForTimeout(1200);
    await visDump(f, '1-registry');
    await page.screenshot({ path: path.join(OUT, 'title-1-registry.png') });
    // 직접등록 탭 안의 파일 입력 (실측 전: 보이는 탭 영역 안의 file input 중 상단 배경용이 아닌 것)
    const files = await f.evaluate(() => [...document.querySelectorAll('input[type=file]')].map((e) => e.id + '|' + e.name + '|' + e.className));
    console.log('· file inputs: ' + files.join(' , '));
    // 1) 이미지 업로드
    await f.setInputFiles('#titleInputFile', TITLE_IMG); await page.waitForTimeout(5000);
    // 2) 영역 높이 300
    const h = f.locator('#title_height');
    await h.click(); await h.fill('300'); await h.press('Enter'); await h.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true }))); await page.waitForTimeout(800);
    // 3) 글자 제목 숨김 (배너 이미지에 블로그명이 들어 있음)
    const chk = f.locator('#chk_title_display');
    if (await chk.isChecked()) { await chk.click({ force: true }); await page.waitForTimeout(500); }
    console.log('· 높이: ' + (await h.inputValue()) + ' / 제목 표시: ' + (await chk.isChecked()));
    await page.screenshot({ path: path.join(OUT, 'title-2-preview.png') });
    // 4) 적용 → 확인 레이어
    await f.locator('a.btn_submit._showConfirmLayer').click(); await page.waitForTimeout(1500);
    await visDump(f, '3-confirm');
    await page.screenshot({ path: path.join(OUT, 'title-3-confirm.png') });
    const cands = f.locator('a:visible, button:visible').filter({ hasText: /^(적용|확인)$/ });
    const n = await cands.count();
    const list = []; for (let i = 0; i < n; i++) list.push(await cands.nth(i).evaluate((e) => e.className));
    console.log('· 확인 후보: ' + JSON.stringify(list));
    const confirm = f.locator('a:visible, button:visible').filter({ hasText: /^(적용|확인)$/ }).filter({ hasNot: f.locator('.btn_submit') });
    const others = []; for (let i = 0; i < n; i++) if (!/btn_submit _showConfirmLayer/.test(list[i])) others.push(i);
    if (others.length !== 1) { console.log('❗ 확인 버튼을 하나로 특정 못함 → 저장 안 하고 중단'); return false; }
    await cands.nth(others[0]).click(); await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(OUT, 'title-4-applied.png') });
    // 5) 검증: 블로그 첫 화면
    await page.goto(`https://blog.naver.com/${BLOG}`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(OUT, 'title-5-blog.png') });
    const imgs = []; for (const fr of page.frames()) imgs.push(...(await fr.evaluate(() => [...document.querySelectorAll('[style*=background], img')].map((e) => (e.getAttribute('style') || e.src || '')).filter((t) => /blogpfthumb|blogskin|title|postfiles|phinf/.test(t)).slice(0, 5)).catch(() => [])));
    console.log('· 블로그 이미지 흔적: ' + imgs.slice(0, 5).join(' | ').slice(0, 400));
    return true;
  },
  // 실측용: 카테고리 하나 추가·이름 입력 후 트리 HTML 덤프 (확인 버튼 안 누름 → 저장 안 됨)
  async 'categories-probe'(page) {
    await page.goto(`https://admin.blog.naver.com/${BLOG}/config/blog`, { waitUntil: 'domcontentloaded' });
    const f = await frameBy(page, /AdminCategoryView/);
    await f.locator('#category_name').waitFor({ state: 'attached', timeout: 15000 });
    const tree = () => f.evaluate(() => { const l = [...document.querySelectorAll('label')].find((x) => /게시판/.test(x.innerText)); let b = l; for (let i = 0; i < 6 && b; i++) b = b.parentElement; return b ? b.outerHTML : ''; });
    fs.writeFileSync(path.join(OUT, 'cat-tree-0.html'), await tree(), 'utf8');
    await f.locator('img._addCategoryView').click(); await page.waitForTimeout(800);
    await f.locator('#category_name').fill('테스트'); await f.locator('#category_name').press('Tab'); await page.waitForTimeout(500);
    fs.writeFileSync(path.join(OUT, 'cat-tree-1.html'), await tree(), 'utf8');
    console.log('· 덤프 완료 (저장 안 함)');
    return true;
  },
  async categories(page) {
    await page.goto(`https://admin.blog.naver.com/${BLOG}/config/blog`, { waitUntil: 'domcontentloaded' });
    const f = await frameBy(page, /AdminCategoryView/);
    await f.locator('#category_name').waitFor({ state: 'attached', timeout: 15000 });
    const before = await readCats(f);
    console.log('· 기존: ' + before.join(' / '));
    const pick = async (name) => {
      const i = (await readCats(f)).indexOf(name);
      if (i < 0) throw new Error('카테고리 없음: ' + name);
      await f.locator('#tree span._categoryName').nth(i).click(); await page.waitForTimeout(400);
    };
    const setName = async (name) => {
      const inp = f.locator('#category_name');
      await inp.click(); await inp.fill(''); await page.keyboard.insertText(name); await page.keyboard.press('End'); await inp.press('Tab'); await inp.evaluate((el) => { el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); }); await page.waitForTimeout(500);
      const sel = await f.evaluate(() => { const s = document.querySelector('#tree li.tree-selected span._categoryName'); return s ? s.innerText.trim() : ''; });
      if (sel !== name) throw new Error(`이름 반영 실패: "${sel}" ≠ "${name}"`);
    };
    if (before.includes(RENAME.from) && !before.includes(RENAME.to)) { await pick(RENAME.from); await setName(RENAME.to); }
    for (const name of CATS) {
      const now = await readCats(f);
      if (now.includes(name)) continue;
      await f.locator('#tree span._categoryName').first().click(); await page.waitForTimeout(400);
      const n0 = (await readCats(f)).length;
      await f.locator('img._addCategoryView').click({ force: true }); await page.waitForTimeout(1500);
      console.log('· 추가 클릭: ' + n0 + ' → ' + (await readCats(f)).length + ' ' + JSON.stringify(await readCats(f)));
      await setName(name);
    }
    console.log('· 추가 후: ' + JSON.stringify(await readCats(f)));
    // 순서 맞추기: 원하는 순서대로 하나씩 "맨아래" 로 보내면 최종 순서가 CATS 와 같아진다
    for (const name of CATS) { await pick(name); await f.locator('img._moveLast').click(); await page.waitForTimeout(300); }
    const staged = await readCats(f);
    console.log('· 저장 전: ' + staged.join(' / '));
    await f.locator('#submit_button').click();
    await page.waitForTimeout(3500);
    await page.goto(`https://admin.blog.naver.com/${BLOG}/config/blog`, { waitUntil: 'domcontentloaded' });
    const f2 = await frameBy(page, /AdminCategoryView/);
    await f2.locator('#category_name').waitFor({ state: 'attached', timeout: 15000 });
    const after = (await readCats(f2)).filter((c) => CATS.includes(c) || c === RENAME.from);
    const ok = JSON.stringify(after) === JSON.stringify(CATS);
    console.log(`${ok ? '✅' : '❌'} 카테고리 저장 확인: ${after.join(' / ')}`);
    return ok;
  },

  async intro(page) {
    await page.goto(`https://admin.blog.naver.com/${BLOG}/config/bloginfo`, { waitUntil: 'domcontentloaded' });
    const f = await frameBy(page, /AdminUserBasic/);
    const ta = f.locator('#frmIntroduce');
    await ta.waitFor({ state: 'visible', timeout: 15000 });
    console.log('· 기존 소개글: ' + JSON.stringify(await ta.inputValue()));
    await ta.fill(INTRO);
    await f.locator('input._btnConfirm[value="확인"]').click();
    await page.waitForTimeout(3000);
    // 검증: 다시 열어서 값 확인
    await page.goto(`https://admin.blog.naver.com/${BLOG}/config/bloginfo`, { waitUntil: 'domcontentloaded' });
    const f2 = await frameBy(page, /AdminUserBasic/);
    const got = await f2.locator('#frmIntroduce').inputValue();
    const ok = got.replace(/\r/g, '') === INTRO;
    console.log(`${ok ? '✅' : '❌'} 소개글 저장 확인: ${JSON.stringify(got)}`);
    return ok;
  },
};

(async () => {
  const step = process.argv[2];
  if (!steps[step]) { console.error('단계: ' + Object.keys(steps).join(', ')); process.exit(1); }
  const { context, page } = await launchBrowser();
  // 관리 화면의 alert/confirm("저장되었습니다" 등) 은 수락하고 기록
  page.on('dialog', async (d) => { console.log(`· [${d.type()}] ${d.message()}`); await d.accept(); });
  let ok = false;
  try {
    await page.goto(`https://admin.blog.naver.com/${BLOG}`, { waitUntil: 'domcontentloaded' });
    if (isLoginPage(page.url())) throw new Error('로그인 필요 → npm run login');
    ok = await steps[step](page);
  } catch (e) { console.error('❌ ' + e.message); }
  finally {
    await page.screenshot({ path: path.join(OUT, `apply-${step}.png`) }).catch(() => {});
    await context.close();
    process.exitCode = ok ? 0 : 2;
  }
})();
