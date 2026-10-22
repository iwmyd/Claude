# OGQ 판매 현황

| 세트 | 제출일 | 상태 | AI 표기 |
|---|---|---|---|
| 원숭이 팜이의 블로그 일상 (pami-daily, 마스코트) | 2026-10-23 | 심사 중 | AI 생성(전부) |
| 원숭이 팜이의 맛집 카페 리뷰 (pami-food) | 2026-10-23 | 심사 중 | AI 생성(전부) |
| 원숭이 팜이의 제품 리뷰 언박싱 (pami-product) | 2026-10-23 | 심사 중 | AI 생성(전부) |
| 원숭이 팜이의 매일 리액션 (pami-react) | 2026-10-23 | 심사 중 | AI 생성(전부) |
| 감성 손글씨 맛집 일상 한 줄 (hand-lettering) | 2026-10-23 | 심사 중 | AI 생성(전부) |
| 형광펜 점선 상자 공정위 문구 (fair-highlight) | 2026-10-23 | 심사 중 | AI 생성(전부) |

- 2026-10-23 사용자 지시로 이전 10세트(info/econ/fair/home/worker/saving/family/review-labels, tori-daily/review) **심사 취소**. OGQ 에서 삭제는 사용자가 직접(영구 삭제는 Claude 가 하지 않음). 파일은 보관.
- 마스코트 '팜이'(오리지널 원숭이 — 포켓몬 에이팜의 보라색·손 모양 꼬리 등 특징은 쓰지 않음). 생성기 `make_ogq_char.js` (char:'monkey', spec.font). 글자 세트는 `make_ogq_text.js`(브라우저로 글자 폭 실측해 크기 맞춤).

- 크리에이터: 에이팜 (네이버 로그인, 2단계 인증 완료). 프로필 대표 사이트 https://aipomcalc.com, 웹사이트 ① https://blog.naver.com/iwmyd99 ② https://aipomcalc.com (2026-10-23, 자동 저장 확인).
- 제출은 무료 "판매 등록"으로만. "빠른 심사 등록 40C"(유료 코인)는 쓰지 않는다.

## 테마 조사 (2026-10-23, OGQ 인기 스티커 상위 50개 — api.ogqmarket.naver.com popular/recent)
- 1위 동물 캐릭터 일상·블로그(블로거 먕먕이, 앙토의 일상블로그 등 과반), 2위 맛집·제품 리뷰, 3위 공정위 문구. 가격 대부분 1,500원(움직이는 스티커 2,500원).
- 캐릭터 시리즈는 `scripts/make_ogq_char.js`(다람쥐 토리, rough.js 손선 + Gaegu 손글씨). 라벨형은 `make_ogq.js`.

## 승인 후 할 일
- 승인 알림이 오면 이 표의 상태를 "판매 중"으로 바꾸고, 블로그 에디터의 스티커 패널에서 내 스티커가 보이는지 probe 로 실측 → `naver_draft.js` 에 sticker 블록 지원 추가(CLAUDE.md §2 '내 OGQ 스티커 활용').
- 반려되면 사유를 여기에 적고 spec 수정 → 재생성 → 재제출.

## 등록 방법 (실측 2026-10-23, claude-in-chrome)
1. `node scripts/ogq_serve.js <products/ogq 절대경로>` (127.0.0.1:8799, creators.ogq.me 에만 CORS 허용)
2. creators.ogq.me/upload/sticker?salesType=SINGLE → 페이지에서 JS 로 png 26개(01~24·main·tab)를 fetch 해 `.bulk-upload-zone` 에 drop 이벤트 → 파일명으로 메인·탭 자동 분류.
   ("파일 첨부" 버튼은 파일 선택창이 떠서 자동화 불가)
3. 제목(40자)·내용(160자)·태그(Enter 로 하나씩, 3~20개) 입력 → AI 활용 여부 선택 → "가이드를 지켰어요" 줄 클릭 → 체크리스트 "확인" → "판매 등록".
4. 업로드 전 `png/preview-dark.png` 로 다크모드 확인 (make_ogq.js 가 흰 테두리 자동 적용).
