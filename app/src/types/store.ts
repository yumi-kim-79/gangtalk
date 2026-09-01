/** stores / rooms_biz 컬렉션 도메인 타입 (Firestore 실제 필드 기준) */

export interface StoreManager {
  name?: string;
  phone?: string;
  [k: string]: unknown;
}

/** stores 문서 원본 */
export interface StoreDoc {
  id: string;
  name?: string;
  category?: string;
  region?: string;
  desc?: string;
  description?: string;
  longDesc?: string;
  adTitle?: string;
  thumb?: string;
  cover?: string;
  coverImg?: string;
  images?: string[];
  photos?: string[];
  img?: string;
  banner?: string;
  logo?: string;
  hours?: string;
  phone?: string;
  address?: string;

  /** 급여 — 필드가 여러 세대에 걸쳐 있어 wageOf() 로 통합 조회 */
  wage?: number | string;
  hourly?: number | string;
  payPerHour?: number | string;
  hourPay?: number | string;
  hourlyPay?: number | string;
  hourlyWage?: number | string;
  pay?: number | string;
  payNote?: string;
  tc?: number | string;

  rooms?: number | string;
  roomCount?: number | string;
  roomInfo?: number | string;

  likes?: number;
  wishCount?: number;
  rating?: number;

  managers?: StoreManager[];
  manager?: string;
  ownerId?: string;
  ownerEmail?: string;

  tags?: string[];
  services?: string[];
  events?: string[];
  eventMain?: string;

  kakao?: string;
  kakaoOpenChat?: string;
  openChatUrl?: string;
  talkId?: string;
  safePhone?: string;
  phoneSafe?: string;
  safe?: boolean;

  /** 관리자 현황판 입력 — stores 문서에 직접 저장되는 값 */
  match?: number;
  persons?: number;
  needRooms?: number;
  needPeople?: number;
  totalRooms?: number;
  maxPersons?: number;
  capacity?: number;
  max?: number;
  /** 'auto' | 'manual' — manual 이면 status 를 그대로 쓴다 */
  statusMode?: string;
  status?: string;

  /** 광고 노출 기간 (ms) — 관리자 15/30/60/90일 버튼 */
  adStart?: number;
  adEnd?: number;

  approved?: boolean;
  applyStatus?: string;
  /** 관리자 강제 숨김 */
  hidden?: boolean;
  /** 신규 구조: 신청 상태 없이 active 만 쓰는 업체 */
  active?: boolean;
  exposure?: Record<string, boolean>;

  roomBizId?: string;
  rooms_biz?: string;
  storeKey?: string;

  updatedAt?: unknown;
}

/** rooms_biz 병합 결과가 더해진 화면용 모델 */
export interface Store extends StoreDoc {
  totalNeeded?: number;
  totalRemaining?: number;
  roomsBizId?: string | null;
  /** rooms_biz 가 직접 지정한 혼잡도 (있으면 자동계산보다 우선) */
  congestion?: string;
}

export interface RoomsBizDoc {
  id: string;
  roomBizId?: string;
  storeId?: string;

  /** 관리자/업체 수동 저장 — StoresManagePage.saveAllMetrics 가 쓰는 필드 */
  needRooms?: number;
  needPeople?: number;
  manualSaved?: boolean;
  congestion?: string;

  /** 가게찾기(StoreFinder) 계열 필드 */
  totalRooms?: number;
  total?: number;
  totalCurrent?: number;
  totalNeeded?: number;
  totalRemaining?: number;
}
