// 네이버 서치어드바이저 "웹 페이지 수집" 요청 (실측 2026-10-23) — 블로그용 로그인 세션(naver-profile)을 그대로 쓴다. 클릭은 확인 버튼만.
// 사용: node scripts/searchadvisor_crawl.js <스크린샷 폴더> <slug> [slug…]   (Git Bash 에서 /로 시작하는 인자는 Windows 경로로 바뀌므로 slug 만 넘긴다)
// 입력칸은 전체 주소(https://aipomcalc.com/slug/)를 받는다. 처리에 수 초 걸림(스피너) → 끝날 때까지 기다린다. 중복이면 "이미 요청된 URL입니다." 창.
const path = require('path');
const common = require('./lib/common');
const [out, ...slugs] = process.argv.slice(2); const paths = slugs.map((s) => 'https://aipomcalc.com/' + s + '/');
(async () => {
  const { context, page } = await common.launchBrowser({ headless: false });
  const msgs = [];
  page.on('dialog', async (d) => { msgs.push('DIALOG: ' + d.message()); await d.accept(); });
  await page.goto('https://searchadvisor.naver.com/console/site/request/crawl?site=https%3A%2F%2Faipomcalc.com', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  for (const p of paths) {
    msgs.length = 0;
    const inp = page.locator('input[type="text"]').last();
    await inp.fill(p);
    await page.locator('button:has-text("확인")').first().click();
    for (let t = 0; t < 60; t++) { await page.waitForTimeout(1000); if (!(await page.locator('.v-progress-circular').count())) break; }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: out + '/sa-' + p.split('/').filter(Boolean).pop() + '.png' });
    const snack = await page.locator('.v-snack__content, .v-alert, .v-messages__message, [role="alert"], .v-dialog--active').allInnerTexts().catch(() => []);
    console.log(p, '→', JSON.stringify([...msgs, ...snack.map((t) => t.trim()).filter(Boolean)]));
    if ([...msgs, ...snack].some((t) => /초과|제한|한도/.test(t))) { console.log('STOP: 한도'); break; }
    const dlgBtn = page.locator('.v-dialog--active button:has-text("확인")'); if (await dlgBtn.count()) await dlgBtn.first().click();
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out + '/sa3.png' });
  const list = await page.innerText('body'); const m = list.split('수집 요청 내역')[1] || ''; console.log(m.slice(0, 1500));
  await context.close();
})();
