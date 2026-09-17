# 스토어 등록 애셋 (Play Console / App Store)

## 폴더
- `gangtalk-feature-1024x500.png` — Play Console **그래픽 이미지** (1,024 × 500). 그대로 업로드.
- `raw/` — 폰/에뮬레이터에서 찍은 **원본 스크린샷**을 여기에 넣어 두세요.
- `phone/` — 위 원본을 Play 규격(1080 × 1920)으로 맞춘 결과물. 업로드는 이 폴더 것으로.

## 스크린샷 규격 (Play Console)
- 2~8장, PNG 또는 JPEG, 장당 15MB 이하
- 가로세로 비율 16:9 ~ 9:16, 각 변 320px ~ 3,840px
- **주의**: 요즘 폰 화면은 대부분 1080 × 2340 (19.5:9)이라 **9:16보다 길어서 반려**됩니다.
  → 그래서 1080 × 1920으로 위아래를 잘라내거나 여백을 채워야 합니다. (`phone/`가 그 결과)

## 찍을 화면 (순서대로 5장 권장)
1. 현황판 — 업체 카드에 전체방/맞출방/필요인원/혼잡도가 보이는 상태
2. 가게찾기 — 배너 + 카테고리 칩 + 업체 목록
3. 초톡 — 대화 화면
4. 제휴관 — 제휴 업체 목록
5. 강톡 게시판 — 글 목록

**개인정보가 화면에 없어야 합니다.** 실제 전화번호·이름·카톡ID가 보이면 심사에서 문제가 됩니다.

## 캡처 방법
### 실제 안드로이드 기기 (USB 연결)
```
adb exec-out screencap -p > ~/GangTalk/store/raw/01-현황판.png
```
### 에뮬레이터
에뮬레이터 사이드바의 카메라 아이콘 → 저장된 파일을 `raw/`로 옮기기

### iOS 시뮬레이터 (App Store용, 나중에)
```
xcrun simctl io booted screenshot ~/GangTalk/store/raw/ios-01.png
```

## 규격 맞추기
`raw/`에 원본을 채운 뒤 알려 주시면 1080 × 1920으로 변환해서 `phone/`에 넣어 드립니다.

---

## 스크린샷 변환 — `make-store-shots.py`

```bash
cd ~/GangTalk/store
python3 make-store-shots.py            # 전체 규격
python3 make-store-shots.py play       # Play 만
python3 make-store-shots.py ios65      # App Store 6.5형만
```

| 규격 | 크기 | 원본 폴더 | 쓰는 곳 |
|---|---|---|---|
| `play` | 1080 × 1920 | `raw/android/` | Play Console 휴대전화 스크린샷 |
| `ios65` | 1242 × 2688 | `raw/ios/` | App Store 6.5형 |
| `ios67` | 1284 × 2778 | `raw/ios/` | App Store 6.7형 |

**원본을 플랫폼별로 나눠 둔다.** App Store 에 안드로이드 화면을 올리면 반려되므로
`raw/android/` 는 `play` 로만, `raw/ios/` 는 `ios65`/`ios67` 로만 변환된다.

- 원본은 **건드리지 않는다.** 화면이 바뀌면 해당 폴더만 갈아끼우고 다시 실행하면 된다.
- 결과는 `out/<규격>/01.png …` (git 에는 안 올라간다)
- 잘라내지 않고 **여백을 채워** 맞춘다. 여백 색은 원본 첫 줄에서 뽑아서 이음매가 안 보인다.
- 안드로이드 하단 내비바는 기본 130px 잘라낸다. iOS 는 0px. 바꾸려면 `--trim-bottom N`
- Pillow 없으면: `python3 -m pip install --user pillow`

### 시뮬레이터로 찍을 때
핫이슈 공지 문구에 이모지가 들어 있으면 `?` 로 깨진다(시뮬레이터 이모지 폰트 문제).
관리자 페이지에서 그 공지의 이모지만 잠깐 빼고 찍을 것. 실기기에서는 정상이다.
