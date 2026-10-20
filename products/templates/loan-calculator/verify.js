// 생성된 xlsx 의 수식을 HyperFormula 로 계산 → 독립 JS 계산과 대조 (3가지 상환 방식 × 2가지 금리)
const ExcelJS = require('exceljs');
const { HyperFormula } = require('hyperformula');
const file = process.argv[2];

const independent = (P, rate, n, mode) => {
  const r = rate / 12; let bal = P, totI = 0, first = null, last = null;
  const pmt = r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
  for (let i = 1; i <= n; i++) {
    const I = bal * r; let prin;
    if (i === n) prin = bal; else if (mode === '원리금균등') prin = pmt - I; else if (mode === '원금균등') prin = P / n; else prin = 0;
    const pay = I + prin; if (i === 1) first = pay; last = pay; totI += I; bal -= prin;
  }
  return { first, last, totI };
};

(async () => {
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(file);
  const sheets = {};
  wb.eachSheet((ws) => {
    const rows = [];
    ws.eachRow({ includeEmpty: true }, (row, rn) => {
      const arr = [];
      row.eachCell({ includeEmpty: true }, (c, cn) => {
        const v = c.value;
        arr[cn - 1] = v && typeof v === 'object' && 'formula' in v ? '=' + v.formula : v && typeof v === 'object' && v.richText ? v.richText.map((x) => x.text).join('') : v;
      });
      rows[rn - 1] = arr;
    });
    for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
    sheets[ws.name] = rows;
  });
  const hf = HyperFormula.buildFromSheets(sheets, { licenseKey: 'gpl-v3' });
  const S = hf.getSheetId('계산기');
  const at = (a1) => { const m = a1.match(/([A-Z]+)(\d+)/); return { sheet: S, col: m[1].charCodeAt(0) - 65, row: +m[2] - 1 }; };
  const get = (a1) => hf.getCellValue(at(a1));
  let fail = 0, errs = 0;
  // 전체 오류 셀 검사
  for (const name of Object.keys(sheets)) {
    const id = hf.getSheetId(name), dim = hf.getSheetDimensions(id);
    for (let r = 0; r < dim.height; r++) for (let c = 0; c < dim.width; c++) {
      const v = hf.getCellValue({ sheet: id, row: r, col: c });
      if (v && typeof v === 'object' && v.type) { errs++; if (errs < 5) console.log('❌ 오류', name, r + 1, c + 1, v.type, v.message); }
    }
  }
  for (const mode of ['원리금균등', '원금균등', '만기일시']) for (const [P, rate, n] of [[300000000, 0.045, 360], [100000000, 0.0325, 120]]) {
    hf.setCellContents(at('C5'), P); hf.setCellContents(at('C6'), rate); hf.setCellContents(at('C7'), n); hf.setCellContents(at('C8'), mode);
    const x = independent(P, rate, n, mode);
    const got = { first: get('C13'), last: get('C14'), totI: get('C15') };
    const ok = ['first', 'last', 'totI'].every((k) => Math.abs(got[k] - x[k]) < 1);
    const diffNow = get('G22');
    const ok2 = Math.abs(diffNow) < 1e-6;
    if (!ok || !ok2) fail++;
    console.log(`${ok && ok2 ? '✅' : '❌'} ${mode} ${P / 1e8}억 ${(rate * 100).toFixed(2)}% ${n}개월 → 첫달 ${Math.round(got.first).toLocaleString()} / 마지막 ${Math.round(got.last).toLocaleString()} / 총이자 ${Math.round(got.totI).toLocaleString()} (독립계산 총이자 ${Math.round(x.totI).toLocaleString()}) · 현재행 차이 ${diffNow}`);
    if (mode === '원리금균등' && n === 360) console.log('   비교표 +0.25%p 원리금균등 월상환 ' + Math.round(get('D23')).toLocaleString() + ' / 총이자 차이 ' + Math.round(get('G23')).toLocaleString());
  }
  // 비교표 총이자(폐형식) vs 스케줄 합계 일치 (현재 금리)
  console.log(`\n오류 셀 ${errs}개 · 대조 실패 ${fail}건`);
  process.exitCode = errs || fail ? 1 : 0;
})();
