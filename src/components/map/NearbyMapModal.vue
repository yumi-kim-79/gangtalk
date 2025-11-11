<!-- src/components/map/NearbyMapModal.vue -->
<template>
  <!-- 모달: 전역에서 한번만 렌더링되면 어디서든 이벤트로 열림 -->
  <teleport to="body">
    <div
      v-if="state.open"
      class="nb-mask"
      @click.self="close"
    >
      <section class="nb-panel" role="dialog" aria-modal="true">
        <header class="nb-head">
          <strong>내 주변 보기 ({{ radiusKm }}km)</strong>
          <button class="nb-close" aria-label="닫기" @click="close" type="button">✕</button>
        </header>

        <div class="nb-body">
          <!-- 지도 -->
          <div ref="mapEl" class="nb-map"></div>

          <!-- 하단 요약 -->
          <div class="nb-summary">
            <div class="left">
              <span class="dot me"></span> 현재 위치
              <span class="sep">|</span>
              <span class="dot store"></span> 매장 마커 ({{ stores.length }}곳)
              <span class="sep" v-if="stores.length">|</span>
              <span v-if="stores.length">가장 가까운 곳: <b>{{ nearestLabel }}</b></span>
            </div>
            <div class="right">
              <button class="nb-btn" type="button" @click="zoomIn">＋</button>
              <button class="nb-btn" type="button" @click="zoomOut">－</button>
              <button class="nb-btn" type="button" @click="fitAll">모두보기</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </teleport>
</template>

<script setup>
import { onMounted, onUnmounted, reactive, ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'

/* ─────────────────────────
   외부 계약
   - 열기: window.dispatchEvent(new CustomEvent('open-nearby-map', { detail: { center, radiusKm, stores } }))
   - detail.center: { lat, lng }
   - detail.radiusKm: number (기본 10)
   - detail.stores: [{ id, name, lat, lng, dist? }, ...]
   - 라우팅: 마커 클릭 시 storeDetail로 이동
───────────────────────── */

const router = useRouter()

// 상태
const state = reactive({
  open: false,
  center: { lat: 37.4979, lng: 127.0276 }, // 강남역 기본값 (fallback)
  radiusKm: 10,
})
const mapEl = ref(null)
let map = null
let meMarker = null
let radiusCircle = null
let storeMarkers = []

// 외부에서 넘어온 매장
const stores = ref([])

const radiusKm = computed(() => Number(state.radiusKm || 10))
const nearestLabel = computed(() => {
  if (!stores.value.length) return '없음'
  const first = stores.value[0]
  const d = typeof first.dist === 'number' ? Math.round(first.dist * 10) / 10 : null
  return d != null ? `${first.name} (~${d}km)` : first.name
})

/* Google Maps 스크립트 로더 */
const apiKey = import.meta.env.VITE_GMAPS_API_KEY
let gmapLoading = null
function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve()
  if (gmapLoading) return gmapLoading
  if (!apiKey) {
    console.warn('[NearbyMapModal] VITE_GMAPS_API_KEY 가 설정되지 않았습니다.')
  }
  const url = `https://maps.googleapis.com/maps/api/js?key=${apiKey || ''}&v=quarterly`
  gmapLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = url
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = (e) => reject(e)
    document.head.appendChild(s)
  })
  return gmapLoading
}

/* 지도 초기화 */
async function ensureMap() {
  await loadGoogleMaps()
  await nextTick()
  if (!map && mapEl.value) {
    map = new google.maps.Map(mapEl.value, {
      center: state.center,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
    })
  }
}

/* 마커/원 렌더링 */
function clearMarkers() {
  if (meMarker) { meMarker.setMap(null); meMarker = null }
  if (radiusCircle) { radiusCircle.setMap(null); radiusCircle = null }
  for (const m of storeMarkers) m.setMap(null)
  storeMarkers = []
}

function renderAll() {
  if (!map) return
  clearMarkers()

  // 현재 위치
  meMarker = new google.maps.Marker({
    position: state.center,
    map,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 7,
      fillColor: '#1a73e8',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    },
    title: '현재 위치',
    zIndex: 1000,
  })

  // 반경 원
  radiusCircle = new google.maps.Circle({
    map,
    center: state.center,
    radius: radiusKm.value * 1000, // km → m
    strokeColor: '#1a73e8',
    strokeOpacity: 0.7,
    strokeWeight: 1,
    fillColor: '#1a73e8',
    fillOpacity: 0.08,
    clickable: false,
  })

  // 매장 마커
  for (const s of stores.value) {
    if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue
    const marker = new google.maps.Marker({
      position: { lat: s.lat, lng: s.lng },
      map,
      title: s.name || '',
    })
    marker.addListener('click', () => {
      close()
      // storeDetail 라우트 존재 가정 (기존 StoreFinder에서 사용 중)
      router.push({ name: 'storeDetail', params: { id: s.id } })
    })
    storeMarkers.push(marker)
  }

  fitAll()
}

/* 보기 범위 맞추기 */
function fitAll() {
  if (!map) return
  const bounds = new google.maps.LatLngBounds()
  bounds.extend(state.center)
  if (stores.value.length) {
    for (const s of stores.value) bounds.extend({ lat: s.lat, lng: s.lng })
  } else {
    // 매장이 없어도 반경 원이 보이도록 대각선 2점 추가
    const r = radiusKm.value * 1000
    const dLat = r / 111320 // 위도 1m ≒ 1/111320°
    const dLng = r / (111320 * Math.cos(state.center.lat * Math.PI / 180))
    bounds.extend({ lat: state.center.lat + dLat, lng: state.center.lng + dLng })
    bounds.extend({ lat: state.center.lat - dLat, lng: state.center.lng - dLng })
  }
  map.fitBounds(bounds, 40)
}

/* 줌 컨트롤 */
function zoomIn(){ if (map) map.setZoom(Math.min((map.getZoom() || 13) + 1, 20)) }
function zoomOut(){ if (map) map.setZoom(Math.max((map.getZoom() || 13) - 1, 2)) }

/* 열기/닫기 */
async function openWith(detail) {
  state.open = true
  state.center = detail?.center || state.center
  state.radiusKm = Number(detail?.radiusKm || 10)
  // stores: id, name, lat, lng, dist?
  stores.value = Array.isArray(detail?.stores) ? detail.stores.filter(s =>
    Number.isFinite(s?.lat) && Number.isFinite(s?.lng)
  ) : []

  await ensureMap()
  map.setCenter(state.center)
  renderAll()
}
function close(){ state.open = false }

/* 이벤트 바인딩: 전역에서 열기 */
function onOpenNearby(ev){
  const detail = ev?.detail || {}
  openWith(detail)
}

onMounted(() => {
  window.addEventListener('open-nearby-map', onOpenNearby)
})
onUnmounted(() => {
  window.removeEventListener('open-nearby-map', onOpenNearby)
  clearMarkers()
})
</script>

<style scoped>
/* 오버레이 */
.nb-mask{
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  display: grid; place-items: end center;
  z-index: 100000;
  padding-bottom: max(10px, env(safe-area-inset-bottom));
  padding-left:  max(8px,  env(safe-area-inset-left));
  padding-right: max(8px,  env(safe-area-inset-right));
}

/* 패널 */
.nb-panel{
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  background: var(--bg, #fff);
  color: var(--fg, #111);
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
  box-shadow: 0 -10px 30px rgba(0,0,0,.25);
  overflow: hidden;
  animation: slideUp .16s ease-out;
}

@keyframes slideUp{
  from { transform: translateY(16px); opacity: .8 }
  to   { transform: none; opacity: 1 }
}

.nb-head{
  display:flex; align-items:center; justify-content:space-between;
  padding: 10px 12px; border-bottom: 1px solid var(--line);
}
.nb-head strong{ font-size: 15px; font-weight: 900; }
.nb-close{
  width: 32px; height: 32px; border-radius: 999px;
  border: 1px solid var(--line); background: #fff; color:#111;
}

/* 본문 */
.nb-body{ display:flex; flex-direction:column; gap:8px; padding: 8px 10px 12px; }

/* 지도 영역: 모바일 60vh 기준 */
.nb-map{
  width: 100%;
  height: clamp(360px, 60dvh, 640px);
  border-radius: 12px;
  border: 1px solid var(--line);
  overflow: hidden;
  background: #f2f2f4;
}

/* 요약 바 */
.nb-summary{
  display:flex; align-items:center; justify-content:space-between; gap:8px;
  padding: 6px 2px 0;
  font-size: 12px; font-weight: 800;
}
.nb-summary .left{ display:flex; align-items:center; gap:8px; flex-wrap:wrap }
.nb-summary .right{ display:flex; align-items:center; gap:6px }
.nb-summary .sep{ opacity:.5 }
.nb-btn{
  height: 30px; padding: 0 10px; border-radius: 999px;
  border: 1px solid var(--line); background: #fff; color:#111;
  box-shadow: 0 4px 10px var(--shadow); font-weight: 900; font-size: 12px;
}

/* 범례 점 */
.dot{
  display:inline-block; width:10px; height:10px; border-radius:999px; vertical-align:middle;
}
.dot.me{ background:#1a73e8 }
.dot.store{ background:#111 }
</style>
