/**
 * preview_draft.js — 임시저장된 최신 글을 에디터에 불러와 화면에 띄워 둔다 (입력·저장 안 함).
 * 발행 가드는 naver_draft.js 와 동일하게 설치한다 → 이 창에서는 발행 불가. 발행은 평소 브라우저에서.
 * 사용: node scripts/preview_draft.js [--minutes 30]   (창을 닫으면 종료)
 */
const { launchBrowser, installPublishGuard, isLoginPage, getEditorFrame, WRITE_URL } = require('./lib/common');

const mi = process.argv.indexOf('--minutes');
const MINUTES = mi > 0 ? Number(process.argv[mi + 1]) || 30 : 30;

(async () => {
  const { context, page } = await launchBrowser();
  await page.goto(WRITE_URL, { waitUntil: 'domcontentloaded' });
  if (isLoginPage(page.url())) { console.error('로그인이 필요합니다 → npm run login'); await context.close(); process.exit(1); }
  const ed = await getEditorFrame(page);
  if (!(await installPublishGuard(page, ed))) { console.error('발행 가드 설치 확인 실패 → 미리보기 중단'); await context.close(); process.exit(1); }
  console.log('· 발행 가드: 설치 확인');

  // 저장 글 목록 → 최신 글 열기 [실측 2026-10-21: 숫자 버튼 save_count_btn / 항목 article_button (옆 delete_button 은 절대 클릭 금지)]
  const cancel = ed.locator('.se-popup-button-cancel').first();
  if (await cancel.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) await cancel.click();
  await ed.locator('button[class*="save_count_btn"]').first().click().catch(() => {});
  const item = ed.locator('button[class*="article_button"]').first();
  if (await item.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
    console.log('· 저장 글 열기: ' + (await item.locator('[class*="title__"]').innerText().catch(() => '')).trim());
    await item.click();
  } else {
    console.log('❗ 저장 글 목록을 못 열었습니다 — 우상단 "저장" 숫자를 눌러 직접 여세요');
  }
  await page.waitForTimeout(2500);
  const title = await ed.locator('.se-title-text').first().innerText().catch(() => '');
  console.log('· 불러온 제목: ' + (title.trim() || '(없음)'));
  console.log(`· 창을 닫거나 ${MINUTES}분이 지나면 종료됩니다. (이 창에서는 발행 버튼이 막혀 있음)`);

  await Promise.race([
    new Promise((r) => context.on('close', r)),
    new Promise((r) => page.on('close', r)),
    page.waitForTimeout(MINUTES * 60000).catch(() => {}),
  ]);
  await context.close().catch(() => {});
})();
