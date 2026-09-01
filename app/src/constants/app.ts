/** 앱 전역 상수 */
export const APP_NAME = '강톡';

/** Firestore 컬렉션 이름 — 문자열 직접 사용 금지 */
export const COLLECTIONS = {
  users: 'users',
  stores: 'stores',
  boardPosts: 'board_posts',
  chatRooms: 'chat_rooms',
  messages: 'messages',
  roomsBiz: 'rooms_biz',
  roomsOpen: 'rooms_open',
  partners: 'partners',
  partnerRequests: 'partnerRequests',
  favorites: 'favorites',
  comments: 'comments',
  replies: 'replies',
  news: 'news',
  config: 'config',
  connectRequests: 'connectRequests',
  extendRequests: 'extendRequests',
  legalConsults: 'legal_consults',
  /** 신고 접수 (Apple 심사지침 1.2) */
  reports: 'reports',
  /** 사용자 차단 — 문서 id = `${ownerUid}__${blockedUid}` */
  blocks: 'blocks',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
