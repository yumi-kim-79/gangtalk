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
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
