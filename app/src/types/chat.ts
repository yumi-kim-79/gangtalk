/** rooms / rooms/{id}/messages 도메인 타입 */

export interface ChatRoom {
  id: string;
  title: string;
  subtitle: string;
  /** 마지막 활동 시각(ms) — 목록 정렬용 */
  updatedAt: number;
  lastMessage: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  author: string;
  authorUid: string;
  createdAt: number;
  /** 내가 보낸 메시지인지 (렌더링 시 좌우 정렬) */
  mine: boolean;
}
