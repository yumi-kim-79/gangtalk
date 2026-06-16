<!--
  src/pages/admin/BizDashboardPage.vue
  업체 로그인 후 첫 화면 — 본인 가게 요약 + 빠른 메뉴.
  본인 가게는 stores.ownerId === uid || stores.ownerEmail === email 로 찾는다.
-->
<template>
  <div class="adm-page">
    <header class="adm-page-head">
      <h2 class="adm-page-title">🏠 업체 대시보드</h2>
      <p class="adm-page-sub">{{ currentEmail || '비로그인' }}</p>
    </header>

    <!-- 본인 가게 없음 -->
    <section v-if="!loading && !myStores.length" class="adm-section empty-state">
      <p class="adm-empty">
        아직 연결된 가게가 없습니다.<br />
        관리자에게 가게 연결을 요청해 주세요.
      </p>
    </section>

    <!-- 본인 가게 카드들 -->
    <section v-else class="adm-store-grid">
      <article v-for="s in myStores" :key="s.id" class="adm-store-card">
        <header class="adm-store-card-head">
          <h3>{{ s.name || '(이름 없음)' }}</h3>
          <span class="adm-store-meta">{{ s.region || '-' }} · {{ s.category || '-' }}</span>
        </header>

        <div class="adm-store-metrics">
          <div class="adm-store-metric">
            <span class="adm-store-metric-label">맞출방</span>
            <strong class="adm-store-metric-value">{{ metricsByStore[s.id]?.needRooms ?? s.match ?? 0 }}</strong>
          </div>
          <div class="adm-store-metric">
            <span class="adm-store-metric-label">필요인원</span>
            <strong class="adm-store-metric-value">{{ metricsByStore[s.id]?.needPeople ?? s.persons ?? 0 }}</strong>
          </div>
          <div class="adm-store-metric">
            <span class="adm-store-metric-label">와이파이</span>
            <strong class="adm-store-metric-value">{{ metricsByStore[s.id]?.wifi || s.wifi || '-' }}</strong>
          </div>
        </div>

        <p class="adm-store-time">
          최근 업데이트: {{ fmtTime(metricsByStore[s.id]?.updatedAt || s.updatedAt) || '기록 없음' }}
        </p>

        <div class="adm-store-actions">
          <RouterLink :to="{ name: 'bizMetrics', query: { storeId: s.id } }" class="adm-btn primary">
            📊 현황판 업데이트 →
          </RouterLink>
          <RouterLink :to="{ name: 'bizMyStore', query: { storeId: s.id } }" class="adm-btn">
            🏢 업체 정보 수정 →
          </RouterLink>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db as fbDb } from '@/firebase'
import {
  collection, doc, onSnapshot, query, where,
} from 'firebase/firestore'

const currentEmail = ref('')
const currentUid = ref('')
const loading = ref(true)
const stores = ref([])
const metricsByStore = ref({})

let unsubAuth = null
let unsubStoresByUid = null
let unsubStoresByEmail = null
const unsubMetrics = new Map()

function startStoresWatch(uid, email) {
  // 이전 구독 해제
  if (unsubStoresByUid)  try { unsubStoresByUid()  } catch {}
  if (unsubStoresByEmail) try { unsubStoresByEmail() } catch {}
  unsubMetrics.forEach(fn => { try { fn() } catch {} })
  unsubMetrics.clear()
  stores.value = []
  metricsByStore.value = {}

  const merged = new Map() // storeId → store

  const onResult = () => {
    stores.value = Array.from(merged.values())
    // rooms_biz 구독은 stores 가 바뀔 때마다 정리
    const currentIds = new Set(stores.value.map(s => s.id))
    for (const [id, fn] of unsubMetrics) {
      if (!currentIds.has(id)) {
        try { fn() } catch {}
        unsubMetrics.delete(id)
        const m = { ...metricsByStore.value }
        delete m[id]
        metricsByStore.value = m
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
    loading.value = false
  }

  if (uid) {
    unsubStoresByUid = onSnapshot(
      query(collection(fbDb, 'stores'), where('ownerId', '==', uid)),
      (snap) => {
        for (const d of snap.docs) merged.set(d.id, { id: d.id, ...d.data() })
        onResult()
      },
      () => { loading.value = false },
    )
  }
  if (email) {
    unsubStoresByEmail = onSnapshot(
      query(collection(fbDb, 'stores'), where('ownerEmail', '==', email)),
      (snap) => {
        for (const d of snap.docs) merged.set(d.id, { id: d.id, ...d.data() })
        onResult()
      },
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
.adm-page{ max-width:1100px; margin:0 auto; }
.adm-page-head{ margin-bottom:18px; }
.adm-page-title{ margin:0; font-size:22px; font-weight:900; }
.adm-page-sub{ margin:4px 0 0; font-size:13px; color:#888; }

.adm-section{
  background:#fff; border:1px solid #f0f0f0; border-radius:14px;
  padding:24px 20px;
}
.adm-section.empty-state{ text-align:center; }
.adm-empty{ color:#aaa; font-size:14px; }

.adm-store-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));
  gap:14px;
}
.adm-store-card{
  background:#fff;
  border:1px solid #f0f0f0; border-radius:14px;
  padding:20px;
  box-shadow:0 2px 10px rgba(0,0,0,.04);
  display:flex; flex-direction:column; gap:14px;
}
.adm-store-card-head h3{
  margin:0 0 4px; font-size:17px; font-weight:900;
}
.adm-store-meta{ font-size:12px; color:#888; }

.adm-store-metrics{
  display:grid; grid-template-columns:1fr 1fr 1fr;
  gap:8px;
  background:#fff8fb;
  border-radius:10px;
  padding:14px;
}
.adm-store-metric{
  display:flex; flex-direction:column; gap:4px; text-align:center;
}
.adm-store-metric-label{
  font-size:11px; color:#888; font-weight:700;
}
.adm-store-metric-value{
  font-size:22px; font-weight:900; color:#ff2e7e;
}

.adm-store-time{
  margin:0; font-size:11px; color:#aaa; text-align:center;
}

.adm-store-actions{
  display:flex; flex-direction:column; gap:6px;
}
.adm-btn{
  display:inline-flex; align-items:center; justify-content:center;
  height:38px; padding:0 14px;
  border:1px solid #eee; background:#fafafa; color:#333;
  border-radius:10px; font-weight:700; font-size:13px;
  cursor:pointer; text-decoration:none; white-space:nowrap;
}
.adm-btn.primary{ background:#ff2e7e; border-color:#ff2e7e; color:#fff; }

:root[data-theme="dark"] .adm-section,
:root[data-theme="black"] .adm-section,
:root[data-theme="dark"] .adm-store-card,
:root[data-theme="black"] .adm-store-card{ background:#1c1c1c; border-color:#2a2a2a; color:#eee; }
:root[data-theme="dark"] .adm-store-metrics,
:root[data-theme="black"] .adm-store-metrics{ background:#2a1a22; }
</style>
