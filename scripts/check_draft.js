#!/usr/bin/env node
'use strict';
/**
 * 초안 품질 자동 검수 — 글쓰기 공식(CLAUDE.md)을 숫자로 확인한다. 브라우저 없음.
 * 사용: node scripts/check_draft.js drafts/<이름>.json
 *
 * meta 필드(선택이지만 /write 는 항상 채운다):
 * {
 *   "mainKeyword": "2026 청년도약계좌 조건",
 *   "subKeywords": ["청년도약계좌 신청방법", "청년도약계좌 해지"],
 *   "postType": "policy | rate-realestate | market | social",
 *   "sponsored": false | { "type": "원고료", "advertiser": "OO", "customDisclosure": null },
 *   "persona": "…", "hook": "손실 회피형 | 현장 몰입형 | 반전형 | 공감형", "authority": "솔직함형 | 사례량형",
 *   "sources": ["기획재정부 보도자료 2026-10-01"],
 *   "checklist": { "대상(자격 조건)": "확인", "신청 기간": "미확인", ... }
 * }
 * 종료 코드: ❌ 가 하나라도 있으면 1.
 */
const path = require('path');
const { loadDraft } = require('./lib/draft');

const file = process.argv[2];
if (!file) { console.error('사용법: node scripts/check_draft.js drafts/<이름>.json'); process.exit(1); }
const { draft, errors, warnings } = loadDraft(path.resolve(file));
const out = [];
const ok = (m) => out.push('✅ ' + m);
const warn = (m) => out.push('⚠️ ' + m);
const fail = (m) => out.push('❌ ' + m);
errors.forEach(fail);
warnings.forEach(warn);
if (!draft) { console.log(out.join('\n')); process.exit(1); }

const meta = draft.meta || {};
const blocks = draft.blocks || [];
const texts = blocks.filter((b) => b.type === 'text');
const allText = blocks.map((b) => (b.type === 'image' ? b.caption || '' : b.text || '')).join('\n');
const len = (s) => [...s].length;
const noSpace = (s) => s.replace(/\s+/g, '');
const count = (hay, needle) => (needle ? hay.split(needle).length - 1 : 0);

// 1) 분량
const chars = len(noSpace(allText));
const charsWs = len(allText.replace(/\n/g, ''));
const maxChars = meta.postType === 'policy' || meta.postType === 'social' ? 3000 : 2500;
if (charsWs < 1800) warn(`분량 ${charsWs}자(공백 포함, 공백 제외 ${chars}자) — 권장 1,800자 이상`);
else if (charsWs > maxChars) warn(`분량 ${charsWs}자 — 권장 상한 ${maxChars}자 초과`);
else ok(`분량 ${charsWs}자 (공백 제외 ${chars}자)`);

// 2) 제목
const title = draft.title || '';
const tl = len(title);
if (tl >= 25 && tl <= 32) ok(`제목 ${tl}자`); else warn(`제목 ${tl}자 (권장 25~32자)`);
const badTitleChars = title.replace(/[가-힣ㄱ-ㅎa-zA-Z0-9\s,.?%·'"()~\-]/g, '');
if (badTitleChars) fail(`제목 특수문자 금지: "${badTitleChars}"`);

// 3) 메인 키워드
const kw = (meta.mainKeyword || '').trim();
if (!kw) fail('meta.mainKeyword 없음 — 메인 키워드를 정하세요');
else {
  const kwN = noSpace(kw);
  const titlePos = noSpace(title).indexOf(kwN);
  if (titlePos < 0) {
    // 키워드가 여러 단어면 첫 단어라도 앞쪽에 있는지
    fail(`제목에 메인 키워드 "${kw}" 없음`);
  } else if (titlePos > noSpace(title).length / 2) warn(`메인 키워드가 제목 뒤쪽에 있음 — 앞쪽으로`);
  else ok('제목 앞쪽에 메인 키워드');
  const nBody = count(noSpace(allText), kwN);
  const nExact = count(allText, kw);
  if (nBody < 5 || nBody > 7) warn(`메인 키워드 본문 ${nBody}회 (권장 5~7회)`); else ok(`메인 키워드 본문 ${nBody}회`);
  if (nExact < 1) fail(`띄어쓰기까지 검색어와 동일한 "${kw}" 가 본문에 1회도 없음`); else ok(`검색어 원형 일치 ${nExact}회`);
  // 첫 문단(협찬 표기 블록 제외)·마지막 문단
  const firstIdx = meta.sponsored ? 1 : 0;
  const firstPara = texts[firstIdx] ? texts[firstIdx].text : '';
  // 마지막 문단 = 결론 문단. 맨 끝이 이웃추가 CTA 면 그 앞 문단까지 본다
  const lastPara = texts.slice(-2).map((b) => b.text).join('\n');
  if (!noSpace(firstPara).includes(kwN)) fail('첫 문단에 메인 키워드 없음'); else ok('첫 문단 키워드');
  if (!noSpace(lastPara).includes(kwN)) fail('마지막 문단에 메인 키워드 없음'); else ok('마지막 문단 키워드');
  // 캡션 키워드 — 사진의 절반 정도
  const imgs = blocks.filter((b) => b.type === 'image');
  if (imgs.length) {
    const withKw = imgs.filter((b) => noSpace(b.caption || '').includes(kwN)).length;
    const ratio = withKw / imgs.length;
    if (ratio < 0.3 || ratio > 0.7) warn(`캡션 키워드 ${withKw}/${imgs.length}장 (권장 절반 정도)`); else ok(`캡션 키워드 ${withKw}/${imgs.length}장`);
  }
}

// 4) 서브 키워드 → 소제목
const subtitles = blocks.filter((b) => b.type === 'subtitle').map((b) => b.text);
const subs = meta.subKeywords || [];
if (subs.length < 2 || subs.length > 3) warn(`서브 키워드 ${subs.length}개 (권장 2~3개)`);
subs.forEach((s) => {
  if (subtitles.some((t) => noSpace(t).includes(noSpace(s)))) ok(`서브 키워드 소제목 배치: ${s}`);
  else warn(`서브 키워드 "${s}" 가 소제목에 없음`);
});

// 5) 사진·인용구
const nImg = blocks.filter((b) => b.type === 'image').length;
if (nImg < 10 || nImg > 15) warn(`사진 ${nImg}장 (권장 10~15장)`); else ok(`사진 ${nImg}장`);
const nQuote = blocks.filter((b) => b.type === 'quote').length;
if (nQuote < 2 || nQuote > 4) warn(`인용구 ${nQuote}개 (권장 2~4개)`); else ok(`인용구 ${nQuote}개`);

// 6) 리듬 — 텍스트만 연속 구간
let run = 0; let maxRun = 0;
for (const b of blocks) {
  if (b.type === 'text') { run += len(noSpace(b.text)); maxRun = Math.max(maxRun, run); } else run = 0;
}
if (maxRun >= 500) fail(`텍스트만 ${maxRun}자 연속 — 실패작 기준(500자). 인용구/구분선/사진/소제목으로 끊으세요`);
else if (maxRun > 400) warn(`텍스트 연속 최대 ${maxRun}자 (300~400자마다 리듬 장치 권장)`);
else ok(`텍스트 연속 최대 ${maxRun}자`);
texts.forEach((b, i) => {
  const lines = b.text.split('\n').filter((l) => l.trim());
  if (lines.length > 5) warn(`text 블록 #${i + 1}: ${lines.length}줄 (한 블록 3~5줄)`);
  lines.filter((l) => len(l) > 70).forEach((l) => warn(`긴 문장(${len(l)}자) — 한 문장 한 줄로 쪼개기: "${l.slice(0, 25)}…"`));
});

// 7) 홍보 냄새·연락처·링크
const links = (allText.match(/https?:\/\/\S+/g) || []).length;
if (links > 1) fail(`외부 링크 ${links}개 (최대 1개)`);
const contacts = (allText.match(/0\d{1,2}[-\s.]?\d{3,4}[-\s.]?\d{4}|[\w.+-]+@[\w-]+\.[\w.]+/g) || []).length;
if (contacts > 1) fail(`연락처 ${contacts}회 (글 전체 1회)`);
const AD_WORDS = ['최저가', '무조건', '100%', '대박', '강력 추천', '강력추천', '지금 바로 구매', '파격', '역대급', '할인 코드', '클릭하세요'];
const adHits = AD_WORDS.filter((w) => allText.includes(w));
if (adHits.length) warn(`광고 어휘: ${adHits.join(', ')}`);
const INVEST = ['매수 추천', '매수추천', '지금 사세요', '무조건 오른', '수익 보장', '원금 보장', '확정 수익', '종목 추천'];
const investHits = INVEST.filter((w) => allText.includes(w));
if (investHits.length) fail(`투자 권유·보장 표현 금지: ${investHits.join(', ')}`);
if (/TODO/.test(allText) || /TODO/.test(title)) fail('본문에 TODO 자리표시자가 남아 있음 (profile.md 미기입 정보)');

// 8) 협찬 (표시광고법 — 생략 불가)
if (meta.sponsored === undefined) fail('meta.sponsored 미기재 — 협찬·체험단 여부를 사용자에게 확인하세요');
else if (meta.sponsored) {
  const first = blocks[0];
  if (!first || first.type !== 'text') fail('협찬 글: 첫 블록이 일반 text 블록이어야 함 (quote 금지)');
  else if (!/원고료|협찬|광고|대가|지원받아/.test(first.text)) fail('협찬 글: 첫 블록에 대가 표기 문구 없음');
  else ok('협찬 표기 첫 블록');
  const lies = ['내돈내산', '광고 아님', '광고아님', '협찬 아님', '협찬아님', '직접 구매했', '내 돈 내고'];
  const lieHits = lies.filter((w) => allText.includes(w));
  if (lieHits.length) fail(`협찬 글 거짓 부인 표현(위법): ${lieHits.join(', ')}`);
} else ok('협찬 아님(사용자 확인)');

// 9) 출처·필수 정보 체크리스트
if (['policy', 'rate-realestate', 'market', 'social'].includes(meta.postType) && !(meta.sources || []).length) {
  warn('meta.sources 비어 있음 — 수치·조건의 출처(사용자 제공 원문)를 기록하세요');
}
const cl = meta.checklist || {};
const unconfirmed = Object.entries(cl).filter(([, v]) => v !== '확인' && v !== '해당없음').map(([k]) => k);
if (!Object.keys(cl).length) warn('meta.checklist 비어 있음 — 유형별 필수 정보 대조를 기록하세요');
else if (unconfirmed.length) warn(`필수 정보 미확인: ${unconfirmed.join(', ')} → 사용자에게 묻거나 본문에서 빼세요`);
else ok('필수 정보 체크리스트 전 항목 확인/해당없음');

['persona', 'hook', 'authority'].forEach((k) => { if (!meta[k]) warn(`meta.${k} 미기재`); });

// 10) 태그
if (draft.tags.length >= 5 && draft.tags.length <= 10) ok(`태그 ${draft.tags.length}개`);

const bad = out.filter((l) => l.startsWith('❌')).length;
const w = out.filter((l) => l.startsWith('⚠️')).length;
console.log(`초안 검수: ${path.basename(file)}\n` + out.join('\n') + `\n\n요약: ❌ ${bad} · ⚠️ ${w} · ✅ ${out.length - bad - w}`);
process.exitCode = bad ? 1 : 0;
