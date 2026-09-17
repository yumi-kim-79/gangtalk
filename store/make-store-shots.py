#!/usr/bin/env python3
"""
스토어 스크린샷 규격 변환기.

  raw/ 에 원본을 넣고 실행하면 out/<규격>/ 에 변환본이 생긴다.
  원본은 건드리지 않으므로 나중에 화면이 바뀌면 raw/ 만 갈아끼우고 다시 돌리면 된다.

사용법
  python3 make-store-shots.py                 # 전체 규격 생성
  python3 make-store-shots.py play            # Play 만
  python3 make-store-shots.py ios65 ios67     # App Store 만
  python3 make-store-shots.py play --trim-bottom 0   # 안드로이드 내비바 유지

규격
  play    1080 x 1920   Play Console 휴대전화 스크린샷 (9:16)
  ios65   1242 x 2688   App Store 6.5형
  ios67   1284 x 2778   App Store 6.7형

방식
  잘라내지 않고 **여백을 채워서(contain)** 맞춘다. 화면이 잘리면 안 되기 때문이다.
  여백 색은 원본 첫 줄에서 가장 흔한 색을 쓴다 — 보통 앱 배경색이라 이음매가 안 보인다.

⚠️ App Store 에 안드로이드 스크린샷을 올리면 안 된다.
   하단 내비바(|||, ○, <)나 안드로이드 상태바가 보이면 심사에서 반려된다.
   ios65/ios67 은 아이폰으로 찍은 원본에만 쓸 것.

Pillow 가 없으면:  python3 -m pip install --user pillow
"""
import sys, os, glob
from collections import Counter

try:
    from PIL import Image
except ImportError:
    sys.exit('Pillow 가 필요합니다:  python3 -m pip install --user pillow')

HERE = os.path.dirname(os.path.abspath(__file__))
RAW  = os.path.join(HERE, 'raw')
OUT  = os.path.join(HERE, 'out')

# 규격 → (가로, 세로, 원본 폴더, 하단 잘라낼 px[1080폭 기준])
PRESETS = {
    'play':  (1080, 1920, 'android', 130),   # 안드로이드 내비바 제거
    'ios65': (1242, 2688, 'ios',       0),   # iOS 는 홈 인디케이터뿐이라 그대로 둔다
    'ios67': (1284, 2778, 'ios',       0),
}

def pad_color(im):
    """첫 줄에서 가장 흔한 색 — 보통 상태바/배경색"""
    row = [im.getpixel((x, 0)) for x in range(0, im.width, max(1, im.width // 64))]
    return Counter(row).most_common(1)[0][0]


def convert(src, size, trim_bottom):
    im = Image.open(src).convert('RGB')
    if trim_bottom > 0:
        cut = round(trim_bottom * im.width / 1080)
        if cut < im.height:
            im = im.crop((0, 0, im.width, im.height - cut))

    tw, th = size
    scale = min(tw / im.width, th / im.height)
    nw, nh = max(1, round(im.width * scale)), max(1, round(im.height * scale))
    resized = im.resize((nw, nh), Image.LANCZOS)

    canvas = Image.new('RGB', (tw, th), pad_color(im))
    canvas.paste(resized, ((tw - nw) // 2, (th - nh) // 2))
    return canvas


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    trim = None   # None 이면 규격별 기본값을 쓴다
    if '--trim-bottom' in sys.argv:
        trim = int(sys.argv[sys.argv.index('--trim-bottom') + 1])

    names = args or list(PRESETS)
    bad = [n for n in names if n not in PRESETS]
    if bad:
        sys.exit(f'모르는 규격: {", ".join(bad)}  (가능: {", ".join(PRESETS)})')

    done = False
    for name in names:
        tw, th, folder, default_trim = PRESETS[name]
        src_dir = os.path.join(RAW, folder)
        srcs = sorted(
            f for f in glob.glob(os.path.join(src_dir, '*'))
            if f.lower().endswith(('.png', '.jpg', '.jpeg'))
        )
        if not srcs:
            print(f'  {name:<6} 건너뜀 — raw/{folder}/ 가 비어 있습니다.\n')
            continue

        t = default_trim if trim is None else trim
        d = os.path.join(OUT, name)
        os.makedirs(d, exist_ok=True)
        print(f'  {name}  ({tw}x{th})  ← raw/{folder}/ {len(srcs)}장 · 하단 {t}px 잘라냄')
        for i, src in enumerate(srcs, 1):
            out = os.path.join(d, f'{i:02d}.png')
            convert(src, (tw, th), t).save(out, 'PNG', optimize=True)
            print(f'     out/{name}/{i:02d}.png   ({os.path.basename(src)})')
        print()
        done = True

    if not done:
        sys.exit('변환할 원본이 없습니다. raw/android/ 또는 raw/ios/ 에 넣어 주세요.')
    print('원본은 raw/ 에 그대로 있습니다. 화면이 바뀌면 raw/ 만 교체하고 다시 실행하세요.')


if __name__ == '__main__':
    main()
