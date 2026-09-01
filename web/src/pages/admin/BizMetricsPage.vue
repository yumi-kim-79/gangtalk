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
      <p class="adm-page-sub">입력하면 강남톡방 현황판에 즉시 반영됩니다.</p>
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

    <!-- 업체 카드 — 초톡 붙여넣기 + 지표를 한 화면에 -->
    <section v-else-if="currentStore" class="adm-section">
      <header class="adm-section-head">
        <h3>{{ currentStore.name }}</h3>
        <span class="adm-store-meta-pill">{{ currentStore.region || '-' }} · {{ currentStore.category || '-' }}</span>
      </header>

      <!-- 초톡 붙여넣기 -->
      <div class="adm-chotok">
        <div class="adm-chotok-head">
          <b>💬 초톡 붙여넣기</b>
          <span>카톡 방 목록을 그대로 붙여넣으면 자동 계산됩니다</span>
        </div>

        <textarea
          v-model="chotokText"
          class="adm-chotok-ta"
          rows="3"
          placeholder="예) 1번방 2명 / 2번방 3명 / 5번방 1명"
        ></textarea>

        <div class="adm-chotok-foot">
          <div class="adm-chotok-preview">
            <template v-if="chotokText.trim()">
              <span>맞출방 <b>{{ chotokParsed.roomCount }}</b></span>
              <span class="sep">·</span>
              <span>필요인원 <b>{{ chotokParsed.needSum }}</b></span>
              <span class="sep">·</span>
              <span>혼잡도 <b>{{ chotokAutoStatus }}</b></span>
            </template>
            <span v-else class="adm-chotok-idle">붙여넣으면 앱 초톡방에도 그대로 올라갑니다</span>
          </div>
          <button
            class="adm-btn primary"
            type="button"
            :disabled="chotokSaving || !chotokParsed.roomCount"
            @click="onChotokApply"
          >{{ chotokSaving ? '반영 중…' : '초톡 반영' }}</button>
        </div>
      </div>

      <div class="adm-divider"><span>또는 직접 입력</span></div>

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

        <!-- 전체방 (혼잡도 자동 계산에 사용) -->
        <div class="adm-metric-box">
          <label>전체방 (선택)</label>
          <div class="adm-counter">
            <button type="button" class="adm-counter-btn" @click="dec('totalRooms')">−</button>
            <input
              v-model.number="form.totalRooms"
              type="number"
              min="0"
              class="adm-counter-input"
            />
            <button type="button" class="adm-counter-btn" @click="inc('totalRooms')">+</button>
          </div>
          <p class="adm-metric-hint">혼잡도 자동 계산 기준</p>
        </div>

        <!-- 혼잡도 (자동/수동) -->
        <div class="adm-metric-box adm-metric-status">
          <label>혼잡도</label>
          <div class="adm-status-mode">
            <label><input type="radio" v-model="form.statusMode" value="auto" /> 자동 계산</label>
            <label><input type="radio" v-model="form.statusMode" value="manual" /> 수동 입력</label>
          </div>
          <div v-if="form.statusMode === 'manual'" class="adm-status-group">
            <button
              type="button"
              class="adm-status-btn"
              :class="{ active: form.status === '좋음', good: form.status === '좋음' }"
              @click="form.status = '좋음'"
            >좋음</button>
            <button
              type="button"
              class="adm-status-btn"
              :class="{ active: form.status === '보통', mid: form.status === '보통' }"
              @click="form.status = '보통'"
            >보통</button>
            <button
              type="button"
              class="adm-status-btn"
              :class="{ active: form.status === '나쁨', bad: form.status === '나쁨' }"
              @click="form.status = '나쁨'"
            >나쁨</button>
          </div>
          <div v-else class="adm-status-preview">
            <span class="adm-status-badge" :class="statusBadgeClass(autoStatusOf(form.match, form.totalRooms))">
              {{ autoStatusOf(form.match, form.totalRooms) }}
            </span>
            <span class="adm-metric-hint">전체방 대비 맞출방 비율</span>
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
  addDoc, collection, doc, onSnapshot, setDoc, updateDoc,
  writeBatch, query, where, serverTimestamp,
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
const form = ref({
  match: 0, persons: 0, totalRooms: 0,
  statusMode: 'auto', status: '좋음',
})

watch([currentStore, currentMetrics], () => {
  const s = currentStore.value || {}
  const m = currentMetrics.value || {}
  form.value = {
    match:      Number(m.needRooms ?? s.match ?? 0),
    persons:    Number(m.needPeople ?? s.persons ?? 0),
    totalRooms: Number(m.totalRooms ?? s.totalRooms ?? 0),
    statusMode: String(s.statusMode || 'auto'),
    status:     String(s.status || '좋음'),
  }
}, { immediate: true })

function inc(key) {
  form.value[key] = Math.max(0, Number(form.value[key] || 0) + 1)
}
function dec(key) {
  form.value[key] = Math.max(0, Number(form.value[key] || 0) - 1)
}

/* === 혼잡도 자동 계산 (StoresManagePage 와 동일 로직) === */
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

/* ===== 초톡 붙여넣기 → 자동 파싱 =====
 * ChatBiz.vue 의 parsePasted 와 **동일 규칙**이어야 한다.
 *   - 줄이 숫자(방번호)로 시작하면 맞출방 1개
 *   - 그 뒤 처음 나오는 1~2자리 숫자를 필요인원으로 합산
 * 반영 시 하는 일:
 *   1) stores/{id}.match/persons/status  — 현황판 수치
 *   2) rooms_biz/{id} 미러 + 원문(lastPastedTextRaw) 보관
 *   3) rooms_biz/{id}/rooms/{id}_room_01/messages 에 원문 1건 추가 → 앱 초톡방에 표시
 */
const chotokText = ref('')
const chotokSaving = ref(false)

function parsePasted(text) {
  const lines = String(text || '').split(/\r?\n/)
  let roomCount = 0
  let needSum = 0
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const m1 = line.match(/^\s*(\d{1,4})\b/)
    if (!m1) continue
    roomCount += 1
    const m2 = line.slice(m1[0].length).match(/(\d{1,2})/)
    if (m2) {
      const n = Number.parseInt(m2[1], 10)
      if (!Number.isNaN(n)) needSum += n
    }
  }
  return { roomCount, needSum }
}

const chotokParsed = computed(() => parsePasted(chotokText.value))
const chotokAutoStatus = computed(() =>
  autoStatusOf(chotokParsed.value.roomCount, form.value.totalRooms),
)

/* 가게를 바꾸면 입력 중이던 초톡 내용은 비운다 */
watch(selectedStoreId, () => { chotokText.value = '' })

async function onChotokApply() {
  const s = currentStore.value
  if (!s || chotokSaving.value) return

  const text = String(chotokText.value || '').replace(/\r\n/g, '\n')
  const { roomCount, needSum } = chotokParsed.value
  if (!roomCount) {
    alert('붙여넣은 내용에서 방 번호를 찾지 못했습니다.\n숫자로 시작하는 줄이 있어야 합니다.')
    return
  }

  chotokSaving.value = true
  try {
    // 전체방은 업체가 직접 넣는 값이라 덮어쓰지 않는다 (혼잡도 계산 기준)
    const totalRooms = Number(form.value.totalRooms || 0)
    const statusMode = String(form.value.statusMode || 'auto')
    const status = statusMode === 'manual'
      ? String(form.value.status || '좋음')
      : autoStatusOf(roomCount, totalRooms)
    const now = serverTimestamp()

    const batch = writeBatch(fbDb)
    batch.update(doc(fbDb, 'stores', s.id), {
      match: roomCount,
      persons: needSum,
      statusMode, status,
      updatedAt: now,
    })
    batch.set(doc(fbDb, 'rooms_biz', s.id), {
      needRooms: roomCount,
      needPeople: needSum,
      need: needSum,
      totalNeeded: needSum,
      manualSaved: true,
      manualSavedAt: now,
      lastPastedText: text.slice(0, 2000),
      lastPastedTextRaw: text.slice(0, 2000),
      lastPastedAt: now,
      updatedAt: now,
    }, { merge: true })
    await batch.commit()

    // 앱 초톡방에 원문 게시 (실패해도 수치 반영은 이미 끝난 상태)
    try {
      await addDoc(
        collection(fbDb, 'rooms_biz', s.id, 'rooms', `${s.id}_room_01`, 'messages'),
        {
          text,
          author: s.name || '업체',
          authorUid: currentUid.value,
          kind: 'paste',
          createdAt: now,
          updatedAt: now,
        },
      )
    } catch (e) {
      console.warn('[chotok] 초톡방 게시 실패:', e)
      alert('현황판 수치는 반영됐지만 초톡방 게시에 실패했습니다.\n(' + (e?.message || e) + ')')
      chotokText.value = ''
      return
    }

    // 폼도 즉시 맞춰 둔다
    form.value.match = roomCount
    form.value.persons = needSum
    chotokText.value = ''
    alert(`반영되었습니다.\n맞출방 ${roomCount} · 필요인원 ${needSum}`)
  } catch (e) {
    console.error(e)
    alert('반영 실패: ' + (e?.message || e))
  } finally {
    chotokSaving.value = false
  }
}

/* ===== 저장 — stores + rooms_biz 양쪽 동기 (원자성 보장) ===== */
const saving = ref(false)
async function onSave() {
  const s = currentStore.value
  if (!s) return
  if (saving.value) return
  saving.value = true
  try {
    const match      = Number(form.value.match || 0)
    const persons    = Number(form.value.persons || 0)
    const totalRooms = Number(form.value.totalRooms || 0)
    const statusMode = String(form.value.statusMode || 'auto')
    const status     = statusMode === 'manual'
      ? String(form.value.status || '좋음')
      : autoStatusOf(match, totalRooms)
    const now = serverTimestamp()

    // writeBatch 로 두 write 를 함께 commit. 부분 실패 불가.
    // manualSaved=true 로 자동파싱(ChatBiz/pastedText)보다 우선임을 명시.
    const batch = writeBatch(fbDb)
    batch.update(doc(fbDb, 'stores', s.id), {
      match, persons, totalRooms,
      statusMode, status,
      updatedAt: now,
    })
    batch.set(doc(fbDb, 'rooms_biz', s.id), {
      needRooms: match,
      needPeople: persons,
      need: persons,
      totalNeeded: persons,
      totalRooms,
      manualSaved: true,
      manualSavedAt: now,
      updatedAt: now,
    }, { merge: true })
    await batch.commit()

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
/* 2026-09-01: 모바일 한 화면에 들어오도록 전체 밀도 축소 + 카드 1개로 통합 */
.adm-page{ max-width:720px; margin:0 auto; }
.adm-page-head{ margin-bottom:12px; }
.adm-page-title{ margin:0; font-size:19px; font-weight:900; }
.adm-page-sub{ margin:3px 0 0; font-size:12px; color:#999; }

.adm-section{
  background:#fff; border:1px solid #f0f0f0; border-radius:14px;
  padding:16px; margin-bottom:10px;
}
.adm-section.empty-state{ text-align:center; }
.adm-empty{ color:#aaa; font-size:14px; margin:0; }

.adm-selector label{ display:flex; align-items:center; gap:10px; }
.adm-selector span{ font-size:12px; font-weight:700; color:#666; flex:none; }
.adm-selector select{
  flex:1; height:38px; padding:0 10px;
  border:1.5px solid #eee; border-radius:10px;
  font-size:14px; background:#fff;
}

.adm-section-head{
  display:flex; align-items:center; justify-content:space-between;
  gap:8px; margin-bottom:12px; flex-wrap:wrap;
}
.adm-section-head h3{ margin:0; font-size:17px; font-weight:900; }
.adm-store-meta-pill{
  font-size:11px; color:#888; background:#f5f5f5;
  padding:3px 9px; border-radius:999px;
}

/* ── 초톡 붙여넣기 ── */
.adm-chotok{
  background:#fff8fb; border:1px solid #ffe0ec;
  border-radius:12px; padding:12px;
}
.adm-chotok-head{ display:flex; flex-direction:column; gap:2px; margin-bottom:8px; }
.adm-chotok-head b{ font-size:14px; font-weight:800; color:#333; }
.adm-chotok-head span{ font-size:11px; color:#a08; opacity:.7; }
.adm-chotok-ta{
  width:100%; box-sizing:border-box; display:block;
  padding:10px 12px; border:1px solid #f0d3e0; border-radius:10px;
  font-size:14px; line-height:1.5; resize:vertical; font-family:inherit;
  background:#fff;
}
.adm-chotok-ta:focus{ outline:none; border-color:#ff2e7e; }
.adm-chotok-foot{
  display:flex; align-items:center; justify-content:space-between;
  gap:10px; margin-top:10px;
}
.adm-chotok-preview{
  flex:1; min-width:0;
  font-size:13px; color:#555;
  display:flex; gap:5px; align-items:center; flex-wrap:wrap;
}
.adm-chotok-preview b{ color:#ff2e7e; font-size:15px; }
.adm-chotok-preview .sep{ color:#e6c9d6; }
.adm-chotok-idle{ font-size:11px; color:#b9a2ad; }

/* 구분선 */
.adm-divider{
  display:flex; align-items:center; gap:10px;
  margin:14px 0 12px; color:#c9c9c9; font-size:11px;
}
.adm-divider::before, .adm-divider::after{
  content:''; flex:1; height:1px; background:#f0f0f0;
}

/* ── 지표 ── */
.adm-metric-grid{
  display:grid; grid-template-columns:1fr 1fr;
  gap:12px; margin-bottom:14px;
}
.adm-metric-box{ display:flex; flex-direction:column; gap:6px; min-width:0; }
.adm-metric-box label{ font-size:12px; font-weight:700; color:#555; }
/* 전체방 · 혼잡도는 한 줄 전체 */
.adm-metric-box:nth-child(3),
.adm-metric-box:nth-child(4){ grid-column:1 / -1; }

.adm-counter{
  display:flex; gap:6px; align-items:center;
  background:#fafafa; padding:5px; border-radius:10px;
}
.adm-counter-btn{
  flex:none; width:36px; height:36px;
  border:none; background:#ff2e7e; color:#fff;
  border-radius:8px; font-size:18px; font-weight:900;
  line-height:1; cursor:pointer;
}
.adm-counter-btn:active{ transform:scale(.94); }
.adm-counter-input{
  flex:1; min-width:0; width:100%;
  height:36px; text-align:center;
  font-size:19px; font-weight:900;
  border:1.5px solid #ffd6e4; background:#fff; color:#ff2e7e;
  border-radius:8px;
  -moz-appearance:textfield;
}
.adm-counter-input::-webkit-outer-spin-button,
.adm-counter-input::-webkit-inner-spin-button{ -webkit-appearance:none; margin:0; }
.adm-counter-input:focus{ outline:none; border-color:#ff2e7e; }

.adm-metric-hint{ margin:4px 0 0; font-size:11px; color:#999; }

.adm-status-mode{
  display:flex; gap:12px; font-size:12px; color:#555; margin-bottom:6px;
}
.adm-status-mode label{ cursor:pointer; display:inline-flex; align-items:center; gap:4px; }

.adm-status-group{ display:flex; gap:6px; }
.adm-status-btn{
  flex:1; height:38px;
  border:1.5px solid #eee; background:#fff; color:#666;
  border-radius:9px; font-weight:700; font-size:13px; cursor:pointer;
}
.adm-status-btn.active.good{ background:#21c36b; border-color:#21c36b; color:#fff; }
.adm-status-btn.active.mid{  background:#f2a100; border-color:#f2a100; color:#fff; }
.adm-status-btn.active.bad{  background:#ff4d4d; border-color:#ff4d4d; color:#fff; }

.adm-status-preview{
  display:flex; align-items:center; gap:8px;
  padding:7px 10px; background:#fafafa; border-radius:9px;
}
.adm-status-badge{
  display:inline-block; padding:3px 12px; border-radius:999px;
  font-size:13px; font-weight:800; background:#f5f5f5; color:#888;
}
.adm-status-badge.good{ background:#e9f7ef; color:#21c36b; }
.adm-status-badge.mid{ background:#fff3e0; color:#f2a100; }
.adm-status-badge.bad{ background:#ffeaea; color:#ff4d4d; }

.adm-section-foot{
  display:flex; align-items:center; justify-content:space-between;
  flex-wrap:wrap; gap:8px;
  padding-top:10px; border-top:1px solid #f5f5f5;
}
.adm-last-time{ font-size:11px; color:#bbb; }
.adm-btn{
  height:40px; padding:0 18px;
  border:1px solid #eee; background:#fafafa; color:#333;
  border-radius:9px; font-weight:700; font-size:13px;
  white-space:nowrap; cursor:pointer;
}
.adm-btn.primary{ background:#ff2e7e; border-color:#ff2e7e; color:#fff; }
.adm-btn.big{ height:44px; padding:0 24px; font-size:14px; }
.adm-btn:disabled{ opacity:.5; cursor:not-allowed; }

/* ── 모바일 ── */
@media (max-width:480px){
  .adm-page-title{ font-size:17px; }
  .adm-section{ padding:12px; border-radius:12px; }
  .adm-section-head{ margin-bottom:10px; }
  .adm-section-head h3{ font-size:15px; }
  .adm-metric-grid{ gap:10px; margin-bottom:12px; }
  .adm-counter-btn{ width:32px; height:32px; font-size:17px; }
  .adm-counter-input{ height:32px; font-size:17px; }
  .adm-chotok-foot{ flex-wrap:wrap; }
  .adm-chotok-preview{ flex-basis:100%; }
  .adm-chotok-foot .adm-btn{ width:100%; }
  .adm-section-foot .adm-btn{ flex:1; }
}

/* ── 다크 ── */
:root[data-theme="dark"] .adm-section,
:root[data-theme="black"] .adm-section{ background:#1c1c1c; border-color:#2a2a2a; color:#eee; }
:root[data-theme="dark"] .adm-chotok,
:root[data-theme="black"] .adm-chotok{ background:#241a1f; border-color:#3a2027; }
:root[data-theme="dark"] .adm-chotok-ta,
:root[data-theme="black"] .adm-chotok-ta{ background:#181818; border-color:#3a2027; color:#eee; }
:root[data-theme="dark"] .adm-counter,
:root[data-theme="black"] .adm-counter{ background:#242424; }
:root[data-theme="dark"] .adm-counter-input,
:root[data-theme="black"] .adm-counter-input{ background:#181818; border-color:#3a2027; color:#ff7fb8; }
:root[data-theme="dark"] .adm-status-preview,
:root[data-theme="black"] .adm-status-preview{ background:#242424; }
:root[data-theme="dark"] .adm-selector select,
:root[data-theme="black"] .adm-selector select{ background:#222; border-color:#2a2a2a; color:#eee; }
:root[data-theme="dark"] .adm-divider::before,
:root[data-theme="dark"] .adm-divider::after,
:root[data-theme="black"] .adm-divider::before,
:root[data-theme="black"] .adm-divider::after{ background:#2a2a2a; }
</style>
