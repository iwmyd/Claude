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

console.log(fail ? `\n❌ 실패 ${fail}건` : '\n✅ 전체 통과');
process.exitCode = fail ? 1 : 0;
