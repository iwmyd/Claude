#!/usr/bin/env node
'use strict';
/**
 * 오프라인 회귀 테스트 — 네이버 접속·로그인 없이 모의 에디터로 naver_draft.js 전체 흐름을 돌린다.
 * 검사: 발행 0회(가드), 본문·제목·태그·저장·전문 대조 성공(종료 코드 0).
 * 스크립트를 고친 뒤 실제 실행(--dry-run) 전에 먼저 `npm test`.
 *
 * Chromium 경로가 기본과 다르면: PW_CHROMIUM=/path/to/chrome npm test
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const common = require('../scripts/lib/common');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'naver-mock-'));
const html = fs.readFileSync(path.join(__dirname, 'mock-editor.html'), 'utf8');
let mockState = null;

common.launchBrowser = async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const context = await browser.newContext({ viewport: common.VIEWPORT });
  await context.addInitScript(common.GUARD_SRC);
  await context.route('**/GoBlogWrite.naver', (r) => r.fulfill({
    contentType: 'text/html; charset=utf-8',
    body: '<iframe id="mainFrame" src="https://blog.naver.com/mock-editor" style="width:1580px;height:980px"></iframe>',
  }));
  await context.route('**/mock-editor', (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
  const page = await context.newPage();
  const close = context.close.bind(context);
  context.close = async () => {
    const ed = page.frames().find((f) => f.url().includes('mock-editor'));
    if (ed) mockState = await ed.evaluate(() => ({ published: window.PUBLISHED || 0, saved: window.SAVED || 0 }));
    await close();
    await browser.close();
  };
  return { context, page };
};

(async () => {
  const imgs = [];
  for (let i = 1; i <= 3; i++) {
    const p = path.join(tmp, `p${i}.jpg`);
    await sharp({ create: { width: 60, height: 40, channels: 3, background: '#888' } }).jpeg().toFile(p);
    imgs.push(p);
  }
  const draft = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'drafts', 'example.json'), 'utf8'));
  let k = 0;
  draft.blocks.forEach((b) => { if (b.type === 'image') b.path = imgs[k++]; });
  // 이모지 분리 입력 검증용
  draft.blocks[draft.blocks.length - 1].text += '\n오늘도 확인 완료 ✅ 다음 글에서 뵐게요';
  const draftPath = path.join(tmp, 'mock.json');
  fs.writeFileSync(draftPath, JSON.stringify(draft), 'utf8');

  process.argv = [process.argv[0], 'naver_draft.js', draftPath];
  require('../scripts/naver_draft.js');

  process.on('exit', (code) => {
    const fail = [];
    if (!mockState) fail.push('모의 상태를 읽지 못함');
    else {
      if (mockState.published !== 0) fail.push(`발행 버튼이 ${mockState.published}회 실행됨 — 가드 실패!`);
      if (mockState.saved !== 1) fail.push('임시저장이 실행되지 않음');
    }
    if (code !== 0) fail.push(`naver_draft.js 종료 코드 ${code}`);
    console.log(fail.length ? `\n❌ 모의 테스트 실패:\n  - ${fail.join('\n  - ')}\n  (산출물: ${tmp})` : '\n✅ 모의 테스트 통과 (발행 0회 · 저장 1회 · 전문 대조 일치)');
    process.exitCode = fail.length ? 1 : 0;
  });
})();
