// node sites/calc/test/calc.test.js — 계산 로직 검증 (엑셀 계산기 검산값·손계산과 대조)
const C = require('../assets/calc.js');
let fail = 0;
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
const check = (name, ok, got) => { console.log(`${ok ? '✅' : '❌'} ${name}${ok ? '' : ' → ' + JSON.stringify(got)}`); if (!ok) fail++; };

// 1) 대출: 엑셀(HyperFormula·LibreOffice 검산) 값과 일치해야 함
let L = C.loan(300000000, 0.045, 360, 'equal-payment');
check('원리금균등 3억 4.5% 30년 첫달 1,520,056', near(L.first, 1520055.93), L.first);
check('원리금균등 총이자 247,220,135', near(L.totalInterest, 247220134.61), L.totalInterest);
check('원리금균등 마지막 잔액 0', near(L.rows.at(-1).end, 0, 0.01), L.rows.at(-1).end);
L = C.loan(300000000, 0.045, 360, 'equal-principal');
check('원금균등 첫달 1,958,333 / 총이자 203,062,500', near(L.first, 1958333.33) && near(L.totalInterest, 203062500), [L.first, L.totalInterest]);
L = C.loan(100000000, 0.0325, 120, 'bullet');
check('만기일시 1억 3.25% 10년 총이자 32,500,000 / 마지막 100,270,833', near(L.totalInterest, 32500000) && near(L.last, 100270833.33), [L.totalInterest, L.last]);
L = C.loan(12000000, 0, 12, 'equal-payment');
check('무이자 원리금균등 = 원금/개월', near(L.first, 1000000) && near(L.totalInterest, 0), L.first);

// 2) 예금: 1,000만 원 연 3% 12개월 단리 → 이자 30만, 세금 15.4% = 46,200
let D = C.deposit(10000000, 0.03, 12, 'simple', 0.154);
check('예금 단리 이자 300,000 / 세금 46,200 / 세후 253,800', near(D.gross, 300000) && D.tax === 46200 && near(D.net, 253800), D);
D = C.deposit(10000000, 0.03, 12, 'monthly', 0.154);
check('예금 월복리 이자 304,160 (=1e7×(1.0025^12−1))', near(D.gross, 10000000 * (Math.pow(1.0025, 12) - 1)), D.gross);

// 3) 적금: 월 100만 원 연 3.6% 12개월 단리 → 100만×0.003×(12×13/2=78) = 234,000
let S = C.savings(1000000, 0.036, 12, 'simple', 0.154);
check('적금 단리 이자 234,000 / 원금 1,200만', near(S.gross, 234000) && S.paid === 12000000, S);
S = C.savings(1000000, 0.036, 12, 'simple', 0);
check('비과세면 세금 0', S.tax === 0, S.tax);

// 4) 중도상환수수료: 1억 상환, 1.2%, 12개월 경과 / 36개월 부과 → 1억×0.012×24/36 = 800,000
let P = C.prepayFee(100000000, 0.012, 12, 36);
check('중도상환수수료 800,000', near(P.fee, 800000), P);
P = C.prepayFee(100000000, 0.012, 40, 36);
check('부과기간 지나면 0원', near(P.fee, 0), P);

// 5) 퇴직금: 3개월 임금 900만, 92일, 재직 1,095일(3년) → 1일 97,826.09 × 30 × 3 = 8,804,348
let V = C.severance(9000000, 92, 1095, 0, 0);
check('퇴직금 3년 근속 8,804,348원', near(V.amount, 9000000 / 92 * 30 * 3), V);
V = C.severance(9000000, 92, 1095, 4000000, 0);
check('상여 연 400만 → 3개월분 100만 가산', near(V.daily, 10000000 / 92), V.daily);
check('1년 미만 근속 → 0원', C.severance(9000000, 92, 300, 0, 0).amount === 0);

// 6) 전월세 전환: 기준금리 3% → 전환율 5%, 1억 전환 → 월 416,667원 / 기준금리 9% → 상한 10%
let T = C.rentConvert(100000000, 0.03);
check('전환율 5% · 월세 416,667원', near(T.legalRate, 0.05, 1e-9) && near(T.monthly, 416666.67), T);
check('전환율 상한 10%', near(C.rentConvert(1e8, 0.09).legalRate, 0.10, 1e-9));

// 7) DSR: 연소득 6천만, 3억 4.5% 30년 원리금균등 → 연 18,240,671 / 30.40%
let R = C.dsr(60000000, [{ principal: 300000000, rate: 0.045, months: 360, method: 'equal-payment' }]);
check('DSR 30.40%', near(R.yearly, 1520055.93 * 12, 2) && near(R.ratio, 1520055.93 * 12 / 6e7, 1e-6), R);

// 8) 할부: 120만 원, 연 15%, 12개월 → 총수수료 = 120만×0.15/12×13/2 = 97,500
let I = C.installment(1200000, 0.15, 12);
check('할부수수료 97,500원', near(I.totalFee, 97500), I.totalFee);

// 9) 군적금 — 국방부 공식 예시: 육군 18개월·월 40만 → 원금 720만, 은행이자(5%) 28.5만, 매칭 720만, 약 1,468.5만
let M = C.military(400000, 0.05, 18);
check('군적금 국방부 예시 1,468.5만 원', M.paid === 7200000 && near(M.interest, 285000) && M.match === 7200000 && near(M.total, 14685000), M);
check('월 한도 55만 초과 입력은 55만으로', C.military(700000, 0.05, 18).monthly === 550000);

// 10) 날짜·나이·평수
check('D-day 2026-10-21→2026-12-25 = 65일', C.dday('2026-10-21', '2026-12-25').diff === 65);
check('100일째 = 시작일+99일', C.addDays('2026-01-01', 99) === '2026-04-10');
check('윤년 2028-02-28→03-01 = 2일', C.dday('2028-02-28', '2028-03-01').diff === 2);
const A = C.age('1990-10-22', '2026-10-21');
check('생일 전 만 나이 35 / 연 나이 36 / 세는 나이 37', A.man === 35 && A.year === 36 && A.counting === 37, A);
check('생일 당일 만 나이 36', C.age('1990-10-21', '2026-10-21').man === 36);
check('84㎡ ≈ 25.41평 / 10평 ≈ 33.06㎡', near(C.toPyeong(84), 25.41, 0.01) && near(C.toM2(10), 33.06, 0.01));

// 11) 복리: 1,000만 원 연 7% 10년 연복리, 적립 0 → 1,000만×1.07^10 = 19,671,514
let K = C.compound(10000000, 0, 0.07, 10, 'yearly', 0);
check('연복리 10년 19,671,514원', near(K.total, 10000000 * Math.pow(1.07, 10)), K.total);
K = C.compound(0, 100000, 0.06, 1, 'monthly', 0);
check('월복리 적립 월10만 6% 1년 = FV 공식', near(K.total, 100000 * (Math.pow(1.005, 12) - 1) / 0.005), K.total);
check('72의 법칙 6% → 12년', near(C.compound(1, 0, 0.06, 1, 'monthly', 0).rule72, 12, 1e-9));
K = C.compound(10000000, 0, 0.05, 1, 'monthly', 0.154);
check('복리 세후 = 세전이자 − 15.4%', near(K.net, K.gross - Math.floor(K.gross * 0.154 / 10) * 10, 0.01), K);

// 12) 수식 계산기
const E = (x, a) => C.evaluate(x, a || 'deg');
const cases = [['2+3×4', 14], ['(2+3)×4', 20], ['10÷4', 2.5], ['2^10', 1024], ['-3^2', -9], ['5!', 120], ['√16+1', 5], ['2π', 2 * Math.PI],
  ['sin(30)', 0.5], ['cos(90)', 0], ['log(1000)', 3], ['ln(e)', 1], ['50+10%', 55], ['200−25%', 150], ['50×10%', 5], ['10%', 0.1], ['0.1+0.2', 0.3], ['3(4+1)', 15]];
for (const [x, want] of cases) { let got; try { got = E(x); } catch (e) { got = e.message; } check(`수식 ${x} = ${+want.toPrecision(12)}`, typeof got === 'number' && near(got, want, 1e-9), got); }
check('rad 모드 sin(π/2)=1', near(E('sin(π/2)', 'rad'), 1, 1e-12));
for (const bad of ['1÷0', '(2+3', 'tan(90)', '2++']) { let msg = ''; try { E(bad); } catch (e) { msg = e.message; } check(`잘못된 수식 "${bad}" → 오류 메시지`, !!msg, msg); }

// 13) 자동차: 할부 3,500만 − 선납 700만 = 2,800만, 5.9% 60개월 / 자동차세 1,998cc 1년차 = 399,600 + 교육세 119,880
let Q = C.carLoan(35000000, 7000000, 0.059, 60);
check('자동차 할부 원금 2,800만·월 납입 = 대출 계산과 동일', Q.principal === 28000000 && near(Q.monthly, C.loan(28000000, 0.059, 60, 'equal-payment').first), Q.monthly);
let X = C.carTax(1998, 1, 'ice');
check('자동차세 2,000cc급 1년차 399,600 + 교육세 119,880 = 519,480', X.tax === 399600 && X.edu === 119880 && X.total === 519480, X);
check('1,000cc 이하 cc당 80원 (998cc → 79,840)', C.carTax(998, 1, 'ice').tax === 79840);
check('1,600cc 이하 cc당 140원 (1,598cc → 223,720)', C.carTax(1598, 1, 'ice').tax === 223720);
check('차령 3년차 5% 경감 (399,600×0.95=379,620)', C.carTax(1998, 3, 'ice').tax === 379620);
check('차령 20년 → 12년으로 보고 50% 경감 (199,800)', C.carTax(1998, 20, 'ice').tax === 199800);
check('전기차 10만 + 교육세 3만 = 13만', C.carTax(0, 5, 'ev').total === 130000);

// 14) 연봉 실수령액 (2026 요율): 연 5,000만·비과세 20만·1인
let W = C.salary(50000000, 200000, 1, 0);
check('국민연금 4.75% (396.6만 → 188,410)', W.pension === 188410, W.pension);
check('건강 3.595% 142,600 · 요양 13.14% 18,730 · 고용 0.9% 35,700', W.health === 142600 && W.care === 18730 && W.employ === 35700, [W.health, W.care, W.employ]);
check('소득세 10~25만 범위·지방세 = 소득세 10%', W.incomeTax > 100000 && W.incomeTax < 250000 && W.localTax === Math.floor(W.incomeTax * 0.1 / 10) * 10, W.incomeTax);
check('실수령 340~370만', W.net > 3.4e6 && W.net < 3.7e6, Math.round(W.net));
check('국민연금 상한 659만 적용 (연 2억)', C.salary(2e8, 0, 1, 0).pension === Math.floor(6590000 * 0.0475 / 10) * 10);
check('부양가족 늘면 소득세 감소', C.salary(5e7, 2e5, 3, 1).incomeTax < W.incomeTax);
check('고소득 결정세액 > 0', C.incomeTaxYear(1e9, 1, 0, 0, 0) > 0);

// 15) 퍼센트·부가세·시급
check('200의 15% = 30', C.percent.of(200, 15) === 30);
check('30은 200의 15%', C.percent.ratio(30, 200) === 15);
check('80→100 = +25%', C.percent.change(80, 100) === 25);
check('100을 10% 줄이면 90', near(C.percent.apply(100, -10), 90, 1e-9));
check('공급가 100만 → 부가세 10만·합계 110만', C.vat(1000000, 'supply').total === 1100000);
check('합계 110만 → 공급가 100만·부가세 10만', C.vat(1100000, 'total').supply === 1000000 && C.vat(1100000, 'total').tax === 100000);
let G = C.wage(10320, 8, 5);
check('주 40시간 → 주휴 8시간, 월 209시간, 월 2,156,880원 (2026 최저임금 월 환산)', G.holidayHours === 8 && G.monthHours === 209 && G.monthPay === 2156880, G);
check('주 20시간 → 주휴 4시간', C.wage(10320, 4, 5).holidayHours === 4);
check('주 14시간 → 주휴 없음', C.wage(10320, 7, 2).holidayHours === 0);
const WO = (tax, e = {}) => Object.assign({ tax, pension: true, health: true, employ: true, family: 1, probation: false, absentDays: 0 }, e);
let WG = C.wage(10320, 8, 5, WO('earned'));
check('최저임금 4대보험: 연금 102,450·건보 77,540·요양 10,180·고용 19,410', WG.pension === 102450 && WG.health === 77540 && WG.care === 10180 && WG.employ === 19410, WG);
check('회사 부담 = 연금·건보·요양 같은 금액 + 고용 1.15%', WG.boss.pension === WG.pension && WG.boss.health === WG.health && WG.boss.employ === 24800, WG.boss);
WG = C.wage(10320, 8, 5, WO('biz'));
check('3.3%: 소득세 64,700 + 지방 6,470, 4대보험 0', WG.incomeTax === 64700 && WG.localTax === 6470 && WG.pension + WG.health + WG.employ === 0 && WG.net === 2085710, WG);
check('일용직 일당 8.3만 → 세금 0', C.wage(10320, 8, 5, WO('daily')).incomeTax === 0);
WG = C.wage(25000, 8, 5, WO('daily', { pension: false, health: false, employ: false }));
check('일용직 일당 20만 × 22일 → 소득세 29,700·지방 2,970', WG.incomeTax === 29700 && WG.localTax === 2970, WG);
check('떼지 않음 → 실수령 = 세전', C.wage(10320, 8, 5, WO('none')).net === 2156880);
WG = C.wage(10320, 8, 5, WO('none', { absentDays: 1 }));
check('결근 1일 → 근무 82,560 + 주휴 82,560 차감', WG.gross === 2156880 - 165120, WG);
WG = C.wage(10320, 8, 5, WO('none', { probation: true }));
check('수습 90% → 시급 9,288, 최저임금 90% 이상이라 적법', WG.rate === 9288 && !WG.rateBelowMin, WG);
check('수습 + 시급 1만 → 9,000원은 위반 경고', C.wage(10000, 8, 5, WO('none', { probation: true })).rateBelowMin);

// 16) 글자 수·평단가
let T2 = C.charCount('안녕 하세요\nabc');
check('글자수 공백포함 10·제외 8·줄 2·단어 3·UTF-8 20바이트', T2.withSpace === 10 && T2.noSpace === 8 && T2.lines === 2 && T2.words === 3 && T2.utf8 === 20, T2);
check('평단가 (1만×10 + 8천×10) = 9,000', C.avgPrice([{ price: 10000, qty: 10 }, { price: 8000, qty: 10 }]).avg === 9000);

// 17) 실업급여 2026: 상한 68,100, 하한 66,048(8시간)
check('평균임금 일 15만 → 상한 68,100', C.unemployment(150000, 8, 3, false).daily === 68100);
check('평균임금 일 10만 → 60%=60,000 < 하한 66,048', C.unemployment(100000, 8, 3, false).daily === 66048);
check('4시간 근로 하한 = 33,024', C.unemployment(40000, 4, 3, false).daily === 33024);
check('소정급여일수: 1년 미만 120 · 50세 미만 3~5년 180 · 50세 이상 10년 이상 270', C.unemployment(1e5, 8, 0.5, false).days === 120 && C.unemployment(1e5, 8, 4, false).days === 180 && C.unemployment(1e5, 8, 12, true).days === 270);

// 18) 대환·취득세·청약·목표·BMI
let F = C.refinance(2e8, 0.055, 0.045, 240, 0.012, 12, 36, 300000);
check('대환: 이자 절감 > 0, 순이익 = 절감 − 수수료 − 비용', F.save > 0 && near(F.net, F.save - F.fee - 300000), F);
check('취득세 승용 3,000만 → 210만', C.carAcqTax(3e7, 'car').pay === 2100000);
check('경차 1,500만 → 4% 60만 − 감면 60만 = 0', C.carAcqTax(1.5e7, 'light').pay === 0);
check('경차 2,000만 → 80만 − 75만 = 5만', C.carAcqTax(2e7, 'light').pay === 50000);
check('전기차 4,000만 → 280만 − 140만 = 140만', C.carAcqTax(4e7, 'ev').pay === 1400000);
let H = C.subscription(15, 6, 15, 0);
check('청약 만점 84 (무주택 15년·부양 6명·통장 15년)', H.total === 84, H);
check('유주택 0점 · 부양 0명 5점 · 통장 6개월 미만 1점', C.subscription(-1, 0, 0.3, 0).total === 6);
check('무주택 1년 미만 2점 · 3년 8점', C.subscription(0.5, 0, 0, 0).home === 2 && C.subscription(3, 0, 0, 0).home === 8);
check('배우자 통장 50%(최대 3점) 합산', C.subscription(0, 0, 5, 10).spouse === 3 && C.subscription(0, 0, 5, 10).account === 10);
let O = C.goal(1e8, 5, 0.04, 0);
check('목표 1억·5년·4% → 월 적립 × FV 공식 = 1억', near(O.monthly * (Math.pow(1 + 0.04 / 12, 60) - 1) / (0.04 / 12), 1e8, 1), O.monthly);
let Z = C.bmi(170, 65);
check('BMI 170cm 65kg = 22.49 정상, 정상체중 53.5~66.2kg', near(Z.bmi, 22.49, 0.01) && Z.level === '정상' && near(Z.normalMin, 53.47, 0.01) && near(Z.normalMax, 66.18, 0.01), Z);

// 승률: 52승 48패 → .520, 60%까지 (0.6×100−52)/0.4 = 20연승, 50% 지키며 4연패까지
let WR = C.winRate(52, 48, 0, 'exclude', 0.6);
check('승률 52승 48패 = 52%, 60%까지 20연승', near(WR.rate, 0.52, 1e-9) && WR.needWins === 20, WR);
WR = C.winRate(52, 48, 0, 'exclude', 0.5);
check('50% 유지하며 4연패까지', WR.canLose === 4, WR);
WR = C.winRate(10, 5, 2, 'half', 0.6);
check('무승부 0.5승: (10+1)/17 = 64.7%', near(WR.rate, 11 / 17, 1e-9), WR);
check('KBO 방식은 무승부 제외: 10/15', near(C.winRate(10, 5, 2, 'exclude', 0.5).rate, 10 / 15, 1e-9));
check('한 번 졌으면 100% 도달 불가', C.winRate(5, 1, 0, 'exclude', 1).needWins === Infinity);

// 검색: 정확·초성·별칭·오타·한/영 자판 실수·404 주소
const SR = require('../assets/search.js');
const IDX = require('../pages.js').filter((p) => p.calc).map((p) => ({ s: p.slug, n: p.short, l: p.lead }));
const top = (q) => (SR.search(IDX, q).hits[0] || {}).s;
check('정확: 군적금', top('군적금') === 'military');
check('초성: ㄱㅈㄱ', top('ㄱㅈㄱ') === 'military');
check('별칭: 월급 → 연봉 실수령액', top('월급') === 'salary');
check('오타: 군젹금 → 군적금', top('군젹금') === 'military' && SR.search(IDX, '군젹금').fuzzy);
check('오타: 연봉실수렁액 → 연봉', top('연봉실수렁액') === 'salary');
check('오타: 자동차새 → 자동차세', top('자동차새') === 'car-tax');
check('오타: 퇴직굼 → 퇴직금', top('퇴직굼') === 'severance');
check('오타: 실업긊여 → 실업급여', top('실업긊여') === 'unemployment');
check('오타: 숭률 → 승률', top('숭률계산기') === 'winrate');
check('한/영: dusqhd → 연봉', top('dusqhd') === 'salary' && SR.search(IDX, 'dusqhd').via === 'qwerty');
check('한/영: rnswjrrma → 군적금', top('rnswjrrma') === 'military');
check('영문 그대로: BMI', top('bmi') === 'bmi');
check('엉뚱한 말은 추천 안 함: 김치찌개', SR.search(IDX, '김치찌개').hits.length === 0);
check('404: /salry/ → salary', (SR.nearSlug(IDX, '/salry/') || {}).s === 'salary');
check('404: /wnrate/ → winrate', (SR.nearSlug(IDX, '/wnrate/') || {}).s === 'winrate');

// 추가 4종 (2026-10-22) — 법령 예시·공식 요율표·언론 계산 예시로 검산
let LV = C.annualLeave('2025-01-01', '2025-12-31', 0, 100000);
check('연차: 1년 계약(365일) 후 퇴사 → 11일만 (15일 미발생)', LV.cur === 11 && LV.years === 0, LV);
LV = C.annualLeave('2025-01-01', '2026-01-01', 0, 100000);
check('연차: 1년 + 하루 → 11 + 15 = 26일, 수당 260만 원', LV.cur === 26 && LV.pay === 2600000, LV);
LV = C.annualLeave('2020-03-02', '2026-10-22', 5, 100000);
check('연차: 6년 근속 → 17일, 누적 107일, 다음 2027-03-02에 18일, 5일 쓰면 12일 남음', LV.cur === 17 && LV.total === 107 && LV.next.date === '2027-03-02' && LV.next.days === 18 && LV.unused === 12, LV);
check('연차 일수: 1·2년 15, 3년 16, 5년 17, 21년 25, 30년 25(상한)', [1, 2, 3, 5, 21, 30].map(C.leaveGrant).join() === '15,15,16,17,25,25');
check('연차: 1월 31일 입사 → 첫 월차 3월 1일(2월엔 31일이 없어 말일에 1개월 끝남)', C.annualLeave('2026-01-31', '2026-02-28', 0, 0).monthly === 0 && C.annualLeave('2026-01-31', '2026-03-01', 0, 0).monthly === 1);
check('연차: 입사 전 날짜면 null', C.annualLeave('2026-05-01', '2026-04-30', 0, 0) === null);
check('복비: 주택 매매 10억 → 0.5% 500만 원', C.brokerage('house', 'sale', 1e9, 0, 0, false).fee === 5000000);
check('복비: 매매 1.9억 → 0.5% 95만 → 한도 80만 원', C.brokerage('house', 'sale', 1.9e8, 0, 0, false).fee === 800000);
check('복비: 매매 2억 → 0.4% 80만 원 (2억부터 다음 구간)', C.brokerage('house', 'sale', 2e8, 0, 0, false).rate === 0.004);
check('복비: 매매 15억 → 0.7% 1,050만 원', C.brokerage('house', 'sale', 15e8, 0, 0, false).fee === 10500000);
check('복비: 전세 3억 → 0.3% 90만 원', C.brokerage('house', 'lease', 0, 3e8, 0, false).fee === 900000);
check('복비: 보증금 1천 + 월세 30만 → ×100 = 4천만 < 5천만 → ×70 = 3,100만 × 0.5% = 155,000원', C.brokerage('house', 'lease', 0, 1e7, 3e5, false).fee === 155000);
check('복비: 보증금 5천 + 월세 50만 → 1억 × 0.3% = 30만 원', C.brokerage('house', 'lease', 0, 5e7, 5e5, false).fee === 300000);
check('복비: 오피스텔 매매 3억 0.5% + 부가세 → 165만 원', C.brokerage('officetel', 'sale', 3e8, 0, 0, true).total === 1650000);
check('종소세 기본세율: 과표 1,400만 84만·5,000만 624만·8,800만 1,536만', C.basicTax(14e6) === 840000 && C.basicTax(50e6) === 6240000 && C.basicTax(88e6) === 15360000);
let FT = C.freelanceTax(3e7, 0.641, 1, 0);
check('3.3%: 수입 3천만·64.1% → 소득 1,077만, 결정 486,200 + 지방 48,620, 환급 455,180원', FT.earn === 10770000 && FT.tax === 486200 && FT.local === 48620 && FT.refund === 455180, FT);
FT = C.freelanceTax(6.5e7, 0.641, 1, 0);
check('3.3%: 수입 6,500만 → 경비 = 4천만 × 64.1% + 2,500만 × 49.74%', Math.round(FT.expense) === Math.round(4e7 * 0.641 + 2.5e7 * 0.4974), FT.expense);
check('3.3%: 수입 500만 → 세금 0, 미리 낸 165,000원 전액 환급', C.freelanceTax(5e6, 0.641, 1, 0).refund === 165000);
let EL = C.electricity(350, false, 0, 0);
check('전기: 기타 계절 350kWh 기본+전력량 57,790원 (기사 예시)', EL.basic + EL.energy === 57790, EL);
EL = C.electricity(350, true, 0, 0);
check('전기: 여름 350kWh 48,330원 (기사 예시)', EL.basic + EL.energy === 48330, EL);
EL = C.electricity(450, false, 0, 0);
check('전기: 기타 계절 450kWh 89,585원, 3단계', EL.basic + EL.energy === 89585 && EL.step === 3, EL);
check('전기: 여름 450kWh 69,790원, 2단계', (() => { const y = C.electricity(450, true, 0, 0); return y.basic + y.energy === 69790 && y.step === 2; })());
EL = C.electricity(350, false, 9, 5);
check('전기: 350kWh 청구 = (57,790 + 3,150 + 1,750) + 부가세 6,269 + 기금 1,690 → 70,640원', EL.sum === 62690 && EL.vat === 6269 && EL.fund === 1690 && EL.total === 70640, EL);
check('전기: 200kWh는 1단계, 201kWh는 2단계', C.electricity(200, false, 9, 5).step === 1 && C.electricity(201, false, 9, 5).step === 2);

const PG = require('../pages.js');
check('사이트맵 제외: 감사 페이지 noindex', PG.find((p) => p.slug === 'contact/thanks').noindex === true);
check('모든 계산기 FAQ 3개 이상', PG.filter((p) => p.calc).every((p) => (p.faq || []).length >= 3));

console.log(fail ? `\n❌ 실패 ${fail}건` : '\n✅ 전체 통과');
process.exitCode = fail ? 1 : 0;
