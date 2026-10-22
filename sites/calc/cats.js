// 계산기 카테고리 — 사이트(build.js)와 공유 썸네일(brand/make-brand.js)이 같이 쓴다. 여기만 고치면 둘 다 바뀐다.
module.exports = [
  { id: 'basic', name: '기본 계산기', tone: 'slate', icon: 'calculator' },
  { id: 'loan', name: '대출·금융', tone: 'blue', icon: 'landmark' },
  { id: 'save', name: '저축·투자', tone: 'emerald', icon: 'piggy' },
  { id: 'car', name: '자동차', tone: 'red', icon: 'car' },
  { id: 'work', name: '근로·세금', tone: 'amber', icon: 'briefcase' },
  { id: 'home', name: '부동산', tone: 'orange', icon: 'home' },
  { id: 'life', name: '날짜·생활', tone: 'rose', icon: 'calendar' },
  { id: 'build', name: '건축·토목', tone: 'lime', icon: 'ruler' },
  { id: 'game', name: '게임', tone: 'violet', icon: 'gamepad' },
];
// 공유 문구: 계산기 수(n)는 빌드할 때마다 pages.js 에서 센다
module.exports.tagline = (n) => ({ head: '필요한 계산기는 다 모였다', sub: `${n}가지 계산기 집합소`, line: `필요한 계산기는 다 모였다, ${n}가지 계산기 집합소` });
