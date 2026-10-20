#!/usr/bin/env node
'use strict';
/**
 * 에이팜 계산기 사이트 빌드 — pages/ 정의 → public/ 정적 HTML (+ sitemap.xml, robots.txt)
 * 사용: node sites/calc/build.js   (SITE_URL 환경변수로 도메인 지정, 기본 https://example.com)
 * programmatic-seo 원칙: 페이지마다 고유 소개·계산 기준·FAQ, 허브(첫 화면)↔계산기 상호 링크, sitemap.
 */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname, OUT = path.join(ROOT, 'public');
const SITE = (process.env.SITE_URL || 'https://example.com').replace(/\/$/, '');
const NAME = '에이팜 생활경제 계산기';
const UPDATED = '2026-10-21';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const pages = require('./pages');

const nav = () => pages.filter((p) => p.calc).map((p) => `<a href="/${p.slug}/">${p.short}</a>`).join('');
const layout = (p, body) => `<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${SITE}/${p.slug ? p.slug + '/' : ''}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="${SITE}/${p.slug ? p.slug + '/' : ''}"><meta property="og:locale" content="ko_KR">
<link rel="stylesheet" href="/assets/style.css">
${p.schema ? `<script type="application/ld+json">${JSON.stringify(p.schema(SITE))}</script>` : ''}
</head><body>
<header class="top"><div class="wrap"><a class="brand" href="/">${NAME}</a><nav>${nav()}</nav></div></header>
<main class="wrap">
${p.slug ? `<nav class="crumb" aria-label="breadcrumb"><a href="/">홈</a> › <span>${esc(p.short)}</span></nav>` : ''}
${body}
</main>
<footer class="foot"><div class="wrap">
<p>${NAME} · 모든 계산은 참고용이며 금융상품 가입·투자 권유가 아닙니다. 최종 금액은 해당 금융기관에 확인하세요.</p>
<p><a href="/about/">사이트 소개</a> · <a href="/privacy/">개인정보처리방침</a> · 최종 업데이트 ${UPDATED}</p>
</div></footer>
${p.calc ? `<script src="/assets/calc.js"></script><script src="/assets/ui.js"></script>` : ''}
</body></html>`;

const faqBlock = (faq) => faq && faq.length ? `<section class="card"><h2>자주 묻는 질문</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join('')}</section>` : '';
const faqSchema = (faq) => ({ '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) });

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
for (const f of ['style.css', 'calc.js', 'ui.js']) fs.copyFileSync(path.join(ROOT, 'assets', f), path.join(OUT, 'assets', f));

for (const p of pages) {
  if (p.calc && p.faq) {
    const app = { '@type': 'WebApplication', name: p.short, applicationCategory: 'FinanceApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, url: `${SITE}/${p.slug}/` };
    p.schema = () => ({ '@context': 'https://schema.org', '@graph': [app, faqSchema(p.faq), { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '홈', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: p.short, item: `${SITE}/${p.slug}/` }] }] });
  }
  const related = p.calc ? `<section class="card"><h2>다른 계산기</h2><ul class="links">${pages.filter((q) => q.calc && q !== p).map((q) => `<li><a href="/${q.slug}/">${q.short}</a> — ${esc(q.lead)}</li>`).join('')}</ul></section>` : '';
  const body = `<h1>${esc(p.h1)}</h1>
<p class="lead">${p.intro}</p>
${p.body || ''}
${p.basis ? `<section class="card"><h2>계산 기준</h2><ul>${p.basis.map((b) => `<li>${b}</li>`).join('')}</ul></section>` : ''}
${faqBlock(p.faq)}
${related}`;
  const dir = path.join(OUT, p.slug || '');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), layout(p, body), 'utf8');
}
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `<url><loc>${SITE}/${p.slug ? p.slug + '/' : ''}</loc><lastmod>${UPDATED}</lastmod></url>`).join('\n')}
</urlset>
`, 'utf8');
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`, 'utf8');
console.log(`✅ ${pages.length}페이지 → ${OUT} (SITE_URL=${SITE})`);
