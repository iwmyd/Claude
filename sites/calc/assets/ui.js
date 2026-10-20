/* 계산기 화면 연결 — 입력이 바뀌면 즉시 다시 계산 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const won = (v) => Math.round(v).toLocaleString('ko-KR') + '원';
  const num = (id) => { const el = $(id); return el ? Number(String(el.value).replace(/[^\d.\-]/g, '')) || 0 : 0; };
  const signed = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v)).toLocaleString('ko-KR') + '원';
  const kpi = (items) => `<div class="kpis">${items.map(([k, v, cls]) => `<div class="kpi ${cls || ''}"><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;

  // 금액 입력칸: 천 단위 쉼표
  document.querySelectorAll('input[data-money]').forEach((el) => el.addEventListener('input', () => {
    const d = el.value.replace(/[^\d]/g, ''); el.value = d ? Number(d).toLocaleString('ko-KR') : '';
  }));

  const METHODS = [['equal-payment', '원리금균등'], ['equal-principal', '원금균등'], ['bullet', '만기일시']];
  const run = {
    loan() {
      const P = num('principal'), rate = num('rate') / 100, n = Math.round(num('years') * 12), d = num('delta') / 100;
      if (!P || !n) return;
      const res = METHODS.map(([m, label]) => [label, Calc.loan(P, rate, n, m)]);
      const rows = res.map(([label, r]) => `<tr><th>${label}</th><td>${won(r.first)}</td><td>${won(r.last)}</td><td>${won(r.totalInterest)}</td></tr>`).join('');
      const base = Calc.loan(P, rate, n, 'equal-payment');
      const sc = [-2, -1, 0, 1, 2].map((k) => {
        const rr = Math.max(0, rate + k * d), x = Calc.loan(P, rr, n, 'equal-payment');
        return `<tr class="${k === 0 ? 'now' : ''}"><th>${k === 0 ? '현재' : (k > 0 ? '+' : '−') + (Math.abs(k) * d * 100).toFixed(2) + '%p'}</th><td>${(rr * 100).toFixed(2)}%</td><td>${won(x.first)}</td><td>${k === 0 ? '-' : signed(x.first - base.first)}</td><td>${k === 0 ? '-' : signed(x.totalInterest - base.totalInterest)}</td></tr>`;
      }).join('');
      $('out').innerHTML = kpi([['원리금균등 월 상환액', won(base.first), 'main'], ['총 이자', won(base.totalInterest)], ['총 상환액', won(base.totalPayment)]]) +
        `<h3>상환 방식별 비교</h3><table><thead><tr><th>방식</th><th>첫 달</th><th>마지막 달</th><th>총 이자</th></tr></thead><tbody>${rows}</tbody></table>
<h3>금리가 바뀌면? (원리금균등)</h3><table><thead><tr><th>변동</th><th>금리</th><th>월 상환액</th><th>월 차이</th><th>총이자 차이</th></tr></thead><tbody>${sc}</tbody></table>`;
      const m = $('schedMethod') ? $('schedMethod').value : 'equal-payment';
      const s = Calc.loan(P, rate, n, m).rows;
      $('sched').innerHTML = `<table><thead><tr><th>회차</th><th>이자</th><th>원금</th><th>상환액</th><th>남은 잔액</th></tr></thead><tbody>${s.map((r) => `<tr><td>${r.n}</td><td>${won(r.interest)}</td><td>${won(r.principal)}</td><td>${won(r.payment)}</td><td>${won(Math.max(0, r.end))}</td></tr>`).join('')}</tbody></table>`;
    },
    savings() {
      const kind = $('kind').value, A = num('amount'), rate = num('rate') / 100, n = Math.round(num('months')), c = $('compound').value, t = Number($('tax').value);
      if (!A || !n) return;
      const r = kind === 'deposit' ? Calc.deposit(A, rate, n, c, t) : Calc.savings(A, rate, n, c, t);
      const paid = kind === 'deposit' ? A : r.paid;
      $('out').innerHTML = kpi([['세후 받는 금액', won(r.total), 'main'], ['세후 이자', won(r.net)], ['세전 이자', won(r.gross)], ['이자 세금', won(r.tax)], ['넣은 원금', won(paid)]]) +
        `<p class="note">원금 대비 세후 이자 ${(r.net / paid * 100).toFixed(2)}% (기간 전체 기준)</p>`;
    },
    prepay() {
      const x = Calc.prepayFee(num('repay'), num('feeRate') / 100, Math.round(num('elapsed')), Math.round(num('feePeriod')));
      $('out').innerHTML = kpi([['예상 중도상환수수료', won(x.fee), 'main'], ['남은 부과 기간', x.remain + '개월'], ['적용 비율', (x.ratio * 100).toFixed(1) + '%']]) +
        (x.fee === 0 ? '<p class="note">부과 기간이 지나 수수료가 없습니다.</p>' : '');
    },
  };
  const el = document.querySelector('[data-calc]');
  if (!el) return;
  const go = run[el.dataset.calc];
  document.querySelectorAll('input,select').forEach((i) => i.addEventListener('input', go));
  go();
})();
