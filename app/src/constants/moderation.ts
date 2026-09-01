/**
 * 신고·차단 (Apple App Store 심사지침 1.2 — 사용자 생성 콘텐츠).
 *
 * 필수 4요소:
 *   1) 불쾌한 콘텐츠를 걸러내는 방법        → 신고
 *   2) 악용 사용자를 차단하는 수단          → 차단
 *   3) 연락 가능한 문의처                  → 마이 > 문의하기
 *   4) 신고 접수 후 24시간 내 조치          → 관리자 웹 "신고 관리"
 */

/** 신고 대상 종류 */
export type ReportTargetType = 'post' | 'comment' | 'chat' | 'chotok' | 'user';

export const REPORT_TARGET_LABEL: Record<ReportTargetType, string> = {
  post: '게시글',
  comment: '댓글',
  chat: '채팅 메시지',
  chotok: '초톡',
  user: '사용자',
};

export interface ReportReason {
  key: string;
  label: string;
}

/** 신고 사유 — 순서 = 표시 순서 */
export const REPORT_REASONS: ReportReason[] = [
  { key: 'spam', label: '스팸·광고·도배' },
  { key: 'abuse', label: '욕설·혐오·괴롭힘' },
  { key: 'sexual', label: '음란물·성적 콘텐츠' },
  { key: 'illegal', label: '불법 정보·사기' },
  { key: 'privacy', label: '개인정보 노출' },
  { key: 'etc', label: '기타' },
];

export const REPORT_REASON_LABEL: Record<string, string> = Object.fromEntries(
  REPORT_REASONS.map(r => [r.key, r.label]),
);

/** 상세 사유 입력 최대 길이 */
export const REPORT_DETAIL_MAX = 500;

/** 신고 후 안내 문구 — 심사지침 1.2 의 "24시간 내 조치" 고지 */
export const REPORT_DONE_MESSAGE =
  '신고가 접수되었습니다.\n24시간 이내에 검토 후 조치합니다.';
