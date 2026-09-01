/** board_posts / comments 도메인 타입 */

export type BoardCategory =
  | 'daily'
  | 'suggest'
  | 'pledge'
  | 'vote'
  | 'quiz'
  | 'event'
  | 'travel'
  | 'health'
  | 'quote'
  | 'hot';

export interface Post {
  id: string;
  category: BoardCategory;
  title: string;
  subtitle: string;
  body: string;
  author: string;
  authorUid: string;
  views: number;
  likes: number;
  cmtCount: number;
  /** 투표 게시글 전용 */
  optA: string;
  optB: string;
  votesA: number;
  votesB: number;
  isNotice: boolean;
  images: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Comment {
  id: string;
  body: string;
  author: string;
  authorUid: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}
