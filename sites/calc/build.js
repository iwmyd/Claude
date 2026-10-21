#!/usr/bin/env node
'use strict';
/**
 * 에이팜 종합계산기 빌드 — pages.js → public/ 정적 HTML (+ sitemap.xml, robots.txt, ads.txt, CNAME, manifest, 404)
 * 사용: SITE_URL=https://aipomcalc.com ADSENSE_PUB=pub-xxxx node sites/calc/build.js
 * 디자인: Minimalism & Swiss (ui-ux-pro-max), 카테고리·계산기별 색(tone), 라이트/다크, IBM Plex Sans KR + IBM Plex Mono (OFL)
 */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname, OUT = path.join(ROOT, 'public');
const SITE = (process.env.SITE_URL || 'https://aipomcalc.com').replace(/\/$/, '');
const PUB = (process.env.ADSENSE_PUB || '').replace(/^ca-/, '');
const GSC = process.env.GSC_VERIFY || ''; // 구글 서치 콘솔 소유권 확인 값
const GA = /^G-[A-Z0-9]+$/.test(process.env.GA_ID || '') ? process.env.GA_ID : ''; // 구글 애널리틱스 4 측정 ID (없으면 코드 안 넣음)
const NAME = '에이팜 종합계산기';
const UPDATED = '2026-10-22';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const pages = require('./pages');
const { CONTACT } = require('./pages');
const ICONS = require('./icons');
// 배포 직후에도 새 파일을 받도록 내용 해시를 주소에 붙인다 (/assets/app.js?v=ab12cd34)
const V = (f) => '/assets/' + f + '?v=' + require('crypto').createHash('md5').update(fs.readFileSync(path.join(__dirname, 'assets', f))).digest('hex').slice(0, 8);

// 카테고리 — 홈 섹션 순서·색. tone 은 assets/style.css 의 [data-tone] 정의와 짝
const CATS = [
  { id: 'basic', name: '기본 계산기', tone: 'slate', icon: 'calculator' },
  { id: 'loan', name: '대출·금융', tone: 'blue', icon: 'landmark' },
  { id: 'save', name: '저축·투자', tone: 'emerald', icon: 'piggy' },
  { id: 'car', name: '자동차', tone: 'red', icon: 'car' },
  { id: 'work', name: '근로·세금', tone: 'amber', icon: 'briefcase' },
  { id: 'home', name: '부동산', tone: 'orange', icon: 'home' },
  { id: 'life', name: '날짜·생활', tone: 'rose', icon: 'calendar' },
  { id: 'build', name: '건축·토목', tone: 'lime', icon: 'ruler' },
];
const calcs = pages.filter((p) => p.calc);
for (const p of calcs) if (!CATS.find((c) => c.id === p.cat)) throw new Error('카테고리 없음: ' + p.slug);
const icon = (k, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k] || ICONS.calculator}</svg>`;
const url = (p) => `${SITE}/${p.slug ? p.slug + '/' : ''}`;
const INDEX = calcs.map((p) => ({ s: p.slug, n: p.short, l: p.lead, c: p.cat, t: p.tone, i: p.icon }));

const head = (p) => `<!doctype html>
<html lang="ko"><head>
${GA ? `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${GA}');
</script>
` : ''}<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${url(p)}">${p.noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="website"><meta property="og:site_name" content="${NAME}"><meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.desc)}"><meta property="og:url" content="${url(p)}">
<meta property="og:image" content="${SITE}/assets/${p.calc && fs.existsSync(path.join(ROOT, 'assets', 'og', p.slug + '.png')) ? 'og/' + p.slug : 'og'}.png"><meta property="og:image:alt" content="${esc(p.short || NAME)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/icon.svg" type="image/svg+xml"><link rel="icon" href="/assets/icon-32.png" sizes="32x32"><link rel="apple-touch-icon" href="/assets/icon-180.png">
<link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#0f172a">
<script>try{var t=localStorage.getItem('ac-theme');if(t)document.documentElement.dataset.theme=t;var z=localStorage.getItem('ac-zoom');if(z)document.documentElement.dataset.zoom=z}catch(e){}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${V('style.css')}">
${GSC ? `<meta name="google-site-verification" content="${GSC}">` : ''}
${PUB ? `<meta name="google-adsense-account" content="ca-${PUB}">` : ''}
${PUB ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${PUB}" crossorigin="anonymous"></script>` : ''}
${p.schema ? `<script type="application/ld+json">${JSON.stringify(p.schema)}</script>` : ''}
</head>`;

const header = () => `<a class="skip" href="#main">본문 바로가기</a>
<header class="top"><div class="wrap bar">
<a class="brand" href="/">${icon('calculator', 'ic brand-ic')}<span>${NAME}</span></a>
<button class="search-btn" type="button" data-open-search aria-label="계산기 검색 (단축키 /)">${icon('search')}<span>계산기 검색</span><kbd>/</kbd></button>
<div class="tools">
<button class="tb" type="button" data-zoom aria-label="글자 크기 바꾸기" title="글자 크기">${icon('type')}</button>
<button class="tb" type="button" data-theme-toggle aria-label="다크 모드 전환" title="다크 모드">${icon('moon', 'ic i-moon')}${icon('sun', 'ic i-sun')}</button>
</div></div>
<nav class="wrap catnav" aria-label="카테고리">${CATS.map((c) => `<a href="/#${c.id}" data-tone="${c.tone}">${c.name}</a>`).join('')}</nav>
</header>
<dialog class="search" id="search" aria-label="계산기 검색"><div class="search-in">${icon('search')}<input id="q" type="search" placeholder="계산기 이름·초성 (예: ㄷㅊ, 군적금) — 오타도 찾아 드려요" autocomplete="off" aria-controls="qr"><button type="button" class="tb" data-close-search aria-label="닫기">${icon('x')}</button></div><ul id="qr" role="listbox"></ul><p class="search-hint"><kbd>↑</kbd><kbd>↓</kbd> 이동 · <kbd>Enter</kbd> 열기 · <kbd>Esc</kbd> 닫기</p></dialog>`;

const footer = () => `<footer class="foot"><div class="wrap">
<div class="foot-grid"><div><b>${NAME}</b><p>모든 계산은 참고용이며 금융상품 가입·투자 권유가 아닙니다. 최종 금액은 해당 기관에 확인하세요.</p></div>
<div class="foot-links"><a href="/about/">사이트 소개</a><a href="/privacy/">개인정보처리방침</a><a href="/contact/">문의하기 (평균 1일 이내 답변)</a><a href="mailto:${CONTACT}">${CONTACT}</a><a href="https://blog.naver.com/iwmyd99" rel="noopener">블로그: 에이팜의 이야기 보따리</a><button type="button" class="linkbtn" data-clear-storage>저장 기록 지우기</button></div></div>
<p class="muted">최종 업데이트 ${UPDATED}</p></div></footer>
<button class="totop" type="button" data-totop aria-label="맨 위로">${icon('up')}</button>
<div class="toast" role="status" aria-live="polite" id="toast"></div>
<script>window.AC_INDEX=${JSON.stringify(INDEX)};window.AC_ICONS=${JSON.stringify(Object.fromEntries(INDEX.map((x) => [x.i, ICONS[x.i] || ''])))};</script>
${['calc.js', 'search.js', 'charts.js', 'diagram.js', 'app.js'].map((f) => `<script src="${V(f)}"></script>`).join('')}`;

const tipsBlock = (t) => (t && t.length ? `<section class="tips" aria-label="핵심 정리">${t.map(([h, b]) => `<div class="tip"><b>${h}</b><p>${b}</p></div>`).join('')}</section>` : '');
const basisBlock = (p) => (p.basis ? `<details class="card basis"><summary>${icon('info')}계산 기준과 근거</summary><ul>${p.basis.map((b) => `<li>${b}</li>`).join('')}</ul>${p.sources ? `<p class="src">출처: ${p.sources.map(([n, u]) => `<a href="${u}" rel="noopener">${n}</a>`).join(' · ')}</p>` : ''}</details>` : '');
const faqBlock = (faq) => (faq && faq.length ? `<section class="card faq"><h2>자주 묻는 질문</h2>${faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>` : '');
const actions = (p) => `<div class="actions" role="group" aria-label="결과 도구">
<button type="button" class="ab" data-copy-result>${icon('copy')}결과 복사</button>
<button type="button" class="ab" data-share>${icon('link')}링크 공유</button>
${p.pad ? '' : `<button type="button" class="ab" data-reset>${icon('reset')}초기화</button>`}
<button type="button" class="ab" data-print>${icon('print')}인쇄·PDF</button></div>`;

const pad = (kind) => {
  const B = [['AC', 'fn'], ['⌫', 'fn'], ['%', 'fn'], ['÷', 'op'], ['7'], ['8'], ['9'], ['×', 'op'], ['4'], ['5'], ['6'], ['−', 'op'], ['1'], ['2'], ['3'], ['+', 'op'], ['±', 'fn'], ['0'], ['.'], ['=', 'eq']];
  const S = [['deg', 'mode'], ['sin'], ['cos'], ['tan'], ['ln'], ['log'], ['√'], ['x²'], ['xʸ'], ['('], [')'], ['n!'], ['π'], ['e'], ['1/x'], ['Ans']];
  const keys = (arr, cls) => `<div class="keys ${cls}">${arr.map(([k, t]) => `<button type="button" class="k ${t || 'num'}" data-k="${k}" aria-label="${k === '⌫' ? '지우기' : k === 'AC' ? 'AC 전체 지우기' : k}">${k}</button>`).join('')}</div>`;
  return `<div class="pad-wrap"><section class="card calcpad" data-calc="${kind === 'sci' ? 'scientific' : 'basic'}">
<div class="display"><input id="expr" type="text" class="expr" aria-label="수식" autocomplete="off" spellcheck="false" inputmode="${kind === 'sci' ? 'text' : 'decimal'}"><output id="res" class="res" aria-live="polite">0</output><p id="err" class="err" role="alert"></p></div>
${kind === 'sci' ? keys(S, 'sci') : ''}${keys(B, 'basic')}
</section>
<section class="card hist"><div class="hist-h"><h2>계산 기록</h2><button type="button" class="linkbtn" data-clear-history>지우기</button></div><ol id="history" class="history"></ol></section></div>`;
};

const tile = (q) => `<a class="tile" href="/${q.slug}/" data-tone="${q.tone}"><span class="tic">${icon(q.icon)}</span><span class="tt"><b>${q.tileName || q.short}</b><small>${q.lead}</small></span></a>`;

function calcPage(p) {
  const cat = CATS.find((c) => c.id === p.cat);
  const related = calcs.filter((q) => q !== p).sort((a, b) => (b.cat === p.cat) - (a.cat === p.cat)).slice(0, 6);
  p.schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebApplication', name: p.short, applicationCategory: 'FinanceApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, url: url(p) },
    ...(p.faq ? [{ '@type': 'FAQPage', mainEntity: p.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) }] : []),
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '홈', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: cat.name, item: `${SITE}/#${cat.id}` }, { '@type': 'ListItem', position: 3, name: p.short, item: url(p) }] }] };
  const body = p.pad ? pad(p.pad) : `<section class="card calc" data-calc="${p.calc}">
<div class="calc-grid"><div class="inputs">${p.form}</div>
${p.calc === 'percent' ? '' : '<div class="results"><div id="out" class="out"></div></div>'}</div>
<div class="viz"><div id="chart" class="chart"></div><div id="tables"></div></div>
</section>`;
  return `${head(p)}<body data-page="${p.slug}" data-tone="${p.tone}">
${header()}
<main class="wrap" id="main" tabindex="-1">
<nav class="crumb" aria-label="현재 위치"><a href="/">홈</a><span>›</span><a href="/#${cat.id}">${cat.name}</a><span>›</span><b>${p.short}</b></nav>
<div class="ptitle"><span class="pic">${icon(p.icon)}</span><div><h1>${esc(p.h1)}</h1><p class="sum">${p.summary}</p></div>
<button type="button" class="fav" data-fav="${p.slug}" aria-pressed="false" aria-label="즐겨찾기">${icon('star')}</button></div>
${body}
${actions(p)}
<p id="sr-status" class="sr-only" role="status" aria-live="polite"></p>
${tipsBlock(p.tips)}
${basisBlock(p)}
${faqBlock(p.faq)}
<p class="report"><a href="/contact/?calc=${p.slug}">이 계산기에 틀린 곳이나 바라는 점이 있나요? 알려 주세요 →</a></p>
<section class="related"><h2>함께 쓰면 좋은 계산기</h2><div class="tiles">${related.map(tile).join('')}</div></section>
</main>
${p.pad ? '' : '<a class="mini" href="#out" data-mini hidden><span></span><b></b></a>'}
${footer()}
</body></html>`;
}

function homePage(p) {
  p.schema = { '@context': 'https://schema.org', '@type': 'WebSite', name: NAME, url: SITE + '/' };
  return `${head(p)}<body data-page="home">
${header()}
<main class="wrap" id="main" tabindex="-1">
<section class="hero"><h1>${NAME}</h1>
<button class="hero-search" type="button" data-open-search>${icon('search')}<span>어떤 계산기를 찾으시나요?</span><kbd>/</kbd></button></section>
<section id="mine" class="mine" hidden><div class="mine-col" id="favs-wrap" hidden><h2>${icon('star')}즐겨찾기</h2><div class="tiles" id="favs"></div></div><div class="mine-col" id="recent-wrap" hidden><h2>${icon('clock')}최근 사용</h2><div class="tiles" id="recent"></div></div></section>
${CATS.map((c) => `<section class="cat" id="${c.id}" data-tone="${c.tone}"><h2><span class="cic">${icon(c.icon)}</span>${c.name}<small>${calcs.filter((q) => q.cat === c.id).length}</small></h2><div class="tiles">${calcs.filter((q) => q.cat === c.id).map(tile).join('')}</div></section>`).join('')}
</main>
${footer()}
</body></html>`;
}

function infoPage(p) {
  return `${head(p)}<body data-page="${p.slug}">
${header()}
<main class="wrap narrow" id="main" tabindex="-1">
<nav class="crumb" aria-label="현재 위치"><a href="/">홈</a><span>›</span><b>${p.short}</b></nav>
<h1>${esc(p.h1)}</h1><p class="sum">${p.summary}</p>
${tipsBlock(p.tips)}${p.extra || ''}
</main>
${footer()}
</body></html>`;
}

// ── 출력 ──
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
fs.cpSync(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true }); // og/ 하위 폴더 포함
for (const p of pages) {
  const html = p.slug === '' ? homePage(p) : p.calc ? calcPage(p) : infoPage(p);
  const dir = path.join(OUT, p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
}
const p404 = { slug: '404', short: '페이지 없음', title: `페이지를 찾을 수 없어요 | ${NAME}`, desc: '요청한 페이지가 없습니다.', h1: '페이지를 찾을 수 없어요', summary: '주소가 바뀌었거나 없는 페이지입니다. 위의 검색으로 계산기를 찾아보세요.', extra: '<p class="near" id="near" hidden></p><p><a class="btn" href="/">홈으로</a></p>' };
fs.writeFileSync(path.join(OUT, '404.html'), infoPage(p404).replace('<meta name="description"', '<meta name="robots" content="noindex"><meta name="description"'), 'utf8');
fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify({ name: NAME, short_name: '종합계산기', start_url: '/', display: 'standalone', background_color: '#f8fafc', theme_color: '#0f172a', lang: 'ko', icons: [{ src: '/assets/icon-180.png', sizes: '180x180', type: 'image/png' }, { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png' }] }), 'utf8');
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.filter((p) => !p.noindex).map((p) => `<url><loc>${url(p)}</loc><lastmod>${UPDATED}</lastmod></url>`).join('\n')}\n</urlset>\n`, 'utf8');
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`, 'utf8');
if (PUB) fs.writeFileSync(path.join(OUT, 'ads.txt'), `google.com, ${PUB}, DIRECT, f08c47fec0942fa0\n`, 'utf8');
const host = SITE.replace(/^https?:\/\//, '');
if (!/example\.com$|localhost/.test(host)) fs.writeFileSync(path.join(OUT, 'CNAME'), host + '\n', 'utf8');
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`✅ ${pages.length}페이지 (계산기 ${calcs.length}) → ${OUT} (SITE_URL=${SITE}${PUB ? ', AdSense ' + PUB : ''})`);
