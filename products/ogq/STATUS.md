# OGQ 판매 현황

| 세트 | 제출일 | 상태 | AI 표기 |
|---|---|---|---|
| 정보 블로그 필수 라벨 스티커 (info-labels, 24종) | 2026-10-23 | 심사 중 (영업일 최대 15일) | AI 생성(전부) |
| 경제 블로그 필수 라벨 스티커 (econ-labels, 24종) | 2026-10-23 | 심사 중 (영업일 최대 15일) | AI 생성(전부) |

- 크리에이터: 에이팜 (네이버 로그인, 2단계 인증 완료). 프로필 대표 사이트 https://aipomcalc.com, 웹사이트 ① https://blog.naver.com/iwmyd99 ② https://aipomcalc.com (2026-10-23, 자동 저장 확인).
- 제출은 무료 "판매 등록"으로만. "빠른 심사 등록 40C"(유료 코인)는 쓰지 않는다.

## 등록 방법 (실측 2026-10-23, claude-in-chrome)
1. `node scripts/ogq_serve.js <products/ogq 절대경로>` (127.0.0.1:8799, creators.ogq.me 에만 CORS 허용)
2. creators.ogq.me/upload/sticker?salesType=SINGLE → 페이지에서 JS 로 png 26개(01~24·main·tab)를 fetch 해 `.bulk-upload-zone` 에 drop 이벤트 → 파일명으로 메인·탭 자동 분류.
   ("파일 첨부" 버튼은 파일 선택창이 떠서 자동화 불가)
3. 제목(40자)·내용(160자)·태그(Enter 로 하나씩, 3~20개) 입력 → AI 활용 여부 선택 → "가이드를 지켰어요" 줄 클릭 → 체크리스트 "확인" → "판매 등록".
4. 업로드 전 `png/preview-dark.png` 로 다크모드 확인 (make_ogq.js 가 흰 테두리 자동 적용).
