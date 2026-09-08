/**
 * 업체·제휴업체 대표 이미지 업로드 — 단일 창구.
 *
 * 경로는 storage.rules 가 허용하는 것만 쓴다.
 *   stores/{storeId}/…          업체 본인 + 관리자
 *   marketing/partners/{id}/…   관리자만 (제휴업체는 관리자만 등록·수정한다)
 *
 * 목록 썸네일은 thumb → images[0] → img 순으로 읽히므로 세 곳을 같이 맞춰 준다.
 * (한 곳만 바꾸면 화면마다 옛 사진이 남는다)
 */
import { getDownloadURL, ref as sRef, uploadBytes } from 'firebase/storage'
import { storage as fbStorage } from '@/firebase'

const extOf = (f) => (String(f?.name || '').split('.').pop() || 'jpg').toLowerCase()

async function put(path, file) {
  const r = sRef(fbStorage, path)
  await uploadBytes(r, file, {
    contentType: file.type || 'image/jpeg',
    cacheControl: 'public, max-age=86400',
  })
  return await getDownloadURL(r)
}

/** 업체 대표 이미지 → https URL */
export function uploadStoreThumb(storeId, file) {
  return put(`stores/${storeId}/thumb-${Date.now()}.${extOf(file)}`, file)
}

/** 제휴업체 대표 이미지 → https URL */
export function uploadPartnerThumb(partnerId, file) {
  return put(`marketing/partners/${partnerId}/thumb-${Date.now()}.${extOf(file)}`, file)
}

/** 썸네일을 읽는 모든 필드를 한 번에 맞추는 Firestore 패치 */
export function thumbPatch(url) {
  return {
    thumb: url,
    img: url,
    images: [url],
    thumbVer: Date.now(),
  }
}

/** 업로드 전 기본 검사 — 형식·용량(storage.rules 상한 10MB) */
export function checkImageFile(file) {
  if (!file) return '파일을 선택해 주세요.'
  if (!/^image\//.test(file.type || '')) return '이미지 파일만 올릴 수 있습니다.'
  if (file.size > 10 * 1024 * 1024) return '이미지 용량은 10MB 이하여야 합니다.'
  return ''
}
