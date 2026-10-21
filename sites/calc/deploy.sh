#!/usr/bin/env bash
# 종합계산기 배포 — 테스트 통과 시에만 GitHub Pages 저장소(iwmyd/aipomcalc, main 브랜치 루트)에 public/ 을 올린다.
# 사용: bash sites/calc/deploy.sh "변경 내용 한 줄"     (ADSENSE_PUB=pub-xxxx 환경변수가 있으면 광고 코드·ads.txt 포함)
set -euo pipefail
cd "$(dirname "$0")"
MSG="${1:-update}"
REPO="iwmyd/aipomcalc"
export SITE_URL="https://aipomcalc.com"
export ADSENSE_PUB="${ADSENSE_PUB:-pub-8001197559123230}"  # 애드센스 게시자 ID (공개 정보 — ads.txt 에 그대로 노출됨)
node build.js
node test/calc.test.js | tail -1 | grep -q "전체 통과" || { echo "❌ 계산 테스트 실패 — 배포 중단"; exit 1; }
node test/browser.test.js | tail -1 | grep -q "전체 통과" || { echo "❌ 브라우저 테스트 실패 — 배포 중단"; exit 1; }
DEP=".deploy"
if [ ! -d "$DEP/.git" ]; then rm -rf "$DEP"; git clone -q "https://github.com/$REPO.git" "$DEP" 2>/dev/null || { mkdir -p "$DEP"; git -C "$DEP" init -q -b main; git -C "$DEP" remote add origin "https://github.com/$REPO.git"; }; fi
find "$DEP" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r public/. "$DEP"/
git -C "$DEP" add -A
if git -C "$DEP" diff --cached --quiet; then echo "변경 없음 — 배포할 것이 없습니다"; exit 0; fi
git -C "$DEP" commit -qm "$MSG"
git -C "$DEP" push -q -u origin main
echo "✅ 배포 완료: https://aipomcalc.com (반영까지 1~2분)"
