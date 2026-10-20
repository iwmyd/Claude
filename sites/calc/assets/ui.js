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
    severance() {
      const x = Calc.severance(num('wage3m'), num('days3m'), Math.round(num('serviceDays')), num('bonus'), num('leavePay'));
      $('out').innerHTML = kpi([['예상 퇴직금(세전)', won(x.amount), 'main'], ['1일 평균임금', won(x.daily)], ['근속 연수', (num('serviceDays') / 365).toFixed(2) + '년']]) +
        (x.eligible ? '' : '<p class="note">재직 1년 미만이라 법정 퇴직금 지급 대상이 아닙니다.</p>');
    },
    rent() {
      const x = Calc.rentConvert(num('convert'), num('baseRate') / 100);
      $('out').innerHTML = kpi([['월세 상한', won(x.monthly), 'main'], ['적용 전환율', (x.legalRate * 100).toFixed(2) + '%'], ['연간 월세 합계', won(x.yearly)]]) +
        (x.legalRate >= 0.10 ? '<p class="note">기준금리+2%가 10%를 넘어 상한 10%가 적용됐습니다.</p>' : '');
    },
    dsr() {
      const loans = [1, 2].map((i) => ({ principal: num('p' + i), rate: num('r' + i) / 100, months: Math.round(num('y' + i) * 12), method: 'equal-payment' }));
      const x = Calc.dsr(num('income'), loans);
      $('out').innerHTML = kpi([['DSR', (x.ratio * 100).toFixed(2) + '%', 'main'], ['연간 원리금 합계', won(x.yearly)], ['월평균 상환액', won(x.yearly / 12)]]);
    },
    installment() {
      const x = Calc.installment(num('amount'), num('feeRate') / 100, Math.round(num('months')));
      $('out').innerHTML = kpi([['첫 달 납입금', won(x.first), 'main'], ['총 할부 수수료', won(x.totalFee)], ['총 납입금', won(x.total)]]) +
        `<h3>회차별 납입금</h3><table><thead><tr><th>회차</th><th>원금</th><th>수수료</th><th>납입금</th></tr></thead><tbody>${x.rows.map((r) => `<tr><td>${r.n}</td><td>${won(r.principal)}</td><td>${won(r.interest)}</td><td>${won(r.payment)}</td></tr>`).join('')}</tbody></table>`;
    },
    military() {
      const months = Math.min(Math.round(num('months')), Number($('branch').value));
      const x = Calc.military(num('monthly'), num('rate') / 100, months);
      $('out').innerHTML = kpi([['전역 시 받는 금액', won(x.total), 'main'], ['정부 매칭지원금', won(x.match)], ['은행이자(비과세)', won(x.interest)], ['넣은 원금', won(x.paid)]]) +
        (x.capped ? '<p class="note">월 한도 55만 원을 넘어 55만 원으로 계산했습니다.</p>' : '') +
        (months < Math.round(num('months')) ? `<p class="note">선택한 복무 구분의 최대 가입기간 ${months}개월로 계산했습니다.</p>` : '');
    },
    dday() {
      const from = $('from').value || today(), to = $('to').value, add = Math.round(num('add'));
      const items = [];
      if (to) { const d = Calc.dday(from, to); items.push([`${from} → ${to}`, d.diff >= 0 ? `D-${d.diff}` : `D+${-d.diff}`, 'main'], ['기념일 기준', d.diff >= 0 ? `${d.nth}일째` : '지난 날짜'], ['날짜 사이', `${Math.abs(d.diff).toLocaleString('ko-KR')}일`]); }
      items.push([`${add}일 뒤`, Calc.addDays(from, add)], [`${add}일째(시작일 포함)`, Calc.addDays(from, add - 1)]);
      $('out').innerHTML = kpi(items.map(([k, v, c]) => [k, v, c]));
    },
    age() {
      const b = $('birth').value; if (!b) return;
      const x = Calc.age(b, $('today').value || today());
      $('out').innerHTML = kpi([['만 나이', x.man + '세', 'main'], ['연 나이', x.year + '세'], ['세는 나이', x.counting + '세']]);
    },
    area(e) {
      const src = e && e.target && e.target.id;
      if (src === 'py') $('m2').value = +Calc.toM2(num('py')).toFixed(2); else $('py').value = +Calc.toPyeong(num('m2')).toFixed(2);
      const rows = [33, 49, 59, 74, 84, 101, 114, 135].map((m) => `<tr><td>${m}㎡</td><td>${Calc.toPyeong(m).toFixed(1)}평</td></tr>`).join('');
      $('out').innerHTML = kpi([['㎡', num('m2').toLocaleString('ko-KR') + '㎡', 'main'], ['평', num('py').toLocaleString('ko-KR') + '평']]) +
        `<h3>자주 찾는 전용면적</h3><table><thead><tr><th>전용면적</th><th>평 환산</th></tr></thead><tbody>${rows}</tbody></table>`;
    },
  };
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  if ($('from') && !$('from').value) $('from').value = today();
  if ($('to') && !$('to').value) { const d = new Date(); d.setDate(d.getDate() + 100); $('to').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  const el = document.querySelector('[data-calc]');
  if (!el) return;
  const calc = run[el.dataset.calc];
  let t = null;
  const announce = () => { const k = document.querySelector('.kpi.main'), s = $('sr-status'); if (k && s) s.textContent = k.querySelector('span').textContent + ' ' + k.querySelector('b').textContent; };
  const go = (e) => { calc(e); clearTimeout(t); t = setTimeout(announce, 600); };
  document.querySelectorAll('input,select').forEach((i) => i.addEventListener('input', go));
  calc();
})();
