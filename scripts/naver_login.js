#!/usr/bin/env node
'use strict';
/**
 * 네이버 로그인 1회 설정.
 * - 사용자가 열린 브라우저에서 직접 로그인한다. 이 스크립트는 아이디·비밀번호를 입력/저장하지 않는다.
 * - 세션은 naver-profile/ (persistentContext)에 남는다. 이 폴더는 외부 공유 금지.
 * 사용: node scripts/naver_login.js
 */
const { launchBrowser, LOGIN_URL, WRITE_URL, isLoginPage, getEditorFrame } = require('./lib/common');

(async () => {
  const { context, page } = await launchBrowser();
  try {
    await page.goto(WRITE_URL, { waitUntil: 'domcontentloaded' });
    if (!isLoginPage(page.url())) {
      try {
        await getEditorFrame(page, 15000);
        console.log('✅ 이미 로그인되어 있습니다. 글쓰기 에디터 진입 확인.');
        return;
      } catch (_) { /* 아래 로그인 절차로 */ }
    }

    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
    console.log('👉 열린 브라우저에서 직접 로그인하세요. (로그인 상태 유지 체크 권장, 2단계 인증 가능)');
    console.log('   최대 5분 기다립니다. 비밀번호는 이 툴이 저장하지 않습니다.');

    const deadline = Date.now() + 5 * 60 * 1000;
    while (Date.now() < deadline && isLoginPage(page.url())) {
      await page.waitForTimeout(1000);
    }
    if (isLoginPage(page.url())) throw new Error('5분 안에 로그인이 완료되지 않았습니다. 다시 실행하세요.');

    // 검증: 실제로 에디터 진입이 되는지 확인 ("했다"가 아니라 "됐는지 확인")
    await page.goto(WRITE_URL, { waitUntil: 'domcontentloaded' });
    if (isLoginPage(page.url())) throw new Error('로그인 후에도 글쓰기 페이지가 로그인으로 돌아갑니다.');
    await getEditorFrame(page, 30000);
    console.log('✅ 로그인 세션 저장 완료 — 글쓰기 에디터 진입 확인. (naver-profile/ 는 외부 공유 금지)');
    console.log('   ※ 열린 "작성 중인 글" 팝업이 보여도 그대로 두세요. 이 스크립트는 아무것도 저장하지 않습니다.');
  } catch (e) {
    console.error('❌ ' + e.message);
    process.exitCode = 1;
  } finally {
    await context.close();
  }
})();
