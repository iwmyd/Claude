/* 에이팜 계산기 — 계산 로직 (브라우저·Node 공용, 외부 의존성 없음)
 * 모든 계산은 월 단위 단순 계산. 가정은 각 페이지 "계산 기준" 에 표시한다. */
(function (root) {
  'use strict';

  /** 대출 상환 스케줄. method: 'equal-payment'(원리금균등) | 'equal-principal'(원금균등) | 'bullet'(만기일시) */
  function loan(principal, annualRate, months, method) {
    const r = annualRate / 12;
    const pmt = r === 0 ? principal / months : (principal * r) / (1 - Math.pow(1 + r, -months));
    const rows = [];
    let bal = principal, totalInterest = 0;
    for (let i = 1; i <= months; i++) {
      const interest = bal * r;
      let prin;
      if (i === months) prin = bal;
      else if (method === 'equal-payment') prin = pmt - interest;
      else if (method === 'equal-principal') prin = principal / months;
      else prin = 0;
      const pay = interest + prin;
      rows.push({ n: i, begin: bal, interest, principal: prin, payment: pay, end: bal - prin });
      totalInterest += interest;
      bal -= prin;
    }
    return { rows, first: rows[0].payment, last: rows[rows.length - 1].payment, totalInterest, totalPayment: principal + totalInterest };
  }

  /** 예금(목돈 1회 예치) 이자. compound: 'simple' | 'monthly' */
  function deposit(amount, annualRate, months, compound, taxRate) {
    const r = annualRate / 12;
    const gross = compound === 'monthly' ? amount * (Math.pow(1 + r, months) - 1) : amount * r * months;
    const tax = Math.floor(gross * taxRate / 10) * 10; // 원 단위 절사(10원 미만) — 단순화
    return { gross, tax, net: gross - tax, total: amount + gross - tax };
  }

  /** 적금(매월 같은 금액 납입) 이자. 1회차는 n개월, 마지막 회차는 1개월 이자. */
  function savings(monthly, annualRate, months, compound, taxRate) {
    const r = annualRate / 12;
    let gross = 0;
    for (let k = 1; k <= months; k++) {
      const m = months - k + 1; // k회차 납입금이 이자를 받는 개월 수
      gross += compound === 'monthly' ? monthly * (Math.pow(1 + r, m) - 1) : monthly * r * m;
    }
    const tax = Math.floor(gross * taxRate / 10) * 10;
    const paid = monthly * months;
    return { paid, gross, tax, net: gross - tax, total: paid + gross - tax };
  }

  /** 중도상환수수료 = 상환금액 × 수수료율 × 잔여기간 / 수수료 부과기간 (잔여기간이 부과기간을 넘으면 1) */
  function prepayFee(repayAmount, feeRate, elapsedMonths, feePeriodMonths) {
    const remain = Math.max(0, feePeriodMonths - elapsedMonths);
    const ratio = feePeriodMonths > 0 ? Math.min(1, remain / feePeriodMonths) : 0;
    return { remain, ratio, fee: repayAmount * feeRate * ratio };
  }

  /** 퇴직금 = 1일 평균임금 × 30 × (재직일수 ÷ 365). 1일 평균임금 = 최근 3개월 임금총액 ÷ 그 기간 총일수
   *  (근로자퇴직급여 보장법 제8조, 근로기준법 제2조 제1항 제6호). 재직 1년 미만이면 법정 퇴직금 없음. */
  function severance(wage3m, days3m, serviceDays, bonusYear, leavePayYear) {
    const extra = (bonusYear || 0) * 3 / 12 + (leavePayYear || 0) * 3 / 12; // 상여·연차수당은 3개월분 가산
    const daily = days3m > 0 ? (wage3m + extra) / days3m : 0;
    const eligible = serviceDays >= 365;
    return { daily, eligible, amount: eligible ? daily * 30 * (serviceDays / 365) : 0 };
  }

  /** 전월세 전환: 보증금 일부를 월세로 돌릴 때 월세 = 전환 보증금 × 전환율 ÷ 12.
   *  법정 상한 전환율 = min(연 10%, 한국은행 기준금리 + 연 2%) (주택임대차보호법 제7조의2, 시행령 제9조). */
  function rentConvert(depositAmount, baseRate) {
    const legalRate = Math.min(0.10, baseRate + 0.02);
    return { legalRate, monthly: depositAmount * legalRate / 12, yearly: depositAmount * legalRate };
  }

  /** DSR = 모든 대출의 연간 원리금 상환액 ÷ 연소득. loans: [{principal, rate, months, method}] (원리금은 첫 해 12개월 합) */
  function dsr(annualIncome, loans) {
    const yearly = loans.reduce((sum, l) => {
      if (!l.principal || !l.months) return sum;
      const rows = loan(l.principal, l.rate, l.months, l.method).rows.slice(0, 12);
      return sum + rows.reduce((a, r) => a + r.payment, 0) * (12 / rows.length);
    }, 0);
    return { yearly, ratio: annualIncome > 0 ? yearly / annualIncome : 0 };
  }

  /** 카드 할부수수료(잔액 기준): 매달 원금 균등 + 남은 원금 × 연수수료율 ÷ 12. 총수수료 = 원금 × 율/12 × (개월+1)/2 */
  function installment(amount, annualFeeRate, months) {
    const r = loan(amount, annualFeeRate, months, 'equal-principal');
    return { rows: r.rows, first: r.first, totalFee: r.totalInterest, total: r.totalPayment };
  }

  /** 장병내일준비적금 (국방부 안내, 2025.1~): 월 한도 55만(계좌당 30만), 은행이자 비과세(단리 적립식), 만기 시 원금 100% 매칭지원금 */
  const MILITARY = { maxMonthly: 550000, perAccount: 300000, matchRatio: 1.0 };
  function military(monthly, annualRate, months) {
    const m = Math.min(monthly, MILITARY.maxMonthly);
    const s = savings(m, annualRate, months, 'simple', 0);
    const match = s.paid * MILITARY.matchRatio;
    return { monthly: m, capped: monthly > MILITARY.maxMonthly, paid: s.paid, interest: s.gross, match, total: s.paid + s.gross + match };
  }

  /** 날짜: 두 날짜 사이 일수(b−a), 기념일식 N일째(+1), 날짜 더하기. 입력은 'YYYY-MM-DD' (UTC 기준으로 계산해 시간대 영향 제거) */
  const dayMs = 86400000;
  const toUTC = (s) => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const fmt = (t) => new Date(t).toISOString().slice(0, 10);
  function dday(from, to) { const diff = Math.round((toUTC(to) - toUTC(from)) / dayMs); return { diff, nth: diff >= 0 ? diff + 1 : diff }; }
  function addDays(from, n) { return fmt(toUTC(from) + n * dayMs); }

  /** 나이: 만 나이(행정기본법 제7조의2, 2023.6.28~ 원칙), 연 나이(현재연도−출생연도), 세는 나이(+1) */
  function age(birth, today) {
    const [by, bm, bd] = birth.split('-').map(Number), [ty, tm, td] = today.split('-').map(Number);
    const man = ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
    return { man, year: ty - by, counting: ty - by + 1 };
  }

  /** 평 ↔ ㎡ : 1평 = 400/121 ㎡ (≈3.305785㎡) */
  const PYEONG = 400 / 121;
  const toPyeong = (m2) => m2 / PYEONG, toM2 = (py) => py * PYEONG;

  const api = { loan, deposit, savings, prepayFee, severance, rentConvert, dsr, installment, military, MILITARY, dday, addDays, age, toPyeong, toM2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Calc = api;
})(this);
