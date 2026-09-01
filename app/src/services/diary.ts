/**
 * 일정/달력 — 웹 `pages/DiaryPage.vue` 이식.
 *
 * 웹은 localStorage 두 덩어리로 저장한다:
 *   diary_events_v1::{host}::{accountKey}   { 'YYYY-MM-DD': EventItem[] }
 *   diary_money_v1::{host}::{accountKey}    { 'YYYY-MM-DD': { i, e } }
 *
 * 앱은 AsyncStorage 에 **같은 구조**로 저장하고 계정키만 uid(비로그인은 guest)로
 * 단순화했다. 웹도 기기 로컬 저장이라 원래부터 웹↔앱 동기화는 없었다.
 * (동기화하려면 Firestore 로 옮겨야 하는데 그건 이식이 아니라 설계 변경이다)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DiaryEvent {
  id: string;
  /** 'YYYY-MM-DD' */
  date: string;
  title: string;
  memo: string;
}

/** i = 수입, e = 지출 (원) — 웹 필드명 그대로 */
export interface DayMoney {
  i: number;
  e: number;
}

export type EventMap = Record<string, DiaryEvent[]>;
export type MoneyMap = Record<string, DayMoney>;

const EVENTS_BASE = 'diary_events_v1';
const MONEY_BASE = 'diary_money_v1';

const accountKey = (uid: string | null) => uid || 'guest';
export const eventsKey = (uid: string | null) => `${EVENTS_BASE}::${accountKey(uid)}`;
export const moneyKey = (uid: string | null) => `${MONEY_BASE}::${accountKey(uid)}`;

/* ───────────────────────── 날짜 유틸 ───────────────────────── */

const pad = (n: number) => String(n).padStart(2, '0');

/** month 는 1-based */
export const dateKey = (y: number, month: number, d: number) =>
  `${y}-${pad(month)}-${pad(d)}`;

export const dateKeyOf = (dt: Date) =>
  dateKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 웹 KR_HOLIDAYS — 하드코딩 목록 그대로 */
export const HOLIDAYS: Record<string, string> = {
  '2025-10-03': '개천절',
  '2025-10-06': '추석',
  '2025-10-08': '대체공휴일',
  '2025-10-09': '한글날',
};

export const formatKRW = (n: number) => (Number(n) || 0).toLocaleString('ko-KR');
export const digitsOnly = (s: string) => String(s ?? '').replace(/[^0-9]/g, '');
export const withComma = (s: string) =>
  digitsOnly(s).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/**
 * 월 격자 — 웹과 동일하게 앞뒤를 빈 칸으로 채워 주 단위를 맞춘다.
 * null = 빈 칸.
 */
export function monthCells(year: number, month0: number): (number | null)[] {
  const firstDay = new Date(year, month0, 1).getDay();
  const days = new Date(year, month0 + 1, 0).getDate();
  const total = firstDay + days;
  const tail = (7 - (total % 7)) % 7;

  return [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
    ...Array<null>(tail).fill(null),
  ];
}

/* ───────────────────────── 저장/로드 ───────────────────────── */

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function loadEvents(uid: string | null): Promise<EventMap> {
  const raw = await readJson<Record<string, unknown>>(eventsKey(uid), {});
  const out: EventMap = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!Array.isArray(v)) continue;
    const rows = (v as DiaryEvent[])
      .filter(x => x && typeof x === 'object')
      .map(x => ({
        id: String(x.id ?? ''),
        date: String(x.date ?? k),
        title: String(x.title ?? ''),
        memo: String(x.memo ?? ''),
      }));
    // 웹과 동일하게 제목순 정렬
    rows.sort((a, b) => a.title.localeCompare(b.title));
    if (rows.length) out[k] = rows;
  }
  return out;
}

export async function loadMoney(uid: string | null): Promise<MoneyMap> {
  const raw = await readJson<Record<string, Partial<DayMoney>>>(moneyKey(uid), {});
  const out: MoneyMap = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = { i: Number(v?.i) || 0, e: Number(v?.e) || 0 };
  }
  return out;
}

export const saveEvents = (uid: string | null, map: EventMap) =>
  AsyncStorage.setItem(eventsKey(uid), JSON.stringify(map));

export const saveMoney = (uid: string | null, map: MoneyMap) =>
  AsyncStorage.setItem(moneyKey(uid), JSON.stringify(map));

export const newEventId = () => `e_${Math.random().toString(36).slice(2, 10)}`;

/* ───────────────────────── 세금 추정 ───────────────────────── */

export interface IncomeType {
  key: 'freelancer' | 'employee';
  label: string;
}

/** 웹 select 의 두 항목 그대로 */
export const INCOME_TYPES: IncomeType[] = [
  { key: 'freelancer', label: '프리랜서/사업(3.3% 원천징수)' },
  { key: 'employee', label: '근로소득(갑근세: 간이세액표)' },
];

/** 종합소득세 누진세율표 — 웹 PIT_BRACKETS 와 동일 */
const PIT_BRACKETS = [
  { upTo: 14_000_000, rate: 0.06, quick: 0 },
  { upTo: 50_000_000, rate: 0.15, quick: 1_080_000 },
  { upTo: 88_000_000, rate: 0.24, quick: 5_220_000 },
  { upTo: 150_000_000, rate: 0.35, quick: 14_900_000 },
  { upTo: 300_000_000, rate: 0.38, quick: 19_400_000 },
  { upTo: 500_000_000, rate: 0.4, quick: 25_400_000 },
  { upTo: 1_000_000_000, rate: 0.42, quick: 35_400_000 },
  { upTo: Infinity, rate: 0.45, quick: 65_400_000 },
];

function incomeTaxOf(base: number): number {
  if (base <= 0) return 0;
  const b = PIT_BRACKETS.find(x => base <= x.upTo) ?? PIT_BRACKETS[PIT_BRACKETS.length - 1];
  return Math.max(Math.round(base * b.rate - b.quick), 0);
}

export interface TaxResult {
  income: number;
  expense: number;
  taxBase: number;
  incomeTax: number;
  localTax: number;
  totalDue: number;
  withholding: { total: number; itx: number; ltx: number; label: string };
  finalPayable: number;
}

/**
 * 웹 calcTax() 이식 — 계산식을 **그대로** 옮겼다.
 * 주의: 원천징수는 과세표준이 아니라 **총수입**에 곱하고,
 * 누진세율표는 연 기준인데 입력은 월 기준이다. 웹도 동일하게 간이 계산이다.
 */
export function calcTax(
  income: number,
  expense: number,
  incomeType: IncomeType['key'],
): TaxResult {
  const taxBase = Math.max(income - expense, 0);
  const incomeTax = incomeTaxOf(taxBase);
  const localTax = Math.round(incomeTax * 0.1);
  const totalDue = incomeTax + localTax;

  const withholding =
    incomeType === 'freelancer'
      ? {
          itx: Math.round(income * 0.03),
          ltx: Math.round(income * 0.003),
          total: Math.round(income * 0.03) + Math.round(income * 0.003),
          label: '프리랜서 3.3%',
        }
      : { itx: 0, ltx: 0, total: 0, label: '근로(간이세액표 별도)' };

  return {
    income,
    expense,
    taxBase,
    incomeTax,
    localTax,
    totalDue,
    withholding,
    finalPayable: totalDue - withholding.total,
  };
}

/** 해당 월 합계 — 웹과 같이 키 접두사 매칭 */
export function monthTotals(money: MoneyMap, year: number, month0: number) {
  const prefix = `${year}-${pad(month0 + 1)}-`;
  let income = 0;
  let expense = 0;
  for (const [k, v] of Object.entries(money)) {
    if (!k.startsWith(prefix)) continue;
    income += Number(v?.i) || 0;
    expense += Number(v?.e) || 0;
  }
  return { income, expense };
}
