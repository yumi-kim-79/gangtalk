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
        <h3>승인 업소 노출/순서/기간</h3>
        <button class="adm-btn primary" type="button" :disabled="savingExpose" @click="saveExposeAndOrder">
          {{ savingExpose ? '저장 중…' : '저장' }}
        </button>
      </header>
      <p class="adm-hint">드래그(☰) 또는 위/아래 버튼으로 순서 변경 · 토글로 노출/숨김 · 15/30/60/90일 버튼으로 노출 기간 설정 (즉시 저장)</p>

      <ul ref="storeListRef" class="adm-store-list" v-if="approvedStores.length">
        <li
          v-for="(s, i) in orderedApproved"
          :key="s.id"
          class="adm-store-row period-row"
          :data-store-id="s.id"
        >
          <div class="adm-store-top">
            <span class="adm-drag-handle" title="드래그로 이동">☰</span>
            <span class="adm-rank">{{ i + 1 }}</span>
            <div class="adm-store-meta">
              <strong>{{ s.name || '(이름 없음)' }}</strong>
              <span class="adm-store-sub">{{ s.region || '-' }} · {{ s.category || '-' }}</span>
            </div>
            <label class="adm-toggle">
              <input type="checkbox" :checked="effExposed(s)" @change="toggleExposed(s, $event.target.checked)" />
              <span class="adm-toggle-track"><span class="adm-toggle-thumb"></span></span>
              <span class="adm-toggle-label">{{ effExposed(s) ? '노출' : '숨김' }}</span>
            </label>
          </div>

          <!-- 노출 기간 UI -->
          <div class="adm-period-row">
            <span class="adm-period-status" :class="periodClassOf(s)">{{ periodLabelOf(s) }}</span>
            <div class="adm-period-presets">
              <button type="button" class="adm-period-btn" @click="setPeriod(s, 15)" :disabled="periodBusy[s.id]">15일</button>
              <button type="button" class="adm-period-btn" @click="setPeriod(s, 30)" :disabled="periodBusy[s.id]">30일</button>
              <button type="button" class="adm-period-btn" @click="setPeriod(s, 60)" :disabled="periodBusy[s.id]">60일</button>
              <button type="button" class="adm-period-btn" @click="setPeriod(s, 90)" :disabled="periodBusy[s.id]">90일</button>
              <button type="button" class="adm-period-btn extend" @click="extendPeriod(s, 30)" :disabled="periodBusy[s.id] || !s.adEnd">+30일 연장</button>
              <button v-if="s.adStart || s.adEnd" type="button" class="adm-period-btn clear" @click="clearPeriod(s)" :disabled="periodBusy[s.id]">해제</button>
            </div>
          </div>
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

      <p class="adm-hint">
        💡 <strong>혼잡도</strong>는 맞출방/전체방 비율로 자동 계산됩니다
        (좋음 ≥0.6 · 보통 ≥0.3 · 나쁨 &lt;0.3). 수동 모드 선택 시 직접 지정 가능.
      </p>

      <div class="adm-table-wrap" v-if="exposedStores.length">
        <table class="adm-table">
          <thead>
            <tr>
              <th>업체명</th>
              <th>맞출방</th>
              <th>전체방</th>
              <th>필요인원</th>
              <th>최대인원</th>
              <th>혼잡도</th>
              <th>최근 수정</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in exposedStores" :key="s.id">
              <td>
                <strong>{{ s.name || '(이름 없음)' }}</strong>
                <span class="adm-cell-sub">{{ s.region || '-' }} / {{ s.category || '-' }}</span>
              </td>
              <td><input class="adm-num-input" type="number" min="0" v-model.number="metricEdits[s.id].match" /></td>
              <td><input class="adm-num-input" type="number" min="0" v-model.number="metricEdits[s.id].totalRooms" /></td>
              <td><input class="adm-num-input" type="number" min="0" v-model.number="metricEdits[s.id].persons" /></td>
              <td><input class="adm-num-input" type="number" min="0" v-model.number="metricEdits[s.id].maxPersons" /></td>
              <td>
                <div class="adm-status-cell">
                  <div class="adm-status-mode">
                    <label><input type="radio" :name="`mode-${s.id}`" value="auto" v-model="metricEdits[s.id].statusMode" /> 자동</label>
                    <label><input type="radio" :name="`mode-${s.id}`" value="manual" v-model="metricEdits[s.id].statusMode" /> 수동</label>
                  </div>
                  <template v-if="metricEdits[s.id].statusMode === 'manual'">
                    <select class="adm-num-input" v-model="metricEdits[s.id].status">
                      <option value="좋음">좋음</option>
                      <option value="보통">보통</option>
                      <option value="나쁨">나쁨</option>
                    </select>
                  </template>
                  <template v-else>
                    <span class="adm-status-badge" :class="statusBadgeClass(autoStatusOf(metricEdits[s.id].match, metricEdits[s.id].totalRooms))">
                      {{ autoStatusOf(metricEdits[s.id].match, metricEdits[s.id].totalRooms) }}
                    </span>
                  </template>
                </div>
              </td>
              <td class="muted">{{ fmtTime(s.updatedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
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
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import Sortable from 'sortablejs'
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

function toggleExposed(s, next){
  exposureEdits.value[s.id] = !!next
}

function effExposed(s){
  if (Object.prototype.hasOwnProperty.call(exposureEdits.value, s.id)) {
    return exposureEdits.value[s.id]
  }
  return isExposed(s)
}

function reorderApproved(fromIdx, toIdx){
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
  const displayIds = orderedApproved.value.map(s => String(s.id))
  if (fromIdx >= displayIds.length || toIdx >= displayIds.length) return
  const [moved] = displayIds.splice(fromIdx, 1)
  displayIds.splice(toIdx, 0, moved)
  // 현재 카테고리(승인)에 속하지 않는 잔존 ID 는 뒤로 유지
  const approvedIdSet = new Set(approvedStores.value.map(s => String(s.id)))
  const others = homeOrder.value.filter(id => !approvedIdSet.has(String(id)))
  homeOrder.value = [...displayIds, ...others]
}

/* === SortableJS (PC/모바일 공용) === */
const storeListRef = ref(null)
let sortableInst = null
function initSortable(el){
  if (!el) return
  if (sortableInst) { sortableInst.destroy(); sortableInst = null }
  sortableInst = Sortable.create(el, {
    handle: '.adm-drag-handle',
    animation: 150,
    ghostClass: 'adm-drag-ghost',
    onEnd(evt){
      const { oldIndex, newIndex } = evt
      if (oldIndex === newIndex || oldIndex == null || newIndex == null) return
      // SortableJS DOM 이동을 되돌리고 reactive 로만 반영 → Vue 가 일관되게 렌더
      const list = evt.from
      list.insertBefore(evt.item, list.children[oldIndex])
      reorderApproved(oldIndex, newIndex)
    },
  })
}
watch(storeListRef, (el) => { if (el) initSortable(el) })

onMounted(async () => {
  await nextTick()
  if (storeListRef.value) initSortable(storeListRef.value)
})
onBeforeUnmount(() => { if (sortableInst) sortableInst.destroy() })

/* === 노출 기간 (adStart / adEnd, ms) — 즉시 저장 === */
const periodBusy = ref({})
const DAY_MS = 86400000

function periodLabelOf(s){
  if (!s?.adStart && !s?.adEnd) return '기간 미설정 (무기한)'
  const now = Date.now()
  const end = Number(s.adEnd || 0)
  if (!end) return '시작일만 설정'
  if (now >= end) return '만료'
  const diff = end - now
  const days = Math.ceil(diff / DAY_MS)
  return `D-${days}` + (days <= 7 ? ' (만료 임박)' : '')
}
function periodClassOf(s){
  if (!s?.adStart && !s?.adEnd) return 'none'
  const now = Date.now()
  const end = Number(s.adEnd || 0)
  if (end && now >= end) return 'expired'
  if (end && end - now <= 7 * DAY_MS) return 'warning'
  return 'ok'
}
async function setPeriod(s, days){
  if (periodBusy.value[s.id]) return
  if (!confirm(`'${s.name || '(이름 없음)'}' 노출 기간을 ${days}일로 설정하시겠습니까?`)) return
  periodBusy.value = { ...periodBusy.value, [s.id]: true }
  try {
    const now = Date.now()
    const end = now + days * DAY_MS
    await updateDoc(doc(fbDb, 'stores', s.id), {
      adStart: now, adEnd: end, updatedAt: serverTimestamp(),
    })
  } catch (e) {
    alert('기간 설정 실패: ' + (e?.message || e))
  } finally {
    periodBusy.value = { ...periodBusy.value, [s.id]: false }
  }
}
async function extendPeriod(s, days){
  if (periodBusy.value[s.id]) return
  const cur = Number(s.adEnd || Date.now())
  const newEnd = cur + days * DAY_MS
  periodBusy.value = { ...periodBusy.value, [s.id]: true }
  try {
    await updateDoc(doc(fbDb, 'stores', s.id), {
      adEnd: newEnd, updatedAt: serverTimestamp(),
    })
  } catch (e) {
    alert('기간 연장 실패: ' + (e?.message || e))
  } finally {
    periodBusy.value = { ...periodBusy.value, [s.id]: false }
  }
}
async function clearPeriod(s){
  if (periodBusy.value[s.id]) return
  if (!confirm('노출 기간을 해제하시겠습니까? (무기한 노출로 전환)')) return
  periodBusy.value = { ...periodBusy.value, [s.id]: true }
  try {
    await updateDoc(doc(fbDb, 'stores', s.id), {
      adStart: null, adEnd: null, updatedAt: serverTimestamp(),
    })
  } catch (e) {
    alert('기간 해제 실패: ' + (e?.message || e))
  } finally {
    periodBusy.value = { ...periodBusy.value, [s.id]: false }
  }
}

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
        totalRooms: Number(s.totalRooms || 0),
        maxPersons: Number(s.maxPersons || 0),
        statusMode: String(s.statusMode || 'auto'),
        status: String(s.status || '좋음'),
      }
    }
  }
  metricEdits.value = next
}, { immediate: true })

/* 자동 혼잡도 계산 (admin Tab2 미리보기 + saveAllMetrics 자동 모드 저장값) */
function autoStatusOf(match, totalRooms){
  const m = Number(match || 0)
  const t = Number(totalRooms || 0)
  if (!t || t <= 0) return '-'
  const ratio = m / t
  if (ratio >= 0.6) return '좋음'
  if (ratio >= 0.3) return '보통'
  return '나쁨'
}
function statusBadgeClass(label){
  if (label === '좋음') return 'good'
  if (label === '보통') return 'mid'
  if (label === '나쁨') return 'bad'
  return ''
}

async function saveAllMetrics(){
  if (savingMetrics.value) return
  savingMetrics.value = true
  let okCount = 0, failCount = 0
  const errors = []
  try {
    for (const s of exposedStores.value) {
      const e = metricEdits.value[s.id]
      if (!e) continue
      const match      = Number(e.match || 0)
      const persons    = Number(e.persons || 0)
      const totalRooms = Number(e.totalRooms || 0)
      const maxPersons = Number(e.maxPersons || 0)
      const statusMode = String(e.statusMode || 'auto')
      const status     = statusMode === 'manual'
        ? String(e.status || '좋음')
        : autoStatusOf(match, totalRooms)

      try {
        // stores 업데이트 (현황판 표시용)
        await updateDoc(doc(fbDb, 'stores', s.id), {
          match, persons, totalRooms, maxPersons,
          statusMode, status,
          updatedAt: serverTimestamp(),
        })
        // rooms_biz 미러 (ChatBiz 와 동일 키 — store.id)
        await setDoc(doc(fbDb, 'rooms_biz', s.id), {
          needRooms: match,
          needPeople: persons,
          need: persons,
          totalNeeded: persons,
          totalRooms,
          updatedAt: serverTimestamp(),
        }, { merge: true })
        okCount++
      } catch (err) {
        console.warn('metric save fail', s.id, err)
        errors.push(`${s.name || s.id}: ${err?.code || err?.message || err}`)
        failCount++
      }
    }
    if (failCount > 0) {
      alert(`저장 완료: 성공 ${okCount} / 실패 ${failCount}\n\n실패 사유:\n${errors.slice(0,3).join('\n')}`)
    } else {
      alert(`저장 완료: ${okCount}건`)
    }
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

/* Tab 1: 노출 업소 카드 — 위/아래 2단 레이아웃 */
.adm-store-row.period-row{ flex-direction:column; align-items:stretch; gap:8px; }
.adm-store-top{ display:flex; align-items:center; gap:12px; }

.adm-move-btns{ display:flex; flex-direction:column; gap:2px; flex:none; }
.adm-move-btn{
  width:28px; height:18px;
  border:1px solid #eee; background:#fff; color:#888;
  border-radius:4px; cursor:pointer;
  font-size:10px; line-height:1; padding:0;
}
.adm-move-btn:disabled{ opacity:.3; cursor:not-allowed; }
.adm-move-btn:active:not(:disabled){ background:#ffe4ef; color:#ff2e7e; }

/* 노출 기간 UI */
.adm-period-row{
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  padding:8px 0 0 40px;
  border-top:1px dashed #f0f0f0;
}
.adm-period-status{
  font-size:11px; font-weight:800;
  padding:3px 9px; border-radius:999px;
  background:#f5f5f5; color:#888;
}
.adm-period-status.ok{ background:#e9f7ef; color:#21c36b; }
.adm-period-status.warning{ background:#fff3e0; color:#f2a100; }
.adm-period-status.expired{ background:#ffeaea; color:#ff4d4d; }
.adm-period-status.none{ background:#f5f5f5; color:#888; }

.adm-period-presets{ display:flex; gap:4px; flex-wrap:wrap; }
.adm-period-btn{
  height:24px; padding:0 10px;
  border:1px solid #eee; background:#fff; color:#666;
  border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;
}
.adm-period-btn:hover:not(:disabled){ background:#ffe4ef; color:#ff2e7e; }
.adm-period-btn:disabled{ opacity:.5; cursor:not-allowed; }
.adm-period-btn.extend{ background:#fff8fb; color:#ff2e7e; border-color:#ffd6e4; }
.adm-period-btn.clear{ color:#aaa; }

/* Tab 2: 혼잡도 셀 */
.adm-cell-sub{ display:block; font-size:11px; color:#aaa; margin-top:2px; }
.adm-status-cell{ display:flex; flex-direction:column; gap:4px; min-width:120px; }
.adm-status-mode{ display:flex; gap:8px; font-size:11px; color:#666; }
.adm-status-mode label{ cursor:pointer; }
.adm-status-mode input{ margin-right:2px; }
.adm-status-badge{
  display:inline-block; padding:3px 10px; border-radius:999px;
  font-size:11px; font-weight:800;
  background:#f5f5f5; color:#888; text-align:center;
}
.adm-status-badge.good{ background:#e9f7ef; color:#21c36b; }
.adm-status-badge.mid{ background:#fff3e0; color:#f2a100; }
.adm-status-badge.bad{ background:#ffeaea; color:#ff4d4d; }

.adm-empty{ color:#aaa; font-size:13px; padding:20px 0; text-align:center; }

/* 모바일 보강 */
@media (max-width:768px){
  .adm-store-top{ flex-wrap:wrap; gap:8px; }
  .adm-store-meta{ width:100%; order:3; }
  .adm-period-row{ padding-left:0; }
  .adm-period-presets{ width:100%; }
  .adm-period-btn{ flex:1; min-width:60px; height:34px; }
  .adm-status-mode{ font-size:12px; gap:6px; }
}

:root[data-theme="dark"] .adm-section,
:root[data-theme="black"] .adm-section{ background:#1c1c1c; border-color:#2a2a2a; }
:root[data-theme="dark"] .adm-store-row,
:root[data-theme="black"] .adm-store-row{ border-bottom-color:#2a2a2a; }
:root[data-theme="dark"] .adm-table th,
:root[data-theme="black"] .adm-table th{ background:#2a2a2a; }
:root[data-theme="dark"] .adm-table td,
:root[data-theme="black"] .adm-table td{ border-bottom-color:#2a2a2a; }
</style>
