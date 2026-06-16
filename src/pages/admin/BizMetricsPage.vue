<!--
  src/pages/admin/BizMetricsPage.vue
  업체 본인 가게 현황판 수동 업데이트 — 맞출방 / 필요인원 / 와이파이.
  저장 시 stores/{id} (.match, .persons, .wifi) 와
        rooms_biz/{id} (.needRooms, .needPeople, .need, .totalNeeded, .totalRooms, .wifi) 양방향 동기.
  실시간으로 gangtox.com 현황판에 반영됨.
-->
<template>
  <div class="adm-page">
    <header class="adm-page-head">
      <h2 class="adm-page-title">📊 현황판 업데이트</h2>
      <p class="adm-page-sub">맞출방 / 필요인원 / 와이파이를 입력하면 강남톡방 현황판에 즉시 반영됩니다.</p>
    </header>

    <!-- 가게 선택 (가게가 2개 이상일 때만 표시) -->
    <section v-if="myStores.length > 1" class="adm-section adm-selector">
      <label>
        <span>가게 선택</span>
        <select v-model="selectedStoreId">
          <option v-for="s in myStores" :key="s.id" :value="s.id">{{ s.name || '(이름 없음)' }}</option>
        </select>
      </label>
    </section>

    <!-- 가게 없음 -->
    <section v-if="!loading && !myStores.length" class="adm-section empty-state">
      <p class="adm-empty">
        아직 연결된 가게가 없습니다.<br />
        관리자에게 가게 연결을 요청해 주세요.
      </p>
    </section>

    <!-- 메트릭 편집 -->
    <section v-else-if="currentStore" class="adm-section">
      <header class="adm-section-head">
        <h3>{{ currentStore.name }}</h3>
        <span class="adm-store-meta-pill">{{ currentStore.region || '-' }} · {{ currentStore.category || '-' }}</span>
      </header>

      <div class="adm-metric-grid">
        <!-- 맞출방 -->
        <div class="adm-metric-box">
          <label>맞출방</label>
          <div class="adm-counter">
            <button type="button" class="adm-counter-btn" @click="dec('match')">−</button>
            <input
              v-model.number="form.match"
              type="number"
              min="0"
              class="adm-counter-input"
            />
            <button type="button" class="adm-counter-btn" @click="inc('match')">+</button>
          </div>
        </div>

        <!-- 필요인원 -->
        <div class="adm-metric-box">
          <label>필요인원</label>
          <div class="adm-counter">
            <button type="button" class="adm-counter-btn" @click="dec('persons')">−</button>
            <input
              v-model.number="form.persons"
              type="number"
              min="0"
              class="adm-counter-input"
            />
            <button type="button" class="adm-counter-btn" @click="inc('persons')">+</button>
          </div>
        </div>

        <!-- 와이파이 -->
        <div class="adm-metric-box">
          <label>와이파이</label>
          <div class="adm-wifi-group" role="radiogroup">
            <button
              type="button"
              class="adm-wifi-btn"
              :class="{ active: form.wifi === 'O' }"
              @click="form.wifi = 'O'"
            >O 가능</button>
            <button
              type="button"
              class="adm-wifi-btn"
              :class="{ active: form.wifi === 'X' }"
              @click="form.wifi = 'X'"
            >X 불가</button>
            <button
              type="button"
              class="adm-wifi-btn"
              :class="{ active: form.wifi === '' }"
              @click="form.wifi = ''"
            >- 미설정</button>
          </div>
        </div>
      </div>

      <footer class="adm-section-foot">
        <span class="adm-last-time">
          최근 업데이트: {{ fmtTime(currentMetrics.updatedAt) || '기록 없음' }}
        </span>
        <button class="adm-btn primary big" type="button" :disabled="saving" @click="onSave">
          {{ saving ? '저장 중…' : '저장' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db as fbDb } from '@/firebase'
import {
  collection, doc, onSnapshot, setDoc, updateDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore'

const route = useRoute()
const router = useRouter()

const currentEmail = ref('')
const currentUid = ref('')
const loading = ref(true)
const stores = ref([])
const selectedStoreId = ref('')
const metricsByStore = ref({})

let unsubAuth = null
let unsubStoresByUid = null
let unsubStoresByEmail = null
const unsubMetrics = new Map()

function startStoresWatch(uid, email) {
  if (unsubStoresByUid)  try { unsubStoresByUid()  } catch {}
  if (unsubStoresByEmail) try { unsubStoresByEmail() } catch {}
  unsubMetrics.forEach(fn => { try { fn() } catch {} })
  unsubMetrics.clear()
  stores.value = []
  metricsByStore.value = {}

  const merged = new Map()
  const onResult = () => {
    stores.value = Array.from(merged.values())
    // rooms_biz 구독 재정렬
    const cur = new Set(stores.value.map(s => s.id))
    for (const [id, fn] of unsubMetrics) {
      if (!cur.has(id)) {
        try { fn() } catch {}
        unsubMetrics.delete(id)
      }
    }
    for (const s of stores.value) {
      if (unsubMetrics.has(s.id)) continue
      const off = onSnapshot(doc(fbDb, 'rooms_biz', s.id), (snap) => {
        const d = snap.exists() ? (snap.data() || {}) : {}
        metricsByStore.value = { ...metricsByStore.value, [s.id]: d }
      }, () => {})
      unsubMetrics.set(s.id, off)
    }

    // 초기 선택 — query.storeId > 첫 가게
    if (!selectedStoreId.value || !cur.has(selectedStoreId.value)) {
      const fromQuery = String(route.query.storeId || '')
      if (fromQuery && cur.has(fromQuery)) {
        selectedStoreId.value = fromQuery
      } else if (stores.value[0]) {
        selectedStoreId.value = stores.value[0].id
      }
    }
    loading.value = false
  }

  if (uid) {
    unsubStoresByUid = onSnapshot(
      query(collection(fbDb, 'stores'), where('ownerId', '==', uid)),
      (snap) => { for (const d of snap.docs) merged.set(d.id, { id: d.id, ...d.data() }); onResult() },
      () => { loading.value = false },
    )
  }
  if (email) {
    unsubStoresByEmail = onSnapshot(
      query(collection(fbDb, 'stores'), where('ownerEmail', '==', email)),
      (snap) => { for (const d of snap.docs) merged.set(d.id, { id: d.id, ...d.data() }); onResult() },
      () => { loading.value = false },
    )
  }
  if (!uid && !email) loading.value = false
}

onMounted(() => {
  const auth = getAuth()
  unsubAuth = onAuthStateChanged(auth, (u) => {
    currentEmail.value = String(u?.email || '').toLowerCase()
    currentUid.value = u?.uid || ''
    startStoresWatch(currentUid.value, currentEmail.value)
  })
})
onBeforeUnmount(() => {
  if (unsubAuth) try { unsubAuth() } catch {}
  if (unsubStoresByUid)  try { unsubStoresByUid()  } catch {}
  if (unsubStoresByEmail) try { unsubStoresByEmail() } catch {}
  unsubMetrics.forEach(fn => { try { fn() } catch {} })
})

const myStores = computed(() => stores.value)
const currentStore = computed(() =>
  stores.value.find(s => s.id === selectedStoreId.value) || null,
)
const currentMetrics = computed(() => metricsByStore.value[selectedStoreId.value] || {})

/* ===== 폼 상태 — 가게 선택이 바뀌면 stores/rooms_biz 값으로 리셋 ===== */
const form = ref({ match: 0, persons: 0, wifi: '' })

watch([currentStore, currentMetrics], () => {
  const s = currentStore.value || {}
  const m = currentMetrics.value || {}
  form.value = {
    match:   Number(m.needRooms ?? s.match ?? 0),
    persons: Number(m.needPeople ?? s.persons ?? 0),
    wifi:    String(m.wifi ?? s.wifi ?? ''),
  }
}, { immediate: true })

function inc(key) {
  form.value[key] = Math.max(0, Number(form.value[key] || 0) + 1)
}
function dec(key) {
  form.value[key] = Math.max(0, Number(form.value[key] || 0) - 1)
}

/* ===== 저장 — stores + rooms_biz 양쪽 동기 ===== */
const saving = ref(false)
async function onSave() {
  const s = currentStore.value
  if (!s) return
  if (saving.value) return
  saving.value = true
  try {
    const match = Number(form.value.match || 0)
    const persons = Number(form.value.persons || 0)
    const wifi = String(form.value.wifi || '')

    await updateDoc(doc(fbDb, 'stores', s.id), {
      match, persons, wifi,
      updatedAt: serverTimestamp(),
    })

    await setDoc(doc(fbDb, 'rooms_biz', s.id), {
      needRooms: match,
      needPeople: persons,
      need: persons,
      totalNeeded: persons,
      totalRooms: match,
      wifi,
      updatedAt: serverTimestamp(),
    }, { merge: true })

    alert('저장되었습니다.')
  } catch (e) {
    console.error(e)
    alert('저장 실패: ' + (e?.message || e))
  } finally {
    saving.value = false
  }
}

function fmtTime(v) {
  if (!v) return ''
  const ms = v?.toDate ? v.toDate().getTime()
           : (typeof v?.seconds === 'number' ? v.seconds * 1000 : Number(v) || 0)
  if (!ms) return ''
  const d = new Date(ms)
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
</script>

<style scoped>
.adm-page{ max-width:800px; margin:0 auto; }
.adm-page-head{ margin-bottom:18px; }
.adm-page-title{ margin:0; font-size:22px; font-weight:900; }
.adm-page-sub{ margin:4px 0 0; font-size:13px; color:#888; }

.adm-section{
  background:#fff; border:1px solid #f0f0f0; border-radius:14px;
  padding:24px; margin-bottom:14px;
}
.adm-section.empty-state{ text-align:center; }
.adm-empty{ color:#aaa; font-size:14px; margin:0; }

.adm-selector label{ display:flex; flex-direction:column; gap:6px; }
.adm-selector span{ font-size:12px; font-weight:700; color:#666; }
.adm-selector select{
  height:40px; padding:0 12px;
  border:1.5px solid #eee; border-radius:10px;
  font-size:14px; background:#fff;
}

.adm-section-head{
  display:flex; align-items:center; justify-content:space-between;
  gap:10px; margin-bottom:20px; flex-wrap:wrap;
}
.adm-section-head h3{ margin:0; font-size:18px; font-weight:900; }
.adm-store-meta-pill{
  font-size:12px; color:#888; background:#f5f5f5;
  padding:4px 10px; border-radius:999px;
}

.adm-metric-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:18px;
  margin-bottom:24px;
}
.adm-metric-box{
  display:flex; flex-direction:column; gap:10px;
}
.adm-metric-box label{
  font-size:13px; font-weight:700; color:#444;
}
.adm-metric-box:nth-child(3){
  grid-column:1 / -1;
}

.adm-counter{
  display:flex; gap:8px; align-items:center;
  background:#fff8fb;
  padding:10px;
  border-radius:12px;
}
.adm-counter-btn{
  width:48px; height:48px;
  border:none;
  background:#ff2e7e; color:#fff;
  border-radius:10px;
  font-size:24px; font-weight:900;
  cursor:pointer;
}
.adm-counter-btn:active{ transform:scale(.95); }
.adm-counter-input{
  flex:1;
  height:48px;
  text-align:center;
  font-size:28px; font-weight:900;
  border:1.5px solid #ffd6e4;
  background:#fff; color:#ff2e7e;
  border-radius:10px;
}
.adm-counter-input:focus{ outline:none; border-color:#ff2e7e; }

.adm-wifi-group{
  display:flex; gap:6px;
}
.adm-wifi-btn{
  flex:1;
  height:48px;
  border:1.5px solid #eee;
  background:#fff;
  color:#666;
  border-radius:10px;
  font-weight:700;
  cursor:pointer;
}
.adm-wifi-btn.active{
  background:#ff2e7e; border-color:#ff2e7e; color:#fff;
}

.adm-section-foot{
  display:flex; align-items:center; justify-content:space-between;
  flex-wrap:wrap; gap:10px;
  padding-top:10px;
  border-top:1px solid #f5f5f5;
}
.adm-last-time{ font-size:12px; color:#aaa; }
.adm-btn{
  height:46px; padding:0 28px;
  border:1px solid #eee; background:#fafafa; color:#333;
  border-radius:10px; font-weight:700; font-size:14px;
  cursor:pointer;
}
.adm-btn.primary{ background:#ff2e7e; border-color:#ff2e7e; color:#fff; }
.adm-btn.big{ height:50px; font-size:15px; }
.adm-btn:disabled{ opacity:.6; cursor:not-allowed; }

@media (max-width:600px){
  .adm-metric-grid{ grid-template-columns:1fr; }
  .adm-metric-box:nth-child(3){ grid-column:1; }
}

:root[data-theme="dark"] .adm-section,
:root[data-theme="black"] .adm-section{ background:#1c1c1c; border-color:#2a2a2a; color:#eee; }
:root[data-theme="dark"] .adm-counter,
:root[data-theme="black"] .adm-counter{ background:#2a1a22; }
:root[data-theme="dark"] .adm-counter-input,
:root[data-theme="black"] .adm-counter-input{ background:#222; border-color:#3a2027; color:#ff7fb8; }
:root[data-theme="dark"] .adm-wifi-btn,
:root[data-theme="black"] .adm-wifi-btn{ background:#222; border-color:#2a2a2a; color:#ddd; }
:root[data-theme="dark"] .adm-selector select,
:root[data-theme="black"] .adm-selector select{ background:#222; border-color:#2a2a2a; color:#eee; }
</style>
