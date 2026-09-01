// src/composables/useNearby.ts
import { ref } from 'vue'
import type { Router } from 'vue-router'

type LatLng = { lat: number; lng: number }
type Store = Record<string, any>

export const NEARBY_EVENT = 'open-nearby-map'
const SS_KEY = 'nearby:stores'
const SS_META_KEY = 'nearby:meta'

/** HTTPS/권한 문제 시 사용할 기본 중심: 강남역 */
export const DEFAULT_CENTER = { lat: 37.4979, lng: 127.0276 }
export const DEFAULT_CENTER_LABEL = '강남역'

function isSecureOrigin() {
  // HTTPS 또는 http://localhost 에서만 navigator.geolocation 허용
  const { protocol, hostname } = window.location
  if (protocol === 'https:') return true
  if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')) return true
  return false
}

async function getCurrentPositionOnce(): Promise<LatLng> {
  if (!navigator.geolocation) {
    throw new Error('이 기기에서 위치 정보를 사용할 수 없습니다.')
  }
  return new Promise<LatLng>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}

// 하버사인 거리(km)
function distanceKm(a: LatLng, b: LatLng) {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const la1 = a.lat * Math.PI / 180
  const la2 = b.lat * Math.PI / 180
  const h = Math.sin(dLat/2)**2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng/2)**2
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

// 스토어 좌표 추출(필드명 다양성 대응)
function coordOf(s: Store): LatLng | null {
  const lat = Number(s?.lat ?? s?.latitude ?? s?.geo?.lat ?? s?.location?.lat ?? NaN)
  const lng = Number(s?.lng ?? s?.longitude ?? s?.geo?.lng ?? s?.location?.lng ?? NaN)
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  return null
}

function pickWithin(stores: Store[], center: LatLng, radiusKm: number) {
  const arr = (Array.isArray(stores) ? stores : [])
    .map(s => ({ s, c: coordOf(s) }))
    .filter(x => !!x.c)
    .map(x => ({ ...x, d: distanceKm(center, x.c as LatLng) }))
    .filter(x => x.d <= radiusKm)
    .sort((a, b) => a.d - b.d)
    .map(x => ({ id: x.s.id, name: x.s.name, ...(x.c as LatLng), dist: x.d }))
  return arr
}

export function useNearby() {
  const busy = ref(false)

  /** 마지막으로 계산된 주변 결과(좌표 가진 스토어 간단 배열) */
  function getLastNearby(): Array<{ id: any; name: string; lat: number; lng: number; dist: number }>{
    try {
      const raw = sessionStorage.getItem(SS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  }

  async function openNearby(opts: {
    stores?: Store[] | { value: Store[] }
    router?: Router
    radiusKm?: number
  } = {}) {
    if (busy.value) return
    busy.value = true
    const radiusKm = Number(opts.radiusKm ?? 10)

    try {
      // 중심 좌표 결정: 보안 아님/권한 실패 시 강남역 폴백
      let center: LatLng
      let usedDefault = false

      if (!isSecureOrigin()) {
        alert('현재 페이지가 보안 연결(HTTPS)이 아니라서 정확한 위치를 가져올 수 없습니다.\n배포(HTTPS) 또는 localhost에서 다시 시도해주세요.\n지금은 강남역 기준으로 보여드릴게요.')
        center = DEFAULT_CENTER
        usedDefault = true
      } else {
        try {
          center = await getCurrentPositionOnce()
        } catch (e: any) {
          console.warn('geolocation 실패, 기본 중심으로 폴백:', e)
          alert('현재 위치를 가져오지 못했습니다. 강남역 기준으로 보여드릴게요.')
          center = DEFAULT_CENTER
          usedDefault = true
        }
      }

      // stores가 ref/computed면 .value 사용
      const inputStores: Store[] =
        (Array.isArray(opts.stores as any) ? opts.stores as Store[] :
         (opts.stores && (opts.stores as any).value ? (opts.stores as any).value as Store[] : []))

      // 반경 내 목록 계산
      const within = pickWithin(inputStores, center, radiusKm)

      // 세션 저장(지도로 넘어가도 같은 목록 사용) + 메타 병행 저장(호환 유지)
      try {
        sessionStorage.setItem(SS_KEY, JSON.stringify(within))
        sessionStorage.setItem(SS_META_KEY, JSON.stringify({ center, radiusKm, ts: Date.now() }))
      } catch {}

      // 전역 이벤트(맵 모달/전용 뷰에서 수신)
      window.dispatchEvent(new CustomEvent(NEARBY_EVENT, {
        detail: { center, radiusKm, stores: within, usedDefault }
      }))

      // 등록된 라우트가 있으면 이동
      if (opts.router) {
        const candidates = [
          { name: 'mapNearby', query: { lat: center.lat, lng: center.lng, r: radiusKm } },
          { name: 'map',       query: { lat: center.lat, lng: center.lng, r: radiusKm } },
          { path: '/map',      query: { lat: center.lat, lng: center.lng, r: radiusKm } },
        ]
        for (const to of candidates) {
          const r = opts.router.resolve(to as any)
          if (r.matched && r.matched.length) { await opts.router.push(to as any); break }
        }
      }

      if (!within.length) {
        alert(`내 주변 ${radiusKm}km 내에 좌표가 등록된 매장을 찾지 못했습니다.`)
      }
    } catch (e: any) {
      console.warn('openNearby error:', e)
      alert('현재 위치 기반 보기 실행 중 오류가 발생했습니다.')
    } finally {
      busy.value = false
    }
  }

  return { openNearby, busy, getLastNearby }
}
