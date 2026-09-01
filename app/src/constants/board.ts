import type { BoardCategory } from '@/types/post';

export interface BoardTab {
  key: BoardCategory | 'all';
  label: string;
}

/** 웹 composeCats / yaCats 이식 — '공지'는 관리자 전용이라 앱에서 제외 */
export const BOARD_TABS: BoardTab[] = [
  { key: 'all', label: '전체' },
  { key: 'daily', label: '뉴스게시판' },
  { key: 'suggest', label: '건의' },
  { key: 'pledge', label: '다짐' },
  { key: 'vote', label: '투표' },
  { key: 'quiz', label: '퀴즈' },
  { key: 'event', label: '이벤트' },
  { key: 'travel', label: '여행.맛집' },
  { key: 'health', label: '건강.다이어트' },
  { key: 'quote', label: '명언.동기부여' },
];

export const BOARD_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  BOARD_TABS.map(t => [t.key, t.label]),
);

/** 웹 POSTS_PER_PAGE 와 동일 */
export const POSTS_PER_PAGE = 20;
