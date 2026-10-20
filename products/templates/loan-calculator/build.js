// 대출 이자 계산기 xlsx 생성 (exceljs) — 사용법 / 계산기 / 상환스케줄
const ExcelJS = require('exceljs');
const out = process.argv[2];
const FONT = '맑은 고딕', NAVY = 'FF1D2A44', BEIGE = 'FFF5F0E6', GRAY = 'FF4A5568', RED = 'FFC9562B';
const WON = '#,##0"원";-#,##0"원";"-"', PCT = '0.00%', MAXN = 480;
const f = (o = {}) => ({ name: FONT, size: o.size || 11, bold: !!o.bold, color: { argb: o.color || 'FF000000' } });
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thin = { style: 'thin', color: { argb: 'FFC9CFDB' } };
const box = { top: thin, left: thin, bottom: thin, right: thin };

const wb = new ExcelJS.Workbook();
wb.creator = '에이팜의 이야기 보따리';
wb.calcProperties.fullCalcOnLoad = true; // 열 때 전체 재계산

// ── 사용법 ──
const u = wb.addWorksheet('사용법', { views: [{ showGridLines: false }] });
u.getColumn(1).width = 3; u.getColumn(2).width = 100;
const L = [
  ['대출 이자 계산기 — 사용법', f({ size: 16, bold: true, color: NAVY })], ['', null],
  ['1. [계산기] 시트의 노란 칸(파란 글씨) 5개만 바꾸세요. 나머지는 자동 계산됩니다.', f()],
  ['   · 대출 원금(원) · 연 이자율 · 대출 기간(개월, 최대 480) · 상환 방식(목록에서 선택) · 금리 변동 폭', f()],
  ['2. [계산기] 아래 "금리가 바뀌면?" 표에서 금리가 오르내릴 때 월 상환액·총이자 차이를 비교할 수 있습니다.', f()],
  ['3. [상환스케줄] 시트에서 매달 이자·원금·남은 잔액을 확인할 수 있습니다.', f()], ['', null],
  ['상환 방식 설명', f({ size: 12, bold: true, color: NAVY })],
  ['· 원리금균등: 매달 같은 금액(이자+원금)을 냅니다. 초반엔 이자 비중이 큽니다.', f()],
  ['· 원금균등: 매달 같은 원금을 갚아 상환액이 점점 줄어듭니다. 세 방식 중 총이자가 가장 적습니다.', f()],
  ['· 만기일시: 매달 이자만 내고 마지막 달에 원금을 한 번에 갚습니다. 세 방식 중 총이자가 가장 많습니다.', f()], ['', null],
  ['꼭 읽어 주세요', f({ size: 12, bold: true, color: RED })],
  ['· 월 단위 단순 계산(연 이자율 ÷ 12)입니다. 실제 은행 이자는 일할 계산·우대금리·수수료 등에 따라 다를 수 있습니다.', f()],
  ['· 변동금리 대출은 계약서의 금리 변동 주기·기준금리(코픽스 등)에 따라 실제 적용 시점이 다릅니다.', f()],
  ['· 참고용 계산 도구이며 금융상품 가입·투자 권유가 아닙니다. 최종 금액은 대출 기관에 확인하세요.', f()], ['', null],
  ['제작: 에이팜의 이야기 보따리 (blog.naver.com/iwmyd99) · Excel·구글 스프레드시트에서 동작합니다.', f({ size: 10, color: GRAY })],
];
L.forEach(([t, ft], i) => { const c = u.getCell(i + 2, 2); c.value = t; if (ft) c.font = ft; c.alignment = { wrapText: true, vertical: 'middle' }; });

// ── 계산기 ──
const s = wb.addWorksheet('계산기', { views: [{ showGridLines: false }] });
[3, 26, 20, 22, 22, 20, 22].forEach((w, i) => (s.getColumn(i + 1).width = w));
s.getCell('B2').value = '대출 이자 계산기'; s.getCell('B2').font = f({ size: 16, bold: true, color: NAVY });
s.getCell('B3').value = '노란 칸만 바꾸세요 (예시 값이 들어 있습니다)'; s.getCell('B3').font = f({ size: 10, color: GRAY });
const inputs = [
  [5, '대출 원금', 300000000, WON, '예시 값. 본인 대출 원금으로 바꾸세요.'],
  [6, '연 이자율', 0.045, PCT, '예시 값. 연 4.5%는 4.5% 로 입력.'],
  [7, '대출 기간(개월)', 360, '0"개월"', '1~480개월. 30년 = 360.'],
  [8, '상환 방식', '원리금균등', '@', '목록에서 선택: 원리금균등 / 원금균등 / 만기일시'],
  [9, '금리 변동 폭', 0.0025, PCT, '아래 비교표의 한 칸 간격. 0.25%p = 0.25%.'],
];
for (const [r, label, val, fmt, note] of inputs) {
  s.getCell(r, 2).value = label; s.getCell(r, 2).font = f({ bold: true });
  const c = s.getCell(r, 3); c.value = val; c.numFmt = fmt; c.font = f({ bold: true, color: 'FF0000FF' }); c.fill = fill('FFFFF2CC'); c.border = box;
  c.note = note;
  s.getCell(r, 4).value = note; s.getCell(r, 4).font = f({ size: 9, color: GRAY });
}
s.getCell('C8').dataValidation = { type: 'list', allowBlank: false, formulae: ['"원리금균등,원금균등,만기일시"'] };
s.getCell('C7').dataValidation = { type: 'whole', operator: 'between', allowBlank: false, formulae: [1, MAXN], showErrorMessage: true, error: '1~480 사이 정수' };

s.getCell('B11').value = '계산 결과'; s.getCell('B11').font = f({ size: 12, bold: true, color: NAVY });
const res = [
  [12, '월 이자율', 'C6/12', '0.0000%'],
  [13, '첫 달 상환액', "'상환스케줄'!F6", WON],
  [14, '마지막 달 상환액', `INDEX('상환스케줄'!F6:F${5 + MAXN},C7)`, WON],
  [15, '총 이자', `SUM('상환스케줄'!D6:D${5 + MAXN})`, WON],
  [16, '총 상환액', 'C5+C15', WON],
];
for (const [r, label, fx, fmt] of res) {
  s.getCell(r, 2).value = label; s.getCell(r, 2).font = f({ bold: true });
  const c = s.getCell(r, 3); c.value = { formula: fx }; c.numFmt = fmt; c.font = f({ bold: true }); c.border = box;
}
s.getCell('B18').value = '금리가 바뀌면? (상환 방식별 비교)'; s.getCell('B18').font = f({ size: 12, bold: true, color: NAVY });
['금리 변동', '적용 연 이자율', '원리금균등 월 상환액', '원금균등 첫 달 상환액', '만기일시 월 이자', '총이자 차이(선택 방식)'].forEach((h, j) => {
  const c = s.getCell(19, 2 + j); c.value = h; c.font = f({ bold: true, color: 'FFFFFFFF' }); c.fill = fill(NAVY);
  c.alignment = { horizontal: 'center', wrapText: true }; c.border = box;
});
const tot = (x) => `IF($C$8="원리금균등",IF(${x}=0,0,PMT(${x}/12,$C$7,-$C$5)*$C$7-$C$5),IF($C$8="원금균등",$C$5*${x}/12*($C$7+1)/2,$C$5*${x}/12*$C$7))`;
[-2, -1, 0, 1, 2].forEach((m, k) => {
  const r = 20 + k;
  const set = (col, fx, fmt) => { const c = s.getCell(r, col); c.value = { formula: fx }; c.numFmt = fmt; c.border = box; c.font = f({ bold: m === 0 }); if (m === 0) c.fill = fill(BEIGE); };
  set(2, `${m}*$C$9`, '+0.00%;-0.00%;"현재"');
  set(3, `MAX(0,$C$6+B${r})`, PCT);
  set(4, `IF(C${r}=0,$C$5/$C$7,PMT(C${r}/12,$C$7,-$C$5))`, WON);
  set(5, `$C$5/$C$7+$C$5*C${r}/12`, WON);
  set(6, `$C$5*C${r}/12`, WON);
  set(7, `${tot(`C${r}`)}-${tot('$C$22')}`, '+#,##0"원";-#,##0"원";"-"');
});
s.getCell('B26').value = '※ 비교표는 대출 전 기간에 같은 금리가 적용된다고 가정한 단순 계산입니다.'; s.getCell('B26').font = f({ size: 9, color: GRAY });
s.getCell('B27').value = '※ 검산: "현재" 행의 총이자 차이는 항상 "-"(0원)입니다.'; s.getCell('B27').font = f({ size: 9, color: GRAY });

// ── 상환스케줄 ──
const t = wb.addWorksheet('상환스케줄', { views: [{ showGridLines: false, state: 'frozen', ySplit: 5 }] });
[3, 8, 20, 18, 18, 18, 20].forEach((w, i) => (t.getColumn(i + 1).width = w));
t.getCell('B2').value = '월별 상환 스케줄'; t.getCell('B2').font = f({ size: 14, bold: true, color: NAVY });
t.getCell('B3').value = { formula: `'계산기'!C8&" · 원금 "&TEXT('계산기'!C5,"#,##0")&"원 · 연 "&TEXT('계산기'!C6,"0.00%")&" · "&'계산기'!C7&"개월"` };
t.getCell('B3').font = f({ size: 10, color: GRAY });
['회차', '기초 잔액', '이자', '원금', '상환액', '기말 잔액'].forEach((h, j) => {
  const c = t.getCell(5, 2 + j); c.value = h; c.font = f({ bold: true, color: 'FFFFFFFF' }); c.fill = fill(NAVY); c.alignment = { horizontal: 'center' }; c.border = box;
});
const P = "'계산기'!$C$5", R = "'계산기'!$C$12", N = "'계산기'!$C$7", M = "'계산기'!$C$8";
const PMT_ = `IF(${R}=0,${P}/${N},PMT(${R},${N},-${P}))`;
for (let i = 1; i <= MAXN; i++) {
  const r = 5 + i, blank = (fx) => ({ formula: `IF(B${r}="","",${fx})` });
  t.getCell(r, 2).value = { formula: `IF(${i}<=${N},${i},"")` };
  t.getCell(r, 3).value = blank(i === 1 ? P : `G${r - 1}`);
  t.getCell(r, 4).value = blank(`C${r}*${R}`);
  t.getCell(r, 5).value = blank(`IF(B${r}=${N},C${r},IF(${M}="원리금균등",${PMT_}-D${r},IF(${M}="원금균등",${P}/${N},0)))`);
  t.getCell(r, 6).value = blank(`D${r}+E${r}`);
  t.getCell(r, 7).value = blank(`C${r}-E${r}`);
  for (let col = 2; col <= 7; col++) { const c = t.getCell(r, col); c.font = f({ size: 10 }); if (col > 2) c.numFmt = '#,##0;-#,##0;0'; }
}
wb.views = [{ activeTab: 1 }];
wb.xlsx.writeFile(out).then(() => console.log('saved', out));
