<!--
  src/pages/admin/StoresManagePage.vue
  현황판 업소 관리 — 3개 탭:
    1) 노출 업소 관리 (exposure.gangtalk 토글 + homeOrder 드래그)
    2) 수동 지표 업데이트 (match / persons / wifi 일괄 편집)
    3) 업소 승인 대기 (applyStatus === 'pending' 승인/거절)
-->
<template>
  <div class="adm-page">
    <header class="adm-page-head">
      <h2 class="adm-page-title">🏢 현황판 업소 관리</h2>
    </header>

    <!-- 탭 -->
    <nav class="adm-tabs" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="adm-tab"
        :class="{ active: tab === t.key }"
        type="button"
        @click="tab = t.key"
      >
        {{ t.label }}
        <span v-if="t.count != null" class="adm-tab-count">{{ t.count }}</span>
      </button>
    </nav>

    <!-- ===== 탭 1: 노출 업소 관리 ===== -->
    <section v-show="tab === 'expose'" class="adm-section">
      <header class="adm-section-head">
        <h3>승인 업소 노출/순서</h3>
        <button class="adm-btn primary" type="button" :disabled="savingExpose" @click="saveExposeAndOrder">
          {{ savingExpose ? '저장 중…' : '저장' }}
        </button>
      </header>
      <p class="adm-hint">드래그 핸들(☰)을 잡고 위/아래로 옮겨 현황판 순서를 정렬하세요. 토글로 노출/숨김을 결정합니다.</p>

      <ul class="adm-store-list" v-if="approvedStores.length">
        <li
          v-for="(s, i) in orderedApproved"
          :key="s.id"
          class="adm-store-row"
          draggable="true"
          @dragstart="onDragStart(i, $event)"
          @dragover="onDragOver(i, $event)"
          @drop.prevent
          @dragend="onDragEnd"
        >
          <span class="adm-drag-handle" title="드래그로 이동">☰</span>
          <span class="adm-rank">{{ i + 1 }}</span>
          <div class="adm-store-meta">
            <strong>{{ s.name || '(이름 없음)' }}</strong>
            <span class="adm-store-sub">{{ s.region || '-' }} · {{ s.category || '-' }}</span>
          </div>
          <label class="adm-toggle">
            <input type="checkbox" :checked="isExposed(s)" @change="toggleExposed(s, $event.target.checked)" />
            <span class="adm-toggle-track"><span class="adm-toggle-thumb"></span></span>
            <span class="adm-toggle-label">{{ isExposed(s) ? '노출' : '숨김' }}</span>
          </label>
        </li>
      </ul>
      <p v-else class="adm-empty">승인된 업소가 없습니다.</p>
    </section>

    <!-- ===== 탭 2: 수동 지표 업데이트 ===== -->
    <section v-show="tab === 'metrics'" class="adm-section">
      <header class="adm-section-head">
        <h3>현황판 노출 업소 지표 (맞출방 / 필요인원 / 와이파이)</h3>
        <button class="adm-btn primary" type="button" :disabled="savingMetrics" @click="saveAllMetrics">
          {{ savingMetrics ? '저장 중…' : '일괄 저장' }}
        </button>
      </header>
      <p class="adm-hint">stores 와 rooms_biz 양쪽에 동기화됩니다.</p>

      <table class="adm-table" v-if="exposedStores.length">
        <thead>
          <tr>
            <th>업체명</th>
            <th>지역/카테고리</th>
            <th>맞출방</th>
            <th>필요인원</th>
            <th>와이파이</th>
            <th>최근 수정</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in exposedStores" :key="s.id">
            <td><strong>{{ s.name || '(이름 없음)' }}</strong></td>
            <td class="muted">{{ s.region || '-' }} / {{ s.category || '-' }}</td>
            <td><input class="adm-num-input" type="number" min="0" v-model.number="metricEdits[s.id].match" /></td>
            <td><input class="adm-num-input" type="number" min="0" v-model.number="metricEdits[s.id].persons" /></td>
            <td>
              <select class="adm-num-input" v-model="metricEdits[s.id].wifi">
                <option value="">-</option>
                <option value="O">O</option>
                <option value="X">X</option>
              </select>
            </td>
            <td class="muted">{{ fmtTime(s.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="adm-empty">노출 중인 업소가 없습니다.</p>
    </section>

    <!-- ===== 탭 3: 업소 승인 대기 ===== -->
    <section v-show="tab === 'pending'" class="adm-section">
      <header class="adm-section-head">
        <h3>업소 등록 신청 (pending)</h3>
      </header>

      <ul class="adm-store-list" v-if="pendingStores.length">
        <li v-for="s in pendingStores" :key="s.id" class="adm-store-row">
          <div class="adm-store-meta wide">
            <strong>{{ s.name || '(이름 없음)' }}</strong>
            <span class="adm-store-sub">{{ s.region || '-' }} · {{ s.category || '-' }}</span>
            <span class="adm-store-sub muted">신청자: {{ s.ownerEmail || s.ownerId || '-' }} · {{ fmtTime(s.createdAt) }}</span>
          </div>
          <div class="adm-row-actions">
            <button class="adm-btn primary" type="button" @click="approveStore(s)">승인</button>
            <button class="adm-btn ghost" type="button" @click="rejectStore(s)">거절</button>
          </div>
        </li>
      </ul>
      <p v-else class="adm-empty">대기 중인 신청이 없습니다.</p>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { db as fbDb } from '@/firebase'
import {
  collection, doc, onSnapshot, setDoc, updateDoc, getDoc,
  query, limit, serverTimestamp,
} from 'firebase/firestore'

const route = useRoute()
const tab = ref(['expose','metrics','pending'].includes(route.query.tab) ? route.query.tab : 'expose')

const stores = ref([])
const homeOrder = ref([])

let unsubStores = null
let unsubMarketing = null

onMounted(() => {
  unsubStores = onSnapshot(
    query(collection(fbDb, 'stores'), limit(500)),
    (snap) => {
      stores.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    },
  )
  unsubMarketing = onSnapshot(
    doc(fbDb, 'config', 'marketing'),
    (snap) => {
      const data = snap.exists() ? (snap.data() || {}) : {}
      homeOrder.value = Array.isArray(data.homeOrder) ? data.homeOrder.map(String) : []
    },
  )
})
onBeforeUnmount(() => {
  if (unsubStores) try { unsubStores() } catch {}
  if (unsubMarketing) try { unsubMarketing() } catch {}
})

/* ===== 분류 ===== */
const isApproved = (s) => {
  const a = String(s?.applyStatus || '').toLowerCase()
  if (s?.approved === true) return true
  return ['approved','승인','완료'].includes(a) || (s?.applyStatus === undefined && s?.approved === undefined)
}
const isPending = (s) => {
  const a = String(s?.applyStatus || '').toLowerCase()
  return ['pending','대기','waiting','신청','검토중'].includes(a)
}
const isExposed = (s) => {
  const exp = s?.exposure || {}
  return exp.gangtalk === undefined ? true : !!exp.gangtalk
}

const approvedStores = computed(() => stores.value.filter(isApproved))
const exposedStores = computed(() => approvedStores.value.filter(isExposed))
const pendingStores = computed(() => stores.value.filter(isPending))

const orderedApproved = computed(() => {
  const arr = approvedStores.value
  if (!homeOrder.value.length) return arr
  const pos = new Map(homeOrder.value.map((id,idx)=>[String(id), idx]))
  return arr.slice().sort((a,b)=>{
    const ai = pos.has(String(a.id)) ? pos.get(String(a.id)) : Infinity
    const bi = pos.has(String(b.id)) ? pos.get(String(b.id)) : Infinity
    return ai - bi
  })
})

const tabs = computed(() => [
  { key:'expose',  label:'노출 업소 관리', count: approvedStores.value.length },
  { key:'metrics', label:'수동 지표 업데이트', count: exposedStores.value.length },
  { key:'pending', label:'승인 대기', count: pendingStores.value.length },
])

/* ===== 탭 1: 노출 토글 + 순서 ===== */
const exposureEdits = ref({})    // { storeId: bool }
const savingExpose = ref(false)
const drag = ref({ from: -1 })

function toggleExposed(s, next){
  exposureEdits.value[s.id] = !!next
}

function effExposed(s){
  if (Object.prototype.hasOwnProperty.call(exposureEdits.value, s.id)) {
    return exposureEdits.value[s.id]
  }
  return isExposed(s)
}

function onDragStart(i, e){
  drag.value.from = i
  try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain','d') } catch {}
}
function onDragOver(i, e){
  e.preventDefault()
  const from = drag.value.from
  if (from < 0 || from === i) return
  const ids = orderedApproved.value.map(s => String(s.id))
  const seen = new Set(ids)
  const baseOrder = homeOrder.value.length
    ? homeOrder.value.filter(id => seen.has(String(id)))
    : ids.slice()
  for (const id of ids) {
    if (!baseOrder.includes(id)) baseOrder.push(id)
  }
  if (from < 0 || from >= baseOrder.length || i < 0 || i >= baseOrder.length) return
  const [moved] = baseOrder.splice(from, 1)
  baseOrder.splice(i, 0, moved)
  // 다른(non-approved) ID 는 뒤로 유지
  const others = homeOrder.value.filter(id => !seen.has(String(id)))
  homeOrder.value = [...baseOrder, ...others]
  drag.value.from = i
}
function onDragEnd(){ drag.value.from = -1 }

async function saveExposeAndOrder(){
  if (savingExpose.value) return
  savingExpose.value = true
  try {
    // 1) 노출 토글된 업소 → stores/{id} exposure.gangtalk 업데이트
    const edits = Object.entries(exposureEdits.value)
    for (const [id, val] of edits) {
      const cur = stores.value.find(s => s.id === id)
      if (!cur) continue
      if (isExposed(cur) === val) continue
      try {
        await updateDoc(doc(fbDb, 'stores', id), {
          [`exposure.gangtalk`]: !!val,
          updatedAt: serverTimestamp(),
        })
      } catch (e) { console.warn('exposure update fail', id, e) }
    }

    // 2) 순서 저장
    await setDoc(doc(fbDb, 'config', 'marketing'), {
      homeOrder: homeOrder.value.map(String),
      homeOrderSavedAt: serverTimestamp(),
    }, { merge: true })

    exposureEdits.value = {}
    alert('저장되었습니다.')
  } catch (e) {
    console.error(e)
    alert('저장 실패: ' + (e?.message || e))
  } finally {
    savingExpose.value = false
  }
}

/* ===== 탭 2: 수동 지표 ===== */
const metricEdits = ref({})
const savingMetrics = ref(false)

watch(exposedStores, (list) => {
  const next = { ...metricEdits.value }
  for (const s of list) {
    if (!next[s.id]) {
      next[s.id] = {
        match: Number(s.match || 0),
        persons: Number(s.persons || 0),
        wifi: String(s.wifi || ''),
      }
    }
  }
  metricEdits.value = next
}, { immediate: true })

async function saveAllMetrics(){
  if (savingMetrics.value) return
  savingMetrics.value = true
  let okCount = 0, failCount = 0
  try {
    for (const s of exposedStores.value) {
      const e = metricEdits.value[s.id]
      if (!e) continue
      const match = Number(e.match || 0)
      const persons = Number(e.persons || 0)
      const wifi = String(e.wifi || '')
      try {
        // stores 업데이트 (현황판 표시용)
        await updateDoc(doc(fbDb, 'stores', s.id), {
          match, persons, wifi,
          updatedAt: serverTimestamp(),
        })
        // rooms_biz 미러 (ChatBiz 와 동일 키 — store.id)
        await setDoc(doc(fbDb, 'rooms_biz', s.id), {
          needRooms: match,
          needPeople: persons,
          need: persons,
          totalNeeded: persons,
          totalRooms: match,
          wifi,
          updatedAt: serverTimestamp(),
        }, { merge: true })
        okCount++
      } catch (err) {
        console.warn('metric save fail', s.id, err)
        failCount++
      }
    }
    alert(`저장 완료: 성공 ${okCount} / 실패 ${failCount}`)
  } finally {
    savingMetrics.value = false
  }
}

/* ===== 탭 3: 승인/거절 ===== */
async function approveStore(s){
  if (!confirm(`'${s.name || s.id}' 을(를) 승인하시겠습니까?`)) return
  try {
    await updateDoc(doc(fbDb, 'stores', s.id), {
      approved: true,
      applyStatus: 'approved',
      [`exposure.gangtalk`]: true,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (e) {
    alert('승인 실패: ' + (e?.message || e))
  }
}
async function rejectStore(s){
  if (!confirm(`'${s.name || s.id}' 신청을 거절하시겠습니까?`)) return
  try {
    await updateDoc(doc(fbDb, 'stores', s.id), {
      approved: false,
      applyStatus: 'rejected',
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (e) {
    alert('거절 실패: ' + (e?.message || e))
  }
}

/* ===== 시간 포맷 ===== */
function fmtTime(v){
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
.adm-page-head{ margin-bottom:16px; }
.adm-page-title{ margin:0; font-size:22px; font-weight:900; }

.adm-tabs{
  display:flex; gap:6px; margin-bottom:14px;
  border-bottom:1px solid #eee;
  overflow-x:auto;
}
.adm-tab{
  background:transparent; border:none; cursor:pointer;
  padding:10px 14px; font-size:14px; font-weight:700;
  color:#666;
  border-bottom:2px solid transparent;
  white-space:nowrap;
  display:inline-flex; align-items:center; gap:6px;
}
.adm-tab.active{ color:#ff2e7e; border-bottom-color:#ff2e7e; }
.adm-tab-count{
  font-size:11px; padding:1px 6px; border-radius:999px;
  background:#ffe4ef; color:#ff2e7e; font-weight:800;
}
.adm-tab.active .adm-tab-count{ background:#ff2e7e; color:#fff; }

.adm-section{
  background:#fff;
  border:1px solid #f0f0f0;
  border-radius:14px;
  padding:16px 20px;
  margin-bottom:16px;
}
.adm-section-head{
  display:flex; align-items:center; justify-content:space-between;
  gap:10px;
  margin-bottom:10px;
}
.adm-section-head h3{ margin:0; font-size:15px; font-weight:800; }
.adm-hint{ font-size:12px; color:#888; margin:0 0 12px; }

.adm-btn{
  height:34px; padding:0 14px;
  border:1px solid #eee; background:#fafafa; color:#333;
  border-radius:10px; font-weight:700; font-size:13px;
  cursor:pointer;
}
.adm-btn.primary{
  background:#ff2e7e; border-color:#ff2e7e; color:#fff;
}
.adm-btn.primary:disabled{ opacity:.6; cursor:not-allowed; }
.adm-btn.ghost{ background:#fff; }

.adm-store-list{ list-style:none; margin:0; padding:0; }
.adm-store-row{
  display:flex; align-items:center; gap:12px;
  padding:12px 0;
  border-bottom:1px solid #f5f5f5;
}
.adm-store-row:last-child{ border-bottom:none; }
.adm-store-row[draggable="true"]{ cursor:grab; }
.adm-store-row[draggable="true"]:active{ cursor:grabbing; }

.adm-drag-handle{ color:#bbb; font-size:14px; cursor:grab; }
.adm-rank{
  width:28px; height:28px; border-radius:50%;
  background:#fff0f6; color:#ff2e7e;
  display:grid; place-items:center;
  font-weight:900; font-size:13px;
  flex:none;
}
.adm-store-meta{ flex:1; min-width:0; display:flex; flex-direction:column; }
.adm-store-meta.wide{ gap:2px; }
.adm-store-meta strong{ font-size:14px; font-weight:800; }
.adm-store-sub{ font-size:12px; color:#888; }
.adm-store-sub.muted{ color:#aaa; }

.adm-row-actions{ display:flex; gap:6px; flex:none; }

.adm-toggle{ display:inline-flex; align-items:center; gap:8px; cursor:pointer; }
.adm-toggle input{ display:none; }
.adm-toggle-track{
  width:36px; height:20px; border-radius:999px;
  background:#ddd; position:relative; transition:background .15s;
}
.adm-toggle-thumb{
  position:absolute; left:2px; top:2px;
  width:16px; height:16px; border-radius:50%; background:#fff;
  transition:left .15s;
  box-shadow:0 1px 3px rgba(0,0,0,.2);
}
.adm-toggle input:checked + .adm-toggle-track{ background:#ff2e7e; }
.adm-toggle input:checked + .adm-toggle-track .adm-toggle-thumb{ left:18px; }
.adm-toggle-label{ font-size:12px; color:#666; font-weight:700; min-width:32px; }

.adm-table{
  width:100%; border-collapse:collapse;
}
.adm-table th, .adm-table td{
  padding:10px 8px; text-align:left; font-size:13px;
  border-bottom:1px solid #f5f5f5;
}
.adm-table th{ font-weight:800; color:#666; background:#fafafa; font-size:12px; }
.adm-table td.muted{ color:#999; font-size:12px; }

.adm-num-input{
  width:80px; height:32px; padding:0 8px;
  border:1px solid #eee; border-radius:8px;
  font-size:13px; background:#fff;
}
.adm-num-input:focus{ outline:none; border-color:#ff2e7e; }

.adm-empty{ color:#aaa; font-size:13px; padding:20px 0; text-align:center; }

:root[data-theme="dark"] .adm-section,
:root[data-theme="black"] .adm-section{ background:#1c1c1c; border-color:#2a2a2a; }
:root[data-theme="dark"] .adm-store-row,
:root[data-theme="black"] .adm-store-row{ border-bottom-color:#2a2a2a; }
:root[data-theme="dark"] .adm-table th,
:root[data-theme="black"] .adm-table th{ background:#2a2a2a; }
:root[data-theme="dark"] .adm-table td,
:root[data-theme="black"] .adm-table td{ border-bottom-color:#2a2a2a; }
</style>
