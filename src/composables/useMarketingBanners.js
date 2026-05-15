// src/composables/useMarketingBanners.js
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { fbDb, fbStorage } from '@/firebase'
import {
  doc,
  collection,
  onSnapshot,
  getDoc,
  getDocs,
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

/* ===== 성능 최적화 =====
 * 같은 gs:// URL 에 대해 getDownloadURL 을 매번 새로 호출하면 Storage 토큰 발급
 * 추가 라운드트립이 누적됨. 모듈 스코프 Map 으로 https URL 을 캐시한다.
 */
const urlCache = new Map()

/** gs:// → https 변환 (그 외는 그대로 통과) — 모듈 캐시 사용 */
async function resolveImg(u) {
  const url = String(u || '').trim()
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('/')) return url
  if (url.startsWith('gs://')) {
    if (urlCache.has(url)) return urlCache.get(url)
    try {
      const https = await getDownloadURL(sRef(fbStorage, url))
      urlCache.set(url, https)
      return https
    } catch {
      urlCache.set(url, '')
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
 *
 * 소스 전략 (이전: 3개 모두 onSnapshot → 변경):
 *  1) fixedDoc (config/marketing/<subcoll>/prod): 운영 미러로 자주 갱신되므로 onSnapshot 유지 — 최우선
 *  2) subcollection (config/marketing/<subcoll>): fixedDoc 이 비어있을 때만 1회 getDocs 폴백
 *  3) rootDoc (config/marketing): 마지막 폴백 — 1회 getDoc
 *
 * 실시간 구독을 1개로 줄여 진입 직후 onSnapshot 폭주를 차단.
 */
export function useMarketingBanners(type /* 'P' | 'F' */ = 'P') {
  const items = ref([])
  const ready = ref(false)

  // 소스 우선순위: fixedDoc(3) > subcoll(2) > rootDoc(1)
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
    // 1) fixedDoc — 유일한 실시간 구독 (가장 자주 갱신되는 소스)
    try {
      const p = fixedDocPath(type)
      const u0 = onSnapshot(
        doc(fbDb, p[0], p[1], p[2], p[3]),
        async (ss) => {
          const data = ss.exists() ? ss.data() || {} : {}
          const arr = Array.isArray(data.adBanners) ? data.adBanners : []
          await applyList(arr, 'fixedDoc', PRIORITY.fixedDoc)
        },
        () => {
          // 에러는 무시하고 폴백에 맡김
        }
      )
      unsubs.push(u0)
    } catch {
      // ignore
    }

    // 2) subcollection — 1회 getDocs 폴백 (실시간 불필요)
    ;(async () => {
      try {
        const col = collection(fbDb, 'config', 'marketing', subcollName(type))
        let qy
        try {
          qy = query(col, orderBy('createdAt', 'desc'))
        } catch {
          qy = col
        }
        const snap = await getDocs(qy)
        const list = await Promise.all(
          snap.docs.map((d) => normalizeBanner(d.data(), d.id))
        )
        await applyList(list, 'subcoll', PRIORITY.subcoll)
      } catch {
        // 폴백 실패 시 무시
      }
    })()

    // 3) rootDoc — 1회 getDoc 폴백 (실시간 불필요)
    ;(async () => {
      try {
        const snap = await getDoc(doc(fbDb, 'config', 'marketing'))
        const d = snap.exists() ? snap.data() || {} : {}
        const arr = pickFromDocFields(d, type)
        await applyList(arr, 'rootDoc', PRIORITY.rootDoc)
      } catch {
        ready.value = true
      }
    })()
  })

  onBeforeUnmount(() => {
    unsubs.forEach((f) => typeof f === 'function' && f())
    unsubs = []
  })

  return { items, ready }
}
