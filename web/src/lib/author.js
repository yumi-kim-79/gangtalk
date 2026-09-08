// src/lib/author.js
export function sanitizeUserPayload(payload = {}, uid = '') {
  const cleaned = { ...payload }

  // 강제 author/authorUid 설정 & 의도치 않은 필드 제거
  if (uid) cleaned.authorUid = String(uid)
  if (!cleaned.author) delete cleaned.author   // 항상 익명 표시만 쓸 거면 유지/삭제 선택
  delete cleaned.isSynthetic
  delete cleaned.simScenario
  delete cleaned.seedId

  return cleaned
}

/**
 * 작성자 이름을 밝히지 않은 글의 표기.
 * 예전에는 '익명' 으로 저장·표시했는데, 사용자에게 보이는 말을 '비공개' 하나로 통일한다.
 * 이미 '익명' 으로 저장된 옛 글도 화면에서는 '비공개' 로 보이게 매핑한다.
 * 앱 대응: app/src/constants/author.ts (같은 값을 써야 한다)
 */
export const ANON_LABEL = '비공개'

/** 레거시 '익명' 을 포함해 표시용 작성자 이름으로 바꾼다 */
export function displayAuthor(name) {
  const n = String(name ?? '').trim()
  if (!n || n === '익명' || n === ANON_LABEL) return ANON_LABEL
  return n
}
