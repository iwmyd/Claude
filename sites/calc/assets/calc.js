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

  const api = { loan, deposit, savings, prepayFee };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Calc = api;
})(this);
