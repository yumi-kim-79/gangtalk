// src/composables/useMarketingBanners.js
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { fbDb, fbStorage } from '@/firebase'
import {
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore'
import { getDownloadURL, ref as sRef } from 'firebase/storage'

/** Firestore 컬렉션 이름 매핑 */
function subcollName(type /* 'P' | 'F' */) {
  if (type === 'F') return 'adBannersFinder' // 가게찾기
  return 'adBannersP'                        // 제휴관 기본
}

/** 고정 문서 경로: config/marketing/<subcoll>/prod */
function fixedDocPath(type /* 'P' | 'F' */) {
  return ['config', 'marketing', subcollName(type), 'prod']
}

/** 문서의 필드에서 리스트를 고른다 (폴백용) */
function pickFromDocFields(d, type /* 'P' | 'F' */) {
  if (type === 'F') {
    return (
      d.adBannersFinder ?? d.finderBanners ?? d.finderAds ?? d.finder ?? []
    )
  }
  // 'P' = 제휴관
  return d.adBannersP ?? d.adBanners ?? d.banners ?? d.ads ?? []
}

/** gs:// → https 변환 (그 외는 그대로 통과) */
async function resolveImg(u) {
  const url = String(u || '').trim()
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('/')) return url
  if (url.startsWith('gs://')) {
    try {
      return await getDownloadURL(sRef(fbStorage, url))
    } catch {
      return ''
    }
  }
  return ''
}

/** 원시 배너 레코드 → 표준 배너 객체 */
async function normalizeBanner(raw, idFallback) {
  const d = raw || {}

  // 우선순위: img → images[_imgIndex] → images[0]
  const imagesArr = Array.isArray(d.images) ? d.images : []
  const idx = Number.isFinite(d._imgIndex) ? Number(d._imgIndex) : 0
  const rawImg = d.img || imagesArr[idx] || imagesArr[0] || ''

  const img = await resolveImg(rawImg)

  return {
    id: d.id || idFallback || `${Date.now()}_${Math.random()}`,
    img,                          // ✅ 최종 표시용 이미지 URL
    images: imagesArr,            // 원본 배열(그대로 유지)
    _imgIndex: idx,
    tags: Array.isArray(d.tags) ? d.tags : [],
    tagPos: Array.isArray(d.tagPos) ? d.tagPos : (d.tagPos || []),
    color: d.color || '',
    desc: d.desc || '',
    link: d.link || d.href || '',
    createdAt: d.createdAt || null,
  }
}

/**
 * 제휴관/가게찾기 배너 훅
 * - type: 'P' (제휴관), 'F' (가게찾기)
 * - items: [{ id, img, ... }]
 * - ready: 데이터 준비 완료 여부
 */
export function useMarketingBanners(type /* 'P' | 'F' */ = 'P') {
  const items = ref([])
  const ready = ref(false)

  // 소스 우선순위: fixedDoc(3) > subcollection(2) > rootDoc(1)
  const PRIORITY = { rootDoc: 1, subcoll: 2, fixedDoc: 3 }
  let currentPriority = 0

  let unsubs = []

  /** 가장 최근의 유효 리스트로 교체 (우선순위 기반) */
  async function applyList(rawList = [], from = 'unknown', prio = 0) {
    const arr = Array.isArray(rawList) ? rawList : []
    const sane = arr.map((x) => (typeof x === 'string' ? { img: x } : x))

    const normalized = await Promise.all(
      sane.map((x, i) => normalizeBanner(x, `${from}_${i}`))
    )

    const withImage = normalized.filter((b) => !!b.img)

    // 비어있으면 적용하지 않음 (다른 소스가 채울 수 있게)
    if (!withImage.length) {
      // 그래도 ready는 true로 켜서 UI 스피너가 영원히 돌지 않도록
      ready.value = true
      return
    }

    // 우선순위 체크
    if (prio >= currentPriority) {
      currentPriority = prio
      items.value = withImage
    }
    ready.value = true
  }

  onMounted(() => {
    // 1) 고정 문서(production 미러) 실시간 구독 — 최우선 소스
    try {
      const p = fixedDocPath(type) // ['config','marketing','<subcoll>','prod']
      const u0 = onSnapshot(
        doc(fbDb, p[0], p[1], p[2], p[3]),
        async (ss) => {
          const data = ss.exists() ? ss.data() || {} : {}
          const arr = Array.isArray(data.adBanners) ? data.adBanners : []
          await applyList(arr, 'fixedDoc', PRIORITY.fixedDoc)
        },
        () => {
          // 에러는 무시하고 다른 소스에 맡김
        }
      )
      unsubs.push(u0)
    } catch {
      // ignore
    }

    // 2) 서브컬렉션을 실시간으로 구독 (백업 소스)
    try {
      const col = collection(
        fbDb,
        'config',
        'marketing',
        subcollName(type)
      )
      let qy = null
      try {
        // createdAt 없는 문서가 있을 수 있으므로 orderBy는 실패 가능 → 그냥 컬렉션 전체로 구독
        qy = query(col, orderBy('createdAt', 'desc'))
      } catch {
        qy = col
      }

      const u1 = onSnapshot(
        qy,
        async (snap) => {
          const list = await Promise.all(
            snap.docs.map((d) => normalizeBanner(d.data(), d.id))
          )
          await applyList(list, 'subcoll', PRIORITY.subcoll)
        },
        () => {
          // 에러 시엔 폴백에 맡김
        }
      )
      unsubs.push(u1)
    } catch {
      // 무시하고 폴백으로
    }

    // 3) 루트 문서 필드 폴백을 동시에 구독 (가장 낮은 우선순위)
    try {
      const u2 = onSnapshot(doc(fbDb, 'config', 'marketing'), async (s) => {
        const d = s.exists() ? s.data() || {} : {}
        const arr = pickFromDocFields(d, type)
        await applyList(arr, 'rootDoc', PRIORITY.rootDoc)
      })
      unsubs.push(u2)
    } catch {
      // ignore
      ready.value = true
    }
  })

  onBeforeUnmount(() => {
    unsubs.forEach((f) => typeof f === 'function' && f())
    unsubs = []
  })

  return { items, ready }
}
