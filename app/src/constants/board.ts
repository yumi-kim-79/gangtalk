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

/**
 * 주제별 커뮤니티 — 웹 GangTalkPage 의 4박스.
 * 게시판이 따로 있는 게 아니라 **같은 board_posts 를 카테고리로 나눈 묶음**이다.
 * (웹 yaCats / healCats 와 동일한 분류)
 */
export interface BoardGroup {
  key: string;
  title: string;
  desc: string;
  categories: BoardCategory[];
}

export const BOARD_GROUPS: BoardGroup[] = [
  {
    key: 'gangtalk',
    title: '강톡',
    desc: '100% 비공개 게시판',
    categories: ['daily', 'suggest', 'pledge', 'vote', 'quiz', 'event'],
  },
  {
    key: 'healing',
    title: '힐링톡',
    desc: '명언·건강·여행·다이어트',
    categories: ['quote', 'health', 'travel'],
  },
  {
    key: 'store',
    // 웹 yaCats 의 suggest 설명이 "우리가게 업주에게 바란다" 라 그대로 묶는다.
    // 전용 카테고리가 생기면 여기만 바꾸면 된다.
    title: '우리 가게 게시판',
    desc: '공지·소식·가게 이야기',
    categories: ['suggest'],
  },
  {
    key: 'event',
    title: '이벤트톡',
    desc: '이벤트·혜택·참여',
    categories: ['event', 'quiz'],
  },
];

export const DEFAULT_BOARD_GROUP = 'gangtalk';

/** 묶음 안에서 쓸 카테고리 칩 (전체 + 해당 카테고리들) */
export function tabsForGroup(group: BoardGroup): BoardTab[] {
  return [
    { key: 'all', label: '전체' },
    ...group.categories.map(k => ({ key: k, label: BOARD_CATEGORY_LABEL[k] ?? k })),
  ];
}

/** 웹 POSTS_PER_PAGE 와 동일 */
export const POSTS_PER_PAGE = 20;
