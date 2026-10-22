import json, os
os.chdir(os.path.join(os.path.dirname(__file__), '..', '..'))
def S(t, f, p, pr=None, c='ink', fx=None):
    d = {'char': 'monkey', 'text': t, 'face': f, 'pose': p, 'color': c}
    if pr: d['prop'] = pr
    if fx: d['fx'] = fx
    return d
sets = {
 'pami-daily': ('Gaegu', 0, [S('안녕하세요','smile','wave',None,'leaf'),S('반가워요','happy','cheer','sparkle','berry'),S('이웃추가\n환영해요','smile','hold','heart','leaf'),S('공감 꾹!','wink','point','heart','berry'),
  S('포스팅 중','smile','hold','laptop','sky'),S('오늘의 기록','smile','hold','note','acorn'),S('꿀팁 대방출','wow','wave','star','acorn','sparkle'),S('정리 끝!','smug','hold','note','leaf'),
  S('출근 완료','smile','run','bag','sky'),S('퇴근!','happy','cheer','sparkle','leaf'),S('커피 수혈','sleepy','hold','cup','acorn'),S('바빠요','sad','run','sweat','berry'),
  S('쉬는 중','sleepy','sit','zzz','leaf'),S('도토리\n모으는 중','happy','hold','acorn','acorn'),S('오늘도\n화이팅','wink','cheer','sparkle','acorn'),S('잘 자요','sleepy','hug','zzz','sky'),
  S('굿모닝','happy','wave','sparkle','acorn'),S('점심 뭐 먹지','smile','think','question','acorn'),S('주말이다!','happy','cheer','hearts','berry'),S('월요병','cry','sit','sweat','sky'),
  S('비밀 댓글','shy','hold','phone','sky'),S('또 만나요','smile','wave','hearts','leaf'),S('감사합니다','happy','bow','heart','berry'),S('읽어주셔서\n감사해요','shy','bow','heart','berry')]),
 'pami-food': ('Jua', 1, [S('맛집 발견','wow','point','magnifier','berry'),S('존맛!','yum','hold','bowl','berry'),S('냠냠','yum','hold','spoon','acorn'),S('웨이팅 중','sad','sit','sweat','sky'),
  S('메뉴 고민','smile','think','question','acorn'),S('가격 정보','smile','hold','note','leaf'),S('위치 정보','smile','point','magnifier','sky'),S('주차 가능','happy','wave','sparkle','leaf'),
  S('사진 맛집','wink','hold','camera','sky'),S('분위기\n맛집','love','hug',None,'berry','hearts'),S('커피 한 잔','happy','hold','cup','acorn'),S('디저트는\n다른 배','yum','hold','cake','berry'),
  S('배불러요','smug','sit',None,'acorn','sweat'),S('가성비 갑','smug','hold','bag','acorn'),S('양이 많아요','wow','hold','bowl','acorn'),S('재방문\n의사 100%','happy','cheer','sparkle','leaf'),
  S('강력 추천','wink','point','star','berry'),S('별점 5점','love','wave','star','acorn'),S('아쉬운 점','sad','think','sweat','sky'),S('혼밥 성공','smug','hold','bowl','sky'),
  S('카페 투어','happy','run','cup','acorn'),S('포장 완료','happy','run','bag','sky'),S('내돈내산','smug','hold','acorn','berry'),S('또 올게요','smile','wave','hearts','leaf')]),
 'pami-product': ('Do Hyeon', 2, [S('언박싱','wow','hold','box','acorn'),S('택배 왔다!','happy','cheer','box','berry'),S('선물 받았어요','love','hold','gift','berry'),S('장바구니\n담기','smile','hold','cart','sky'),
  S('사용 전','smile','point',None,'sky'),S('사용 후','wow','point','sparkle','leaf'),S('한 달 사용기','smile','hold','note','acorn'),S('첫인상','wow','think','exclaim','berry'),
  S('장점','happy','up','sparkle','leaf'),S('단점','sad','think','sweat','sky'),S('가격 정보','smile','hold','note','acorn'),S('스펙 정리','smug','hold','laptop','sky'),
  S('재구매 의사','love','hug','heart','berry'),S('강력 추천','wink','hold','star','leaf'),S('가성비 최고','smug','hold','star','acorn'),S('품절 주의','wow','run','exclaim','berry'),
  S('할인 중','happy','point','bag','berry'),S('찐 후기','smug','hold','phone','leaf'),S('비교해 봤어요','smile','think','magnifier','sky'),S('총평','smile','hold','note','acorn'),
  S('내돈내산','smug','hold','acorn','berry'),S('협찬 제품','shy','hold','gift','sky'),S('만족해요','happy','hug','hearts','leaf'),S('추천해요','wink','wave','star','acorn')]),
 'pami-react': ('Gamja Flower', 0, [S('최고!','love','cheer','star','acorn'),S('좋아요','happy','hug','heart','berry'),S('대박','wow','up','exclaim','berry'),S('헐','wow','sit','sweat','sky'),
  S('감동','cry','hug',None,'sky','hearts'),S('부럽다','shy','think','sparkle','acorn'),S('축하해요','happy','cheer','sparkle','berry'),S('힘내요','wink','up','heart','leaf'),
  S('고마워요','shy','bow','heart','berry'),S('미안해요','sad','bow','sweat','sky'),S('괜찮아요','smile','wave',None,'leaf'),S('화났어요','angry','sit',None,'berry'),
  S('궁금해요','smile','think','question','sky'),S('알겠어요','happy','point',None,'leaf'),S('그렇군요','smile','think',None,'acorn'),S('웃겨요','happy','sit','sparkle','acorn'),
  S('슬퍼요','cry','sit',None,'sky'),S('졸려요','sleepy','hug','zzz','sky'),S('배고파요','sad','hold','bowl','acorn'),S('신나요','happy','run','sparkle','berry'),
  S('사랑해요','love','hug','heart','berry'),S('오케이','wink','hold','star','leaf'),S('기다릴게요','smile','sit','heart','acorn'),S('응원해요','happy','cheer','star','leaf')]),
}
for k, (font, main, st) in sets.items():
    assert len(st) == 24, (k, len(st))
    os.makedirs(f'products/ogq/{k}', exist_ok=True)
    json.dump({'outDir': f'products/ogq/{k}/png', 'font': font, 'main': main, 'tab': main, 'stickers': st}, open(f'products/ogq/{k}/spec.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok')
