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

console.log(fail ? `\n❌ 실패 ${fail}건` : '\n✅ 전체 통과');
process.exitCode = fail ? 1 : 0;
