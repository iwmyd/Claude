import json, os
os.chdir(os.path.join(os.path.dirname(__file__), '..', '..'))
F = ['Nanum Pen Script', 'Yeon Sung', 'Hi Melody', 'Poor Story', 'Gaegu', 'Gamja Flower']
INK = ['brown', 'green', 'berry', 'navy', 'teal', 'plum']
DECO = ['underline', 'highlight', 'wave', 'circle', 'box', 'highlight']
D2 = ['sparkle', 'heart', 'leaf', 'star', 'none', 'heart']
HLc = ['yellow', 'mint', 'pink', 'peach', 'sky', 'yellow']
words = ['오늘의 맛집', '여기 진짜\n맛있어요', '분위기 최고', '또 가고 싶은 곳', '오늘의 기록', '소소한 행복', '날씨 맑음', '커피 한 잔의\n여유',
         '기분 좋은 하루', '힐링 타임', '추천 메뉴', '인생 맛집', '이건 꼭\n드세요', '사진 맛집', '웨이팅 필수', '재방문 각',
         '솔직 후기', '가격 대비 굿', '주차 꿀팁', '위치는 여기', '영업시간\n확인하세요', '오늘도\n수고했어', '내일도 화이팅', '또 만나요']
A = [{'text': w, 'font': F[i % 6], 'ink': INK[(i * 5) % 6], 'deco': DECO[i % 6], 'deco2': D2[(i + 2) % 6], 'hl': HLc[(i * 2) % 6]} for i, w in enumerate(words)]
# 공정위 문구 (표시광고법 대가성 표기) — 8문구 × 3스타일(형광펜·점선·상자)
P = ['이 포스팅은 업체로부터\n원고료를 받아\n작성되었습니다', '이 포스팅은 업체로부터\n제품을 무상으로 제공받아\n작성되었습니다', '이 포스팅은 체험단으로\n참여해 서비스를 제공받아\n작성되었습니다',
     '이 포스팅은 쿠팡 파트너스\n활동의 일환으로, 이에 따른\n일정액의 수수료를\n제공받습니다', '이 포스팅은 제휴 링크를\n포함하며, 구매 시 소정의\n수수료를 받을 수 있습니다', '이 포스팅은 할인을\n제공받아 작성되었습니다',
     '제 돈으로 직접 구매하여\n솔직하게 작성한\n후기입니다', '이 포스팅은 어떠한\n대가도 받지 않고\n작성되었습니다']
B = []
for style, ink, hl in [('highlight', 'gray', 'yellow'), ('dots', 'teal', 'mint'), ('box', 'berry', 'pink')]:
    for t in P: B.append({'text': t, 'font': 'Gowun Dodum', 'ink': ink, 'deco': style, 'hl': hl, **({'card': True} if style != 'box' else {})})
for k, st, main in [('hand-lettering', A, 0), ('fair-highlight', B, 0)]:
    assert len(st) == 24
    os.makedirs(f'products/ogq/{k}', exist_ok=True)
    json.dump({'outDir': f'products/ogq/{k}/png', 'main': main, 'tab': main, 'stickers': st}, open(f'products/ogq/{k}/spec.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok')
