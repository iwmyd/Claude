'use strict';
/**
 * 초안 JSON 로드·검증·정규화.
 *
 * 포맷:
 * {
 *   "title": "제목 25~32자",
 *   "blocks": [
 *     { "type": "text", "text": "한 문장 한 줄\n두 번째 줄" },
 *     { "type": "subtitle", "text": "소제목" },
 *     { "type": "image", "path": "input/photos/a.jpg", "caption": "선택" },
 *     { "type": "quote", "text": "핵심 문장" },
 *     { "type": "divider" }
 *   ],
 *   "tags": ["태그1", "#태그2"],                    // 발행 패널에 자동 입력 (최대 30, 권장 5~10)
 *   "place": { "query": "검색어", "name": "정확한 장소명" },   // 선택 — 지도는 글 맨 끝
 *   "video": { "path": "input/videos/a.mp4", "title": "40자 이내" }, // 선택 — 첫 text 블록 직후
 *   "meta": { ... }                                  // 선택 — 검수용(check_draft.js). 업로드에는 쓰이지 않음
 * }
 */
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./common');

const BLOCK_TYPES = new Set(['text', 'subtitle', 'image', 'quote', 'divider']);
const VIDEO_TITLE_MAX = 40;
const TAG_MAX = 30;

function resolvePath(p) {
  return path.isAbsolute(p) ? p : path.join(ROOT, p);
}

function loadDraft(file) {
  const errors = [];
  const warnings = [];
  let draft;
  try {
    draft = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return { draft: null, errors: [`JSON 파싱 실패: ${e.message}`], warnings };
  }

  if (typeof draft.title !== 'string' || !draft.title.trim()) errors.push('title 이 비어 있습니다.');
  if (!Array.isArray(draft.blocks) || draft.blocks.length === 0) errors.push('blocks 가 비어 있습니다.');

  (draft.blocks || []).forEach((b, i) => {
    const at = `blocks[${i}]`;
    if (!b || !BLOCK_TYPES.has(b.type)) { errors.push(`${at}: 알 수 없는 type "${b && b.type}"`); return; }
    if (['text', 'subtitle', 'quote'].includes(b.type) && (typeof b.text !== 'string' || !b.text.trim())) {
      errors.push(`${at}: ${b.type} 블록의 text 가 비어 있습니다.`);
    }
    if (b.type === 'subtitle' && /\n/.test(b.text || '')) errors.push(`${at}: 소제목은 한 줄이어야 합니다.`);
    if (b.type === 'image') {
      if (!b.path) errors.push(`${at}: image.path 가 없습니다.`);
      else if (!fs.existsSync(resolvePath(b.path))) errors.push(`${at}: 사진 파일 없음 → ${b.path}`);
    }
  });

  // 사진 재사용 금지
  const seen = new Map();
  (draft.blocks || []).forEach((b, i) => {
    if (b && b.type === 'image' && b.path) {
      const key = path.resolve(resolvePath(b.path));
      if (seen.has(key)) errors.push(`blocks[${i}]: 사진 재사용 금지 — blocks[${seen.get(key)}]와 같은 파일`);
      else seen.set(key, i);
    }
  });

  if (!(draft.blocks || []).some((b) => b && b.type === 'text')) errors.push('text 블록이 최소 1개 필요합니다.');

  // tags
  if (draft.tags != null && !Array.isArray(draft.tags)) errors.push('tags 는 배열이어야 합니다.');
  let tags = (draft.tags || []).map((t) => String(t).trim().replace(/^#+/, '').trim()).filter(Boolean);
  tags = [...new Set(tags)];
  if (tags.length > TAG_MAX) { warnings.push(`태그 ${tags.length}개 → 최대 ${TAG_MAX}개로 자름`); tags = tags.slice(0, TAG_MAX); }
  if (tags.length < 5 || tags.length > 10) warnings.push(`태그 ${tags.length}개 (권장 5~10개)`);
  draft.tags = tags;

  // place
  if (draft.place != null) {
    if (typeof draft.place !== 'object' || !draft.place.query) errors.push('place.query 가 필요합니다.');
    else if (!draft.place.name) draft.place.name = draft.place.query;
  }

  // video
  if (draft.video != null) {
    if (!draft.video.path) errors.push('video.path 가 필요합니다.');
    else if (!fs.existsSync(resolvePath(draft.video.path))) errors.push(`동영상 파일 없음 → ${draft.video.path}`);
    // 영상 제목: video.title > 글 제목 > 기본값
    let vt = (draft.video.title || draft.title || '동영상').trim();
    if ([...vt].length > VIDEO_TITLE_MAX) {
      warnings.push(`동영상 제목 ${[...vt].length}자 → ${VIDEO_TITLE_MAX}자로 자름`);
      vt = [...vt].slice(0, VIDEO_TITLE_MAX).join('');
    }
    draft.video.title = vt;
  }

  const titleLen = [...(draft.title || '')].length;
  if (titleLen < 25 || titleLen > 32) warnings.push(`제목 ${titleLen}자 (권장 25~32자)`);

  return { draft, errors, warnings };
}

/** 에디터에 들어가야 할 텍스트 조각들 (순서대로). 본문 대조용. */
function expectedPieces(draft) {
  const out = [];
  for (const b of draft.blocks) {
    if (b.type === 'text' || b.type === 'quote') {
      for (const line of b.text.split('\n')) if (line.trim()) out.push({ kind: b.type, text: line.trim() });
    } else if (b.type === 'subtitle') {
      out.push({ kind: 'subtitle', text: b.text.trim() });
    } else if (b.type === 'image' && b.caption && b.caption.trim()) {
      out.push({ kind: 'caption', text: b.caption.trim() });
    }
  }
  return out;
}

/** 비교용 정규화: 모든 공백·제로폭 문자 제거 */
function norm(s) {
  return String(s || '').replace(/[\s ​‌‍﻿]+/g, '');
}

/** 자동화가 3회 실패했을 때 쓰는 수동 붙여넣기용 원고 */
function manualManuscript(draft) {
  const L = [];
  L.push(`[제목] ${draft.title}`, '');
  let firstTextDone = false;
  for (const b of draft.blocks) {
    if (b.type === 'text') {
      L.push(b.text, '');
      if (!firstTextDone && draft.video) L.push(`[동영상 첨부: ${draft.video.path} / 제목: ${draft.video.title}]`, '');
      firstTextDone = true;
    } else if (b.type === 'subtitle') L.push(`[소제목 · 크기 19] ${b.text}`, '');
    else if (b.type === 'quote') L.push(`[인용구] ${b.text}`, '');
    else if (b.type === 'divider') L.push('[구분선]', '');
    else if (b.type === 'image') L.push(`[사진: ${b.path}]${b.caption ? ` 캡션: ${b.caption}` : ''}`, '');
  }
  if (draft.place) L.push(`[지도: "${draft.place.query}" 검색 → "${draft.place.name}" 선택]`, '');
  if (draft.tags.length) L.push('[태그] ' + draft.tags.map((t) => '#' + t).join(' '));
  return L.join('\n');
}

module.exports = { loadDraft, expectedPieces, norm, manualManuscript, resolvePath, VIDEO_TITLE_MAX };
