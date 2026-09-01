// src/admin/utils/marketingSaver.ts
import {
  writeBatch, doc, collection, getDocs, serverTimestamp, setDoc
} from 'firebase/firestore'
import { getStorage, ref as sRef, uploadString, getDownloadURL } from 'firebase/storage'
import type { Firestore } from 'firebase/firestore'

export type FinderBanner = {
  id?: string
  _id?: string
  key?: string
  title?: string
  desc?: string
  tags?: string[]
  tagPos?: Array<{ x:number, y:number }>
  img?: string // data:, gs://, https:// 모두 들어올 수 있음
  images?: string[]
  photos?: string[]
  banner?: string
  image?: string
  cover?: string
}

const SAFE_FIELDS = (b: FinderBanner) => ({
  id    : String(b.id || b._id || b.key || ''),
  title : b.title || '',
  desc  : b.desc  || '',
  tags  : Array.isArray(b.tags)   ? b.tags   : [],
  tagPos: Array.isArray(b.tagPos) ? b.tagPos : [],
  img   : b.img || b.image || b.banner || b.cover ||
          (Array.isArray(b.images) && b.images[0]) ||
          (Array.isArray(b.photos) && b.photos[0]) || ''
})

/** data: URL이면 Storage에 업로드하고 URL로 바꿔줍니다. 그 외는 그대로 반환 */
async function normalizeImageURL(dbProjectId: string, raw: string): Promise<string> {
  const url = String(raw || '').trim()
  if (!url) return ''
  if (!/^data:/i.test(url)) return url // 이미 gs://, http(s)://, / 경로면 그대로

  const storage = getStorage()
  const fileName = `finder-banners/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
  const ref = sRef(storage, fileName)
  await uploadString(ref, url, 'data_url')
  try {
    // https 다운로드 URL을 우선 사용
    return await getDownloadURL(ref)
  } catch {
    // 실패 시 gs:// 경로라도 저장
    return `gs://${(storage as any)?._bucket || dbProjectId}/${fileName}`
  }
}

/** 운영자툴에서 넘긴 배너 배열을 컬렉션으로 싱크 */
export async function saveFinderBannersToSubcollection(
  db: Firestore,
  projectId: string,
  rawBanners: FinderBanner[]
) {
  // 1) 기존 컬렉션 스냅샷
  const baseCol = collection(db, 'config', 'marketing', 'finderBanners')
  const snap = await getDocs(baseCol)
  const existing = new Set(snap.docs.map(d => d.id))

  // 2) 다음에 남길 id 집합
  const nextIds: string[] = []

  // 3) 배치 시작
  const batch = writeBatch(db)

  // 4) 정규화 + 이미지 업로드(data: → URL)
  for (let i = 0; i < rawBanners.length; i++) {
    const raw = rawBanners[i] || {}
    const safe = SAFE_FIELDS(raw)
    const id = safe.id || `fb_${i}_${Math.random().toString(36).slice(2)}`
    safe.id = id
    safe.img = await normalizeImageURL(projectId, safe.img)

    nextIds.push(id)
    batch.set(doc(baseCol, id), safe, { merge: true })
  }

  // 5) 제거된 문서 삭제
  for (const d of snap.docs) {
    if (!nextIds.includes(d.id)) {
      batch.delete(d.ref)
    }
  }

  // 6) 상위 문서에는 최소 메타 정보만
  batch.set(
    doc(db, 'config', 'marketing'),
    {
      finderBannerIds: nextIds,
      finderBannersUpdatedAt: serverTimestamp()
    },
    { merge: true }
  )

  // 7) 커밋
  await batch.commit()
}

/** (선택) 문서에 박혀있던 기존 배열을 한 번에 마이그레이션 */
export async function migrateFinderBannersFromDocArray(
  db: Firestore,
  projectId: string,
  arrayFromDoc: any[]
) {
  const arr = Array.isArray(arrayFromDoc) ? arrayFromDoc : []
  await saveFinderBannersToSubcollection(db, projectId, arr as FinderBanner[])
}
