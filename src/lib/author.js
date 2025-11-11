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
