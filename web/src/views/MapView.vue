<!-- src/views/MapView.vue -->
<template>
  <main class="map-page">
    <header class="map-head">
      <button class="btn back" type="button" @click="goBack">←</button>
      <strong>내 주변 지도</strong>
      <div class="spacer"></div>
    </header>

    <section class="map-wrap">
      <div ref="mapEl" class="map"></div>

      <div class="map-tools">
        <div class="row">
          <button class="tool" title="내 위치로" @click="recenter">◎</button>
          <button class="tool" title="모두 보기" @click="fitAll">□</button>
        </div>
        <div class="row radius">
          <label>반경: {{ radiusKm }}km</label>
          <input type="range" min="1" max="30" v-model.number="radiusKm" @input="onRadiusChange" />
        </div>
      </div>

      <div class="map-bottom">
        <div class="summary">
          <span class="dot me"></span> 현재 위치
          <span class="sep">|</span>
          <span class="dot store"></span> 매장 {{ stores.length }}곳
          <span class="sep" v-if="nearestLabel">|</span>
          <span v-if="nearestLabel">가장 가까움: <b>{{ nearestLabel }}</b></span>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

/** 쿼리 파싱 (lat,lng,r) */
const center = reactive({
  lat: Number(route.query.lat ?? 37.4979),
  lng: Number(route.query.lng ?? 127.0276),
})
const radiusKm = ref(Number(route.query.r ?? 10))

/** sessionStorage에서 근처 매장 목록 읽어오기 (StoreFinder의 openNearby가 저장) */
function readStoresFromSession(){
  try{
    const raw = sessionStorage.getItem('nearby:stores') || '[]'
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) return arr.filter(s =>
      Number.isFinite(s?.lat) && Number.isFinite(s?.lng)
    )
  }catch{}
  return []
}
const stores = ref(readStoresFromSession())

/** 가장 가까운 매장 라벨 */
const nearestLabel = computed(() => {
  if (!stores.value.length) return ''
  const s = stores.value.slice().sort((a,b)=> (a.dist ?? 0) - (b.dist ?? 0))[0]
  const d = typeof s?.dist === 'number' ? Math.round(s.dist*10)/10 : null
  return s?.name ? (d != null ? `${s.name} (~${d}km)` : s.name) : ''
})

/** 지도 */
const mapEl = ref(null)
let map = null
let meMarker = null
let radiusCircle = null
let storeMarkers = []

const apiKey = import.meta.env.VITE_GMAPS_API_KEY
let gmapLoading = null
function loadGoogleMaps(){
  if (window.google?.maps) return Promise.resolve()
  if (gmapLoading) return gmapLoading
  const url = `https://maps.googleapis.com/maps/api/js?key=${apiKey || ''}&v=quarterly`
  gmapLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = url; s.async = true; s.defer = true
    s.onload = () => resolve()
    s.onerror = (e) => reject(e)
    document.head.appendChild(s)
  })
  return gmapLoading
}

async function ensureMap(){
  await loadGoogleMaps()
  await nextTick()
  if (!map && mapEl.value){
    map = new google.maps.Map(mapEl.value, {
      center, zoom: 13,
      mapTypeControl:false, streetViewControl:false, fullscreenControl:false,
      gestureHandling:'greedy',
    })
  }
}

function clearMarkers(){
  if (meMarker) { meMarker.setMap(null); meMarker=null }
  if (radiusCircle) { radiusCircle.setMap(null); radiusCircle=null }
  for (const m of storeMarkers) m.setMap(null)
  storeMarkers = []
}

function renderAll(){
  if (!map) return
  clearMarkers()

  // 현재 위치
  meMarker = new google.maps.Marker({
    position: center,
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

  // 반경
  radiusCircle = new google.maps.Circle({
    map,
    center,
    radius: radiusKm.value * 1000,
    strokeColor:'#1a73e8', strokeOpacity:0.7, strokeWeight:1,
    fillColor:'#1a73e8', fillOpacity:0.08,
    clickable:false,
  })

  // 매장 마커
  for (const s of stores.value){
    const marker = new google.maps.Marker({
      position: { lat: s.lat, lng: s.lng },
      title: s.name || '',
      map,
    })
    marker.addListener('click', () => {
      router.push({ name:'storeDetail', params:{ id: s.id } })
    })
    storeMarkers.push(marker)
  }

  fitAll()
}

function fitAll(){
  if (!map) return
  const b = new google.maps.LatLngBounds()
  b.extend(center)
  if (stores.value.length){
    for (const s of stores.value) b.extend({ lat: s.lat, lng: s.lng })
  }else{
    // 매장 없을 때도 반경 표현
    const r = radiusKm.value * 1000
    const dLat = r / 111320
    const dLng = r / (111320 * Math.cos(center.lat * Math.PI/180))
    b.extend({ lat: center.lat + dLat, lng: center.lng + dLng })
    b.extend({ lat: center.lat - dLat, lng: center.lng - dLng })
  }
  map.fitBounds(b, 40)
}
function recenter(){ if (map) map.setCenter(center) }
function onRadiusChange(){
  // URL에 반영(공유/새로고침 보존)
  router.replace({ query:{ ...route.query, r: radiusKm.value } })
  if (radiusCircle){
    radiusCircle.setRadius(radiusKm.value * 1000)
    fitAll()
  }
}

onMounted(async () => {
  await ensureMap()
  map.setCenter(center)
  renderAll()
})

watch(() => route.query.r, (nv) => {
  if (nv != null) radiusKm.value = Number(nv)
})
watch(() => [route.query.lat, route.query.lng], (nv) => {
  const [la, ln] = nv
  if (la != null && ln != null){
    center.lat = Number(la); center.lng = Number(ln)
    if (map){ map.setCenter(center); renderAll() }
  }
})

function goBack(){ router.back() }
</script>

<style scoped>
.map-page{ padding-bottom: max(env(safe-area-inset-bottom), var(--nav-h)); background:var(--bg); color:var(--fg) }
.map-head{
  display:flex; align-items:center; gap:8px; padding:10px 12px;
  border-bottom:1px solid var(--line); position:sticky; top:0; background:var(--bg); z-index:2;
}
.map-head .spacer{ flex:1 1 auto }
.btn.back{
  width:32px; height:32px; border-radius:999px; border:1px solid var(--line); background:#fff;
}

.map-wrap{ position:relative; padding:10px 12px 12px }
.map{
  width:100%; height: calc(100dvh - 160px);
  min-height: 460px;
  border-radius:12px; border:1px solid var(--line); background:#f2f2f4; overflow:hidden;
}

/* 우측 툴 */
.map-tools{
  position:absolute; right:20px; top:72px; display:flex; flex-direction:column; gap:8px; z-index:3;
}
.map-tools .row{ display:flex; flex-direction:column; gap:6px; align-items:stretch }
.tool{
  width:36px; height:36px; border-radius:999px; border:1px solid var(--line);
  background:#fff; box-shadow:0 4px 10px var(--shadow); font-weight:900;
}
.row.radius{
  width:160px; padding:8px; border-radius:12px; border:1px solid var(--line); background:#fff; box-shadow:0 4px 10px var(--shadow);
  font-size:12px; font-weight:800;
}
.row.radius input[type="range"]{ width:100% }

/* 하단 바 */
.map-bottom{
  position:absolute; left:0; right:0; bottom: 16px; display:flex; justify-content:center; z-index:3;
}
.summary{
  display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:999px;
  background:#fff; border:1px solid var(--line); box-shadow:0 4px 10px var(--shadow); font-weight:800; font-size:12px;
}
.dot{ display:inline-block; width:10px; height:10px; border-radius:999px; }
.dot.me{ background:#1a73e8 }
.dot.store{ background:#111 }
.sep{ opacity:.55 }
</style>
