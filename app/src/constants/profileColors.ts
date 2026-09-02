/**
 * 프로필 아바타 색상 프리셋.
 * 웹 ProfileEditSheet.vue:241-263 과 **값·순서가 완전히 같아야** 한다 —
 * 한쪽에서 고른 색이 다른 쪽에서 목록에 없으면 선택 표시가 사라진다.
 */

/** 배경 9색 */
export const AVATAR_BG_PRESETS = [
  '#FF6B9C',
  '#FF9F1C',
  '#FFC94F',
  '#5AD2FF',
  '#40C057',
  '#845EF7',
  '#FF8787',
  '#FFB5E8',
  '#A5D8FF',
] as const;

/** 텍스트 8색 */
export const AVATAR_TEXT_PRESETS = [
  '#000000', // 검정
  '#FFFFFF', // 흰색
  '#FF0000', // 빨강
  '#FF2C8A', // 핑크
  '#007BFF', // 파랑
  '#00A86B', // 녹색
  '#8E44AD', // 보라
  '#001F54', // 남색
] as const;

/** 웹 effectiveBgColor / effectiveTextColor 의 기본값 */
export const AVATAR_BG_DEFAULT = AVATAR_BG_PRESETS[0];
export const AVATAR_TEXT_DEFAULT = '#FF2C8A';

/**
 * 닉네임 → 아바타 표시 글자.
 * 웹 useMyPageCore.js:1725 initials() 와 동일 — 4글자까지는 그대로, 그 이상은 앞 4글자.
 */
export function avatarInitials(nickname: string): string {
  const n = String(nickname ?? '').trim();
  if (!n) return '';
  return n.length <= 4 ? n : n.slice(0, 4);
}
