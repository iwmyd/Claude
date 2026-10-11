---
description: 사진 + 소재 정보 + 한줄 메모로 네이버 블로그 초안 작성 → 검수 보고 → 승인 후 임시저장
argument-hint: "[한줄 메모] (사진은 input/photos/, 영상은 input/videos/)"
---

# /write — 초안 작성 → 검수 → (승인 후) 임시저장

메모: $ARGUMENTS

CLAUDE.md 의 절대 규칙·글쓰기 공식·자가 검증 원칙을 따른다. 단계마다 "했다"가 아니라 "됐는지 확인했다"로 끝낸다.

## 1단계 — 재료 읽기
1. `data/profile.md`, `data/blogger-profile.md`, `data/authority-lines.md`, `data/sponsored-disclosure.md`, `data/photo-guide.md`, `data/style-profile.md`, `data/trends.md` 를 읽는다.
2. `input/photos/`(하위 `_mosaic/` 제외), `input/videos/` 목록 확인. **모든 사진을 Read 로 직접 본다.** 각 사진에 대해: 무엇이 보이는지, 확인 가능한 사실(날짜·수치·기관명), 개인정보 노출 여부를 메모한다.
3. 최근 초안(`drafts/*.json` 최신 3개)의 meta.hook · meta.authority · 도입 문장을 확인 → 이번엔 겹치지 않게.

## 2단계 — 확인 질문 (임의 판단 금지, 한 번에 모아서)
반드시 확인할 것 (메모·profile 에 없으면 질문):
- **협찬·체험단 여부** (원고료/제품/없음) + 업체명 + 업체 지정 표기 문구 유무 ← 생략 불가
- 글 유형(postType): policy / rate-realestate / market / social
- **소재 원문**: 보도자료·공고문·기사 원문 텍스트나 링크 → 수치·조건은 여기서만 가져온다. 네이버 블로그 링크는 WebFetch 하지 말고 붙여넣기 요청.
- 메인 키워드 후보 2~3개를 제안하고 선택받기 (연도·대상층·제도명 포함, 지역 한정 정책일 때만 지역명)
- 유형별 필수 정보 체크리스트(CLAUDE.md §2) 중 소재에서 확인 안 되는 항목
- 사진 속 개인정보 처리 방침(본인 얼굴 공개 여부 등), 영상 제목
- profile.md TODO 중 이번 글에 필요한 것 (닉네임 등) → 답을 받으면 profile.md 에 기록

## 3단계 — 설계 (초안 전에 짧게 보고)
- 페르소나 1명: 지역·나이·직업·상황·감정
- 메인 키워드 1 + 서브 2~3 (소제목 배치 계획)
- 후킹 패턴(직전 글과 다르게) + 권위 문구 유형
- 사진 스토리 순서 (파일명 → 역할)

## 4단계 — 모자이크 (개인정보가 보인 사진이 있으면 필수)
1. `drafts/<YYYYMMDD-슬러그>.mosaic.json` 작성 — 좌표는 0~1, **EXIF 회전 보정 후 보이는 화면 기준**, 사유 기재.
2. `node scripts/mosaic.js drafts/<…>.mosaic.json`
3. `input/photos/_mosaic/` 의 처리본을 **Read 로 열어 실제로 가려졌는지 확인**. 덜 가려졌으면 좌표 키워 재실행.
4. 초안에는 처리본 경로를 쓴다.

## 5단계 — 초안 JSON 작성
`drafts/<YYYYMMDD-슬러그>.json` (포맷: CLAUDE.md §4, 예시 `drafts/example.json`).
- 협찬이면 blocks[0] = 표기 문구 text 블록.
- 첫 문단 Yes-set → 둘째 문단 권위 한 줄 → 본문 → 마무리(키워드 포함 결론) → 이웃추가 CTA.
- 영상이 있으면 `video` 필드 (제목 40자 이내). `place` 는 지역 기관·현장 글에서만.
- `meta` 전부 채우기: mainKeyword, subKeywords, postType, sponsored, persona, hook, authority, sources, checklist(항목별 "확인"/"미확인"/"해당없음").

## 6단계 — 자동 검수 + 자가 검수
1. `node scripts/check_draft.js drafts/<…>.json` → ❌ 가 0개가 될 때까지 고친다. ⚠️ 는 이유가 있으면 보고서에 설명.
2. `node scripts/naver_draft.js drafts/<…>.json --validate-only` → 경로·형식 확인.
3. 자가 질문: "모바일에서 인용구와 소제목만 훑어도 핵심이 전달되는가?" → 인용구·소제목만 뽑아 나열해 보고 판단.
4. blogger-profile.md 금지 표현 / 사실 근거 없는 문장 재점검.

## 7단계 — 사용자에게 검수 보고 (승인 요청)
다음을 보여준다:
- 제목, 페르소나, 메인·서브 키워드, 후킹·권위 유형
- 본문 미리보기 (블록 순서대로, 사진은 [사진: 파일명 — 역할])
- check_draft 요약(❌0 확인, ⚠️ 목록과 사유)
- 필수 정보 체크리스트 대조표 (미확인 항목은 질문 또는 뺀 사실 명시)
- 모자이크 처리 내역 (몇 장·몇 영역·사유)
- 협찬 표기 여부
- "인용구·소제목만 훑기" 결과
그리고 **"이대로 임시저장할까요?"** 로 승인을 받는다. 수정 요청이면 5단계로.

`claude -p` 비대화 모드로 실행된 경우: 여기서 멈추고 초안 경로와 검수 보고만 출력한다 (승인 없이 저장 금지).

## 8단계 — 승인 후 임시저장
1. `node scripts/naver_draft.js drafts/<…>.json` (셀렉터를 고친 직후라면 먼저 `--dry-run`).
2. 출력의 **"자동 처리 결과"** 블록 확인. `본문 대조: ❌` 이면 성공 보고 금지 → `drafts/<…>.dump.txt` 를 Read 로 열어 원인 분석 → 셀렉터 문제면 `node scripts/probe_selectors.js` 로 실측 → 수정 → `--dry-run` 재검증. 3회 실패 시 `drafts/<…>.manual.txt` 로 수동 붙여넣기 안내.
3. 스크린샷 `drafts/<…>.png` 를 Read 로 확인.
4. 해결한 문제가 있으면 CLAUDE.md §8 기록 + `.working.js` 백업.
5. `data/authority-lines.md` 의 "최근 사용 기록" 갱신.

## 9단계 — 완료 안내
- ❗수동 필요 항목만 안내 (태그·지도·동영상·소제목 중 실패한 것).
- 발행 체크리스트: 타겟 활동 시간대 발행 / 발행 후 24시간 수정 금지 / 주 2~3회(하루 2건 이상 금지) / 협찬 표기 육안 확인.
- 발행은 사용자가 평소 브라우저·앱의 "저장 글"에서 직접. 디버깅 중 생긴 실패본이 "저장 글"에 있으면 직접 정리하라고 안내(자동 삭제 안 함).
