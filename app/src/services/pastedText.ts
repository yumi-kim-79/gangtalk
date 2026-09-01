/**
 * 초톡 붙여넣기 원문 → 맞출방/필요인원 파서.
 * web/src/pages/MainPage.vue:1314 `parseNeedFromLastPastedText` 이식.
 *
 * 현황판 숫자의 1차 소스는 rooms_biz.needRooms/needPeople 지만,
 * ChatBiz 자동 갱신 업소는 그 필드 대신 붙여넣기 원문
 * (lastPastedText / manualText / bannerText) 만 남긴다.
 * 앱이 이 원문을 파싱하지 않으면 웹에는 숫자가 뜨고 앱에는 0 이 뜬다.
 */

export type NeedCounts = { rooms: number; people: number };

/** 이름 정규화 — 웹 _normName (레.이.블 → 레이블) */
export function normName(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[.\s]/g, '')
    .replace(/[​-‍﻿]/g, '');
}

/** 혼잡도 점수 → 라벨. 웹 cgFromScore (MainPage.vue:1487) */
export function congestionFromScore(n: unknown): string | null {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return v >= 2 ? '여유' : v >= 1 ? '보통' : '혼잡';
}

const NAME_CLASS = '[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z]{1,10}';

/** "이름 12 이름" 형태에서 가운데 숫자 */
function validPair(line: string): number | null {
  const m = line.match(new RegExp(`(${NAME_CLASS})\\s+(\\d{1,3})\\s+(${NAME_CLASS})`));
  return m ? Number(m[2]) : null;
}

/** "ㅃ 3" 형태 합계 */
function bNumsIn(line: string): number {
  let sum = 0;
  line.replace(/ㅃ\s*(\d{1,2})/g, (_m, n: string) => {
    sum += Number(n);
    return '';
  });
  return sum;
}

function looksLikeRoomLine(line: string): boolean {
  if (/^\s*\d{2,3}\b/.test(line)) return true;
  if (/ㅃ\s*\d{1,2}/.test(line)) return true;
  if (validPair(line) != null) return true;
  return false;
}

export function parseNeedFromPastedText(txt: string): NeedCounts {
  let rawAll = String(txt ?? '')
    .replace(/\r/g, '')
    .trim();
  if (!rawAll) return { rooms: 0, people: 0 };

  // 한 줄로 붙어 들어온 "—— 1층 ——" 류 앞뒤에 줄바꿈을 넣는다
  rawAll = rawAll
    .replace(/[-—=]{2,}\s*(\d+)\s*층\s*[-—=]{2,}/g, '\n$1층\n')
    .replace(/(\d+)\s*층(?!\S)/g, '\n$1층\n')
    .replace(/\s{2,}/g, ' ')
    .replace(/(\d+\s*층)\s+/g, '$1\n');

  const floorRe = /^(?:\s*[-—=]{2,}\s*)?(\d+)층(?:\s*[-—=]{2,}\s*)?$/;
  const lines = rawAll.split('\n');
  const floors: number[] = [];
  lines.forEach((l, i) => {
    if (floorRe.test(l)) floors.push(i);
  });
  if (!floors.length) return { rooms: 0, people: 0 };

  let rooms = 0;
  let people = 0;

  for (let f = 0; f < floors.length; f++) {
    const start = floors[f] + 1;
    const end = f + 1 < floors.length ? floors[f + 1] : lines.length;
    for (let i = start; i < end; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (/^[-—=]{2,}$/.test(line)) continue;
      // 마감/금지 표기 줄은 집계에서 제외 (웹과 동일)
      if (/[✅🚫]|가빵|날개|금지|ㅁ\.ㄴ|ㅈ\.ㅁ/.test(line)) continue;

      let addedPeople = 0;
      const b = bNumsIn(line);
      if (b) addedPeople += b;
      if (b === 0) {
        const p = validPair(line);
        if (p != null) addedPeople += p;
      }

      if (looksLikeRoomLine(line)) rooms += 1;
      people += addedPeople;
    }
  }

  return { rooms: Math.max(0, rooms), people: Math.max(0, people) };
}
