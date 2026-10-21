// 게임·사진 계산기 (2026-10-22) — FC 온라인 이적시장 수수료 계산기, 사진 계산기. pages.js 의 입력칸 도우미(f, sel, form)를 받아 쓴다.
const FC_MAX = 10; // 선수 줄 최대 개수 (입력값 저장·공유를 위해 미리 만들어 두고 숨김)
const COUPON_OPTS = [['0', '쿠폰 안 씀'], ['20', '20% 할인 쿠폰'], ['30', '30% 할인 쿠폰'], ['40', '40% 할인 쿠폰'], ['50', '50% 할인 쿠폰'], ['x', '직접 입력']];
const opts = (arr) => arr.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
const bp = (id, label, value = '', help = '') => `<label class="f"><span class="fl">${label}</span><span class="fi"><input id="${id}" type="text" inputmode="text" autocomplete="off" data-bp${value ? ` value="${value}"` : ''}><em>BP</em></span><small class="won" id="${id}-k"></small>${help ? `<small>${help}</small>` : ''}</label>`;
const couponSel = (id, cx, xid, capId) => `<label class="f"><span class="fl">수수료 할인 쿠폰</span><select id="${id}">${opts(COUPON_OPTS)}</select></label>
<div class="fw" data-show="${cx}"><label class="f"><span class="fl">쿠폰 할인율</span><span class="fi"><input id="${xid}" type="number" inputmode="numeric" min="0" max="100" step="5" value="10"><em>%</em></span></label></div>
${bp(capId, '쿠폰 최대 할인 금액', '', '쿠폰에 "최대 ○○ BP 할인"이 적혀 있을 때만 (없으면 비움)')}`;
const fcRow = (i) => `<fieldset class="sub fc-row" data-row="${i}"${i > 1 ? ' hidden' : ''}><legend>선수 ${i}</legend>
${i > 1 ? `<button type="button" class="linkbtn fc-del" data-fc-del="${i}" aria-label="선수 ${i} 빼기">빼기</button>` : ''}
<div class="form">${bp('fcp' + i, '판매 금액', i === 1 ? '1억' : '')}${couponSel('fcc' + i, 'cx' + i, 'fcx' + i, 'fcm' + i)}</div></fieldset>`;

module.exports = (f, sel, form) => [
  { slug: 'fc-transfer', calc: 'fc', cat: 'game', tone: 'violet', icon: 'ball', short: 'FC 온라인 이적시장 수수료 계산기', tileName: 'FC 온라인 수수료 계산기', lead: '받는 BP · 쿠폰 · 목표 BP 역산',
    title: 'FC 온라인 이적시장 수수료 계산기 — 받는 BP, 수수료 쿠폰, 목표 BP 역산 | 에이팜 종합계산기',
    desc: 'FC 온라인 이적시장에서 선수를 팔면 수수료 40%를 떼고 얼마를 받는지 계산합니다. 프리미엄 PC방·TOP CLASS 할인, 20~50% 수수료 쿠폰과 최대 할인 한도, 여러 선수 합산, 목표 BP 역산까지.',
    h1: 'FC 온라인 이적시장 수수료 계산기', summary: '판매 금액을 넣으면 수수료 40%와 PC방·TOP CLASS·쿠폰 할인을 반영해 실제로 받는 BP를 계산합니다. 받고 싶은 BP에서 거꾸로 판매가를 구할 수도 있습니다.',
    form: `<div class="form">${sel('fmode', '무엇을 계산할까요?', [['sell', '팔면 얼마 받나'], ['target', '목표 BP를 받으려면 얼마에 팔아야 하나']])}</div>
<div class="chks" role="group" aria-label="수수료 할인 혜택">
<label class="chk"><input type="checkbox" id="fpc"><span><b>프리미엄 PC방</b><small>기본 수수료 30% 할인</small></span></label>
<label class="chk"><input type="checkbox" id="ftop"><span><b>TOP CLASS</b><small>기본 수수료 20% 할인</small></span></label></div>
<div class="fw" data-show="sell"><div class="fc-rows">${Array.from({ length: FC_MAX }, (_, i) => fcRow(i + 1)).join('')}</div>
<input type="hidden" id="fcn" value="1">
<button type="button" class="ab fc-add" data-fc-add>+ 선수 추가</button></div>
<div class="fw" data-show="target"><fieldset class="sub"><legend>목표</legend><div class="form">${bp('ftg', '받고 싶은 BP', '10억')}${couponSel('ftc', 'tcx', 'ftx', 'ftm')}</div></fieldset></div>
<p class="note">금액은 <b>1억 2000만</b>, <b>12.5억</b>, <b>1,250,000,000</b>처럼 편하게 쓰셔도 됩니다.</p>`,
    tips: [['수수료는 판매 금액의 40%', '선수가 팔리면 판매 금액의 40%가 기본 수수료로 빠지고 나머지가 들어옵니다.'], ['PC방·TOP CLASS는 더해집니다', '프리미엄 PC방 30%와 TOP CLASS 20%를 함께 받으면 기본 수수료의 50%가 할인됩니다.'],
      ['쿠폰은 합쳐서 100%까지', 'PC방·TOP CLASS 할인과 쿠폰을 더해 100%를 넘으면 넘는 만큼은 버려집니다. 50%를 이미 받는다면 50% 쿠폰까지만 효과가 있습니다.'], ['한도 있는 쿠폰은 싼 선수에', '최대 할인 금액이 정해진 쿠폰을 비싼 선수에 쓰면 한도에 걸려 할인율만큼 깎이지 않습니다. 선수별 내역 표에서 확인하세요.']],
    basis: ['넥슨 FC 온라인 공식 이적시장 수수료 계산기와 같은 식으로 계산합니다(2026-10-22 확인).', '기본 수수료 = 판매 금액 × 40% (1 BP 미만 버림)', '기본 할인 = 기본 수수료 × (프리미엄 PC방 30% + TOP CLASS 20%) (버림)', '쿠폰 할인 = 기본 수수료 × 쿠폰 할인율 (기본 할인과 합쳐 100% 이하로 자름, 최대 할인 금액 이하, 버림)', '받는 BP = 판매 금액 − (기본 수수료 − 기본 할인 − 쿠폰 할인)', '쿠폰 목록(20·30·40·50%)은 넥슨 공지로 확인한 전체 수수료 할인 쿠폰입니다. 다른 할인율 쿠폰은 "직접 입력"을 고르세요.', '이 계산기는 넥슨·EA의 공식 서비스가 아닙니다. 게임 안 수수료 정책이 바뀌면 결과가 달라질 수 있습니다.'],
    sources: [['EA SPORTS FC ONLINE 이적시장 수수료 계산기', 'https://fconline.nexon.com/common/calculator'], ['FC 온라인 공지사항 (수수료 할인 쿠폰)', 'https://fconline.nexon.com/news/notice/list']],
    faq: [['FC 온라인 이적시장 수수료는 몇 %인가요?', '기본 수수료는 판매 금액의 40%입니다. 1억 BP에 팔리면 4,000만 BP가 수수료로 빠지고 6,000만 BP를 받습니다.'],
      ['PC방과 TOP CLASS 할인은 같이 받을 수 있나요?', '네. 프리미엄 PC방 30%와 TOP CLASS 20%가 더해져 기본 수수료의 50%가 할인됩니다. 1억 BP 판매라면 수수료가 2,000만 BP로 줄어 8,000만 BP를 받습니다.'],
      ['쿠폰을 PC방·TOP CLASS와 같이 쓰면?', '할인율이 더해지되 합계 100%까지만 인정됩니다. 50% 할인을 받는 상태에서 50% 쿠폰을 쓰면 수수료가 0이 되고, 그보다 큰 쿠폰은 효과가 같습니다.'],
      ['최대 할인 금액은 어떻게 적용되나요?', '쿠폰으로 깎이는 금액이 쿠폰에 적힌 최대 할인 금액을 넘으면 최대 할인 금액만큼만 깎입니다.'],
      ['목표 BP 역산은 어떻게 계산하나요?', '수수료를 떼고 목표 BP 이상이 남는 가장 낮은 판매 금액을 찾습니다. 게임에서 등록할 수 있는 가격 단위는 따로 확인하세요.']] },

  { slug: 'image', calc: 'photo', cat: 'basic', tone: 'cyan', icon: 'camera', short: '이미지 계산기', lead: '영수증·고지서·가격표 읽기, 사진으로 면적 재기', js: ['photo.js'],
    title: '이미지 계산기 — 영수증 더치페이·부가세·할인가·전기요금·글자 수·디데이, 사진으로 길이·면적·경사 재기 | 에이팜 종합계산기',
    desc: '이미지를 첨부하고 계산기를 고르면 이미지 속 금액·숫자·날짜·글을 읽어 바로 계산합니다. 영수증 나눠 내기, 부가세, 가격표 할인가, 전기요금 고지서, 글자 수, 디데이, FC 온라인 수수료, 사진 위 길이·면적·경사 재기.',
    h1: '이미지 계산기', summary: '이미지를 첨부하고 원하는 계산기를 선택할 시 계산된 값을 제공합니다.<br><span class="sum-note">*(단, 이미지의 품질이나 알맞지 않은 계산기 선택에 따라 올바르지 못한 값을 제공하거나 값을 도출해내지 못할 수 있습니다.)</span>',
    form: `<div class="form"><label class="f wide"><span class="fl">어떤 계산을 할까요?</span><select id="pmode">
<optgroup label="이미지 속 숫자 읽기">
<option value="receipt">영수증 나눠 내기 — 합계 → 1인당 금액</option>
<option value="vat">부가세 나누기 — 합계 → 공급가액·부가세</option>
<option value="discount">할인가 계산 — 가격표의 가격·할인율</option>
<option value="elec">전기요금 — 고지서의 사용량(kWh)</option>
<option value="fc">FC 온라인 이적시장 — 판매 금액 → 받는 BP</option></optgroup>
<optgroup label="이미지 속 글자·날짜 읽기">
<option value="text">글자 수 세기 — 캡처한 글</option>
<option value="dday">디데이 — 이미지 속 날짜까지 남은 날</option></optgroup>
<optgroup label="이미지 위에서 재기">
<option value="measure">길이·면적 재기 — 기준 길이 → m·㎡·평</option>
<option value="slope">경사·각도 재기 — 두 점 → 각도·%·1:n</option></optgroup>
</select><small>이미지에서 읽거나 잴 수 있는 계산만 모았습니다.</small></label></div>
<label class="pdrop" id="pdrop"><input type="file" id="pfile" accept="image/*"><span class="pdrop-in"><b id="pdrop-t">이미지 첨부하기</b><small>누르거나 끌어다 놓기 · 휴대폰은 바로 촬영 · 붙여넣기(Ctrl+V)도 됩니다</small></span></label>
<div class="pstage" id="pstage" hidden><canvas id="pcv" role="img" aria-label="첨부한 이미지"></canvas><canvas id="ploupe" class="ploupe" width="150" height="150" aria-hidden="true" hidden></canvas></div>
<div class="ptools" id="ptools" hidden><button type="button" class="ab" data-prot>이미지 돌리기</button><button type="button" class="ab" data-pundo>점 되돌리기</button><button type="button" class="ab" data-preset>점 모두 지우기</button><button type="button" class="ab" data-pread>다시 읽기</button></div>
<div class="pocr" id="pocr" hidden><div class="pbar" aria-hidden="true"><i id="pbar"></i></div><p class="note" id="pst" role="status"></p>
<p class="pchips-h" id="pchips-h" hidden>이미지에서 찾은 값 — 맞는 것을 누르세요</p><div class="pchips" id="pchips"></div>
<details class="praw"><summary>읽은 글자 전체 보기</summary><pre id="praw"></pre></details></div>
<div class="fw" data-show="receipt">${form(f('ptotal', '합계 금액', { money: true, value: '', unit: '원' }), f('ppeople', '사람 수', { value: 4, step: 1, min: 1, max: 100, unit: '명' }), sel('punit', '1인당 금액 끝자리', [['100', '100원 단위로 올림'], ['1000', '1,000원 단위로 올림'], ['10', '10원 단위로 올림'], ['1', '1원 단위 (올림)']]))}</div>
<div class="fw" data-show="vat">${form(f('pvat', '합계 금액 (부가세 포함)', { money: true, value: '', unit: '원' }))}</div>
<div class="fw" data-show="discount">${form(f('pprice', '원래 가격', { money: true, value: '', unit: '원' }), f('prate', '할인율', { value: '', step: 1, min: 0, max: 100, unit: '%' }))}</div>
<div class="fw" data-show="elec">${form(f('pkwh', '한 달 사용량', { value: '', step: 1, min: 0, max: 5000, unit: 'kWh' }), sel('pseason', '계절', [['other', '기타 계절 (9~6월)'], ['summer', '여름 (7·8월)']]))}</div>
<div class="fw" data-show="fc">${form(bp('pbp', '판매 금액'))}<div class="chks" role="group" aria-label="수수료 할인 혜택"><label class="chk"><input type="checkbox" id="ppc"><span><b>프리미엄 PC방</b><small>30% 할인</small></span></label><label class="chk"><input type="checkbox" id="ptop"><span><b>TOP CLASS</b><small>20% 할인</small></span></label></div></div>
<div class="fw" data-show="text"><label class="f wide"><span class="fl">읽은 글 (고칠 수 있어요)</span><textarea id="ptext" rows="6" data-nosave placeholder="이미지를 첨부하면 읽은 글이 여기에 들어갑니다"></textarea></label></div>
<div class="fw" data-show="dday">${form(f('pdate', '날짜', { type: 'date', value: '' }))}</div>
<div class="fw" data-show="measure">${form(sel('pref', '기준 잡는 방법', [['line', '길이를 아는 물건 (정면 사진)'], ['rect', '크기를 아는 사각형 (비스듬한 사진도 OK)']]))}
<div class="fw" data-show="m-line">${form(f('prl', '기준 물건 실제 길이', { value: 0.9, step: 0.01, min: 0, unit: 'm', help: '문 폭 약 0.9m, A4 긴 변 0.297m — 직접 잰 값이 가장 정확' }))}</div>
<div class="fw" data-show="m-rect">${form(f('prw', '사각형 가로', { value: 0.297, step: 0.001, min: 0, unit: 'm', help: '예: A4 용지 0.297 × 0.21m, 바닥 타일 0.6 × 0.6m' }), f('prh', '사각형 세로', { value: 0.21, step: 0.001, min: 0, unit: 'm' }))}</div></div>`,
    tips: [['숫자는 꼭 한 번 확인하세요', '글자 인식은 흐리거나 기운 이미지에서 틀릴 수 있습니다. 찾은 값을 눌러 바꾸거나 칸에서 바로 고칠 수 있습니다.'], ['일부만 읽히고 싶을 때', '이미지 위를 손가락이나 마우스로 끌어 상자를 그리면 그 부분만 다시 읽습니다. 합계 줄만 감싸면 가장 정확합니다.'],
      ['비스듬한 사진은 사각형 기준으로', '바닥에 A4 용지나 타일처럼 크기를 아는 사각형이 보이면 "크기를 아는 사각형"을 고르세요. 원근을 바로잡아 비스듬히 찍은 사진도 잴 수 있습니다.'], ['이미지는 기기 밖으로 나가지 않아요', '이미지는 브라우저 안에서만 처리되고 서버로 보내지 않으며 저장도 하지 않습니다.']],
    basis: ['글자 인식: 오픈소스 Tesseract.js(한국어·영어)를 브라우저 안에서 실행합니다. 처음 쓸 때 인식 엔진과 한국어 데이터(수 MB)를 jsDelivr에서 내려받고, 이미지는 서버로 보내지 않습니다.', '인식 전에 이미지를 흑백으로 바꾸고 명암을 늘리며, 어두운 바탕(게임·앱 다크 화면)은 색을 뒤집어 읽기 쉽게 만듭니다.', '영수증: 1인당 = 합계 ÷ 사람 수를 고른 단위로 올림, 남는 돈 = 1인당 × 사람 수 − 합계. 부가세: 공급가액 = 합계 ÷ 1.1(원 미만 반올림).', '할인가 = 원래 가격 × (1 − 할인율), 원 미만 반올림. 전기요금·FC 이적시장·글자 수·디데이는 각 계산기와 같은 식입니다.', '길이·면적(기준 길이): 기준선의 화면 길이와 실제 길이의 비율로 환산합니다. 정면 사진에서만 정확합니다.', '길이·면적(기준 사각형): 사각형 네 꼭짓점으로 원근 변환(호모그래피)을 구해 사진 위 점을 실제 평면 좌표로 바꾼 뒤, 면적은 신발끈 공식으로 구합니다. 1평 = 400/121㎡.', '경사·각도: 두 점을 잇는 선과 이미지 가로선 사이의 각도입니다. 카메라를 수평으로 두고 경사면을 정면(옆)에서 찍어야 정확합니다.'],
    sources: [['Tesseract.js (Apache License 2.0)', 'https://github.com/naptha/tesseract.js']],
    faq: [['이미지가 어딘가에 저장되거나 전송되나요?', '아니요. 이미지는 브라우저 안에서만 처리되고 서버로 보내지 않으며, 입력값 저장에도 포함되지 않습니다. 페이지를 닫으면 사라집니다.'],
      ['어떤 계산기를 쓸 수 있나요?', '이미지에서 값을 읽거나 잴 수 있는 계산만 목록에 있습니다. 영수증·부가세·할인가·전기요금·FC 이적시장(숫자 읽기), 글자 수·디데이(글자·날짜 읽기), 길이·면적·경사(이미지 위에서 재기)입니다.'],
      ['숫자를 잘못 읽었어요.', '찾은 값 중 맞는 것을 누르거나 칸에 직접 고쳐 쓰세요. 이미지에서 필요한 부분만 상자로 감싸면 그 부분만 다시 읽어 더 정확합니다.'],
      ['처음 읽을 때 왜 오래 걸리나요?', '처음 한 번 글자 인식 엔진과 한국어 데이터를 내려받기 때문입니다. 그다음부터는 브라우저에 남아 빨라집니다.'],
      ['길이·면적은 얼마나 정확한가요?', '정면 사진이나 사각형 기준을 쓰면 실제와 몇 % 이내로 맞는 편입니다. 점을 찍을 때 확대 창을 보며 모서리에 정확히 놓을수록 오차가 줄어듭니다.']] },
];
module.exports.FC_MAX = FC_MAX;
