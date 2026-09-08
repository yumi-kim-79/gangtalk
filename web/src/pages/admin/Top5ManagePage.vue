<!--
  src/pages/admin/Top5ManagePage.vue
  가게찾기 노출 관리 — Top5 순위 / 목록 순서 / 실시간 순위 세 가지를 한 화면에서.
  Firestore: config/marketing
    topRanks   { catKey: [storeId] }   카테고리별 Top5
    listOrders { catKey: [storeId] }   목록 정렬 (사용자 StoreFinder / 앱이 읽는다)
    hotRanks   [storeId]               실시간 순위 (비우면 찜 수 자동 계산)
-->
<template>
  <div class="adm-page">
    <header class="adm-page-head">
      <h2 class="adm-page-title">🏆 가게찾기 노출 관리</h2>
      <p class="adm-page-sub">
        Top5 순위 · 목록 순서 · 실시간 순위를 직접 지정합니다. (config/marketing)
      </p>
    </header>

    <!-- 무엇을 편집할지 -->
    <nav class="adm-mode-tabs" role="tablist">
      <button
        v-for="m in MODES"
        :key="m.key"
        class="adm-mode-tab"
        :class="{ active: mode === m.key }"
        type="button"
        @click="mode = m.key"
      >{{ m.label }}</button>
    </nav>
    <p class="adm-hint">{{ MODES.find(m => m.key === mode)?.desc }}</p>

    <!-- 카테고리 탭 (실시간 순위는 카테고리 구분이 없다) -->
    <nav class="adm-cat-tabs" v-if="mode !== 'hot'">
      <button
        v-for="c in catTabs"
        :key="c.key"
        class="adm-cat-tab"
        :class="{ active: catKey === c.key }"
        type="button"
        @click="catKey = c.key"
      >
        {{ c.label }}
        <span class="adm-cat-count">{{ idsOf(c.key).length }}</span>
      </button>
    </nav>

    <section class="adm-section">
      <header class="adm-section-head">
        <h3>{{ headTitle }}</h3>
        <div class="adm-section-actions">
          <button class="adm-btn" type="button" @click="openAddModal">+ 업소 추가</button>
          <button
            class="adm-btn"
            type="button"
            v-if="mode === 'list'"
            @click="fillCurrentCategory"
          >현재 목록 전체 채우기</button>
          <button class="adm-btn primary" type="button" :disabled="saving" @click="saveAll">
            {{ saving ? '저장 중…' : '저장' }}
          </button>
        </div>
      </header>
      <p class="adm-hint">{{ listHint }}</p>

      <ul ref="rankListRef" class="adm-rank-list" v-if="currentList.length">
        <li v-for="(s, i) in currentList" :key="s.id || i" class="adm-rank-row">
          <span class="adm-drag-handle" title="드래그">☰</span>
          <span class="adm-rank-badge" :class="{ top5: mode !== 'top5' || i < 5 }">{{ i + 1 }}</span>
          <div class="adm-rank-meta">
            <strong>{{ s.name || '(이름 없음)' }}</strong>
            <span class="adm-rank-sub">{{ s.region || '-' }} · {{ categoryLabel(s.category) }}</span>
          </div>
          <button class="adm-btn ghost small" type="button" @click="removeAt(i)">제거</button>
        </li>
      </ul>
      <p v-else class="adm-empty">{{ emptyHint }}</p>
    </section>

    <!-- 업소 추가 모달 -->
    <div v-if="addOpen" class="adm-modal-mask" @click.self="addOpen = false">
      <div class="adm-modal" role="dialog" aria-modal="true">
        <header class="adm-modal-head">
          <strong>{{ headTitle }} 에 업소 추가</strong>
          <button class="adm-modal-close" type="button" @click="addOpen = false">✕</button>
        </header>
        <div class="adm-modal-body">
          <input
            class="adm-search-input"
            v-model="searchQ"
            placeholder="업체명 또는 지역으로 검색"
            autofocus
          />
          <ul class="adm-search-results" v-if="searchResults.length">
            <li v-for="s in searchResults" :key="s.id" class="adm-search-item">
              <div class="adm-search-meta">
                <strong>{{ s.name || '(이름 없음)' }}</strong>
                <span>{{ s.region || '-' }} · {{ categoryLabel(s.category) }}</span>
              </div>
              <button
                class="adm-btn small"
                :class="alreadyAdded(s.id) ? 'ghost' : 'primary'"
                type="button"
                :disabled="alreadyAdded(s.id)"
                @click="addStore(s)"
              >{{ alreadyAdded(s.id) ? '이미 추가됨' : '+ 추가' }}</button>
            </li>
          </ul>
          <p v-else-if="searchQ.trim()" class="adm-empty">검색 결과 없음.</p>
          <p v-else class="adm-empty">업체명 또는 지역을 입력하세요.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import Sortable from 'sortablejs'
import { db as fbDb } from '@/firebase'
import {
  collection, doc, onSnapshot, setDoc,
  query, limit, serverTimestamp,
} from 'firebase/firestore'
import { CATEGORY_CHIPS, categoryLabel } from '@/constants/categories'

/* 편집 대상 3가지.
 * listOrders 는 지금까지 관리 화면이 없어 사용자 페이지의 숨은 편집기로만 저장됐고,
 * 그 편집기가 꺼진 뒤로는 아무도 바꿀 수 없었다. hotRanks 는 아예 없던 개념으로,
 * 실시간 순위가 찜 수 자동 계산뿐이라 운영이 손댈 수 없었다. */
const MODES = [
  { key: 'top5', label: 'Top5 순위',  desc: '카테고리별 "○○ Top 5" 카드에 나오는 순서입니다. 상위 5개가 노출됩니다.' },
  { key: 'list', label: '목록 순서',  desc: '가게찾기 하단 목록의 정렬 순서입니다. 여기에 없는 업소는 기존 정렬(티시/찜 등) 기준으로 뒤에 붙습니다.' },
  { key: 'hot',  label: '실시간 순위', desc: '가게찾기 맨 위 띠에 흐르는 순위입니다. 비워 두면 찜 수 기준으로 자동 계산합니다.' },
]
const mode = ref('top5')

/* 카테고리 — 웹 공용 표. 목록 순서는 '전체' 도 따로 잡을 수 있다 */
const catTabs = computed(() =>
  mode.value === 'list'
    ? CATEGORY_CHIPS.map(c => ({ key: c.key, label: c.label }))
    : CATEGORY_CHIPS.filter(c => c.key !== 'all').map(c => ({ key: c.key, label: c.label })),
)
const catKey = ref('hopper')
watch(mode, () => {
  const keys = catTabs.value.map(c => c.key)
  if (!keys.includes(catKey.value)) catKey.value = keys[0]
})

const stores = ref([])
const topRanks = ref({})
const listOrders = ref({})
const hotRanks = ref([])
const loadedOnce = ref(false)
let unsubStores = null
let unsubMarketing = null

onMounted(() => {
  unsubStores = onSnapshot(
    query(collection(fbDb, 'stores'), limit(500)),
    (snap) => { stores.value = snap.docs.map(d => ({ id: d.id, ...d.data() })) },
  )
  unsubMarketing = onSnapshot(
    doc(fbDb, 'config', 'marketing'),
    (snap) => {
      const data = snap.exists() ? (snap.data() || {}) : {}
      // 저장 전 로컬 편집을 잃지 않도록 첫 로드에서만 동기
      if (loadedOnce.value) return
      topRanks.value   = { ...(data.topRanks || {}) }
      listOrders.value = { ...(data.listOrders || {}) }
      hotRanks.value   = Array.isArray(data.hotRanks) ? data.hotRanks.map(String) : []
      loadedOnce.value = true
    },
  )
})
onBeforeUnmount(() => {
  if (unsubStores) try { unsubStores() } catch {}
  if (unsubMarketing) try { unsubMarketing() } catch {}
})

/* 현재 편집 중인 id 배열 읽기/쓰기 */
function idsOf(key) {
  if (mode.value === 'hot') return hotRanks.value
  const src = mode.value === 'top5' ? topRanks.value : listOrders.value
  return Array.isArray(src[key]) ? src[key] : []
}
const currentIds = computed(() => idsOf(catKey.value))
function setCurrentIds(arr) {
  const next = arr.map(String)
  if (mode.value === 'hot') { hotRanks.value = next; return }
  if (mode.value === 'top5') topRanks.value = { ...topRanks.value, [catKey.value]: next }
  else listOrders.value = { ...listOrders.value, [catKey.value]: next }
}

const currentList = computed(() =>
  currentIds.value.map(id =>
    stores.value.find(s => String(s.id) === String(id)) ||
    { id, name: '(삭제된 업소)', region: '', category: '' }),
)

const headTitle = computed(() => {
  if (mode.value === 'hot') return '실시간 순위'
  const label = catTabs.value.find(c => c.key === catKey.value)?.label || ''
  return mode.value === 'top5' ? `'${label}' Top 순위` : `'${label}' 목록 순서`
})
const listHint = computed(() =>
  mode.value === 'hot'
    ? '드래그(☰)로 순서를 바꿉니다. 최대 10개까지 띠에 흐릅니다. 비워 두면 찜 수 기준 자동.'
    : '드래그(☰)로 순서를 바꿉니다.',
)
const emptyHint = computed(() =>
  mode.value === 'hot'
    ? '지정된 실시간 순위가 없습니다. (지금은 찜 수 기준으로 자동 계산됩니다)'
    : "아직 등록된 업소가 없습니다. '업소 추가' 로 추가하세요.",
)

/* 목록 순서 — 해당 카테고리의 노출 업소를 한 번에 채워 넣는다 */
function fillCurrentCategory() {
  const have = new Set(currentIds.value.map(String))
  const add = stores.value
    .filter(s => catKey.value === 'all' || String(s.category || '') === catKey.value)
    .filter(s => !have.has(String(s.id)))
    .map(s => String(s.id))
  if (!add.length) { alert('추가할 업소가 없습니다.'); return }
  setCurrentIds([...currentIds.value, ...add])
}

/* === 드래그 === */
const rankListRef = ref(null)
let sortableInst = null
function reorder(fromIdx, toIdx) {
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
  const arr = currentIds.value.slice()
  if (fromIdx >= arr.length || toIdx >= arr.length) return
  const [moved] = arr.splice(fromIdx, 1)
  arr.splice(toIdx, 0, moved)
  setCurrentIds(arr)
}
function initSortable(el) {
  if (!el) return
  if (sortableInst) { try { sortableInst.destroy() } catch {} sortableInst = null }
  sortableInst = Sortable.create(el, {
    handle: '.adm-drag-handle',
    animation: 150,
    ghostClass: 'adm-drag-ghost',
    onEnd(evt) {
      const { oldIndex, newIndex } = evt
      if (oldIndex === newIndex || oldIndex == null || newIndex == null) return
      const list = evt.from
      list.insertBefore(evt.item, list.children[oldIndex])
      reorder(oldIndex, newIndex)
    },
  })
}
watch(rankListRef, (el) => { if (el) initSortable(el) })
onMounted(async () => { await nextTick(); if (rankListRef.value) initSortable(rankListRef.value) })
onBeforeUnmount(() => { if (sortableInst) try { sortableInst.destroy() } catch {} })

/* === 추가/제거 === */
function alreadyAdded(id) {
  return currentIds.value.some(x => String(x) === String(id))
}
function addStore(s) {
  if (alreadyAdded(s.id)) return
  setCurrentIds([...currentIds.value, String(s.id)])
}
function removeAt(i) {
  const arr = currentIds.value.slice()
  arr.splice(i, 1)
  setCurrentIds(arr)
}

/* === 검색 모달 === */
const addOpen = ref(false)
const searchQ = ref('')
function openAddModal() { searchQ.value = ''; addOpen.value = true }
const searchResults = computed(() => {
  const q = searchQ.value.trim().toLowerCase()
  if (!q) return []
  return stores.value.filter(s =>
    String(s.name || '').toLowerCase().includes(q) ||
    String(s.region || '').toLowerCase().includes(q) ||
    categoryLabel(s.category).toLowerCase().includes(q),
  ).slice(0, 30)
})

/* === 저장 === */
const saving = ref(false)
async function saveAll() {
  if (saving.value) return
  saving.value = true
  try {
    await setDoc(doc(fbDb, 'config', 'marketing'), {
      topRanks:   { ...topRanks.value },
      listOrders: { ...listOrders.value },
      hotRanks:   hotRanks.value.map(String),
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
    }, { merge: true })
    alert('저장되었습니다. 사용자 화면(웹·앱)에 바로 반영됩니다.')
  } catch (e) {
    console.error(e)
    alert('저장 실패: ' + (e?.message || e))
  } finally {
    saving.value = false
  }
}
</script>


<style scoped>
.adm-page{ max-width:1100px; margin:0 auto; }
.adm-page-head{ margin-bottom:14px; }
.adm-page-title{ margin:0; font-size:22px; font-weight:900; }
.adm-page-sub{ margin:4px 0 0; font-size:13px; color:#888; }

.adm-cat-tabs{
  display:flex; gap:6px; overflow-x:auto;
  padding-bottom:6px; margin-bottom:14px;
}
.adm-cat-tab{
  flex:none; background:#fff; border:1.5px solid #eee;
  padding:8px 14px; border-radius:999px;
  font-size:13px; font-weight:700; color:#666;
  cursor:pointer;
  display:inline-flex; align-items:center; gap:6px;
  white-space:nowrap;
}
.adm-cat-tab.active{
  background:#ff2e7e; border-color:#ff2e7e; color:#fff;
}
.adm-cat-count{
  background:rgba(0,0,0,.08);
  font-size:11px; padding:1px 7px; border-radius:999px;
  font-weight:800;
}
.adm-cat-tab.active .adm-cat-count{ background:rgba(255,255,255,.25); color:#fff; }

.adm-section{
  background:#fff; border:1px solid #f0f0f0; border-radius:14px;
  padding:16px 20px;
}
.adm-section-head{
  display:flex; align-items:center; justify-content:space-between;
  gap:10px; margin-bottom:10px; flex-wrap:wrap;
}
.adm-section-head h3{ margin:0; font-size:15px; font-weight:800; }
.adm-section-actions{ display:flex; gap:6px; }
.adm-hint{ font-size:12px; color:#888; margin:0 0 12px; }

.adm-btn{
  height:34px; padding:0 14px;
  border:1px solid #eee; background:#fafafa; color:#333;
  border-radius:10px; font-weight:700; font-size:13px;
  cursor:pointer; white-space:nowrap;
}
.adm-btn.primary{ background:#ff2e7e; border-color:#ff2e7e; color:#fff; }
.adm-btn.primary:disabled{ opacity:.6; cursor:not-allowed; }
.adm-btn.ghost{ background:#fff; }
.adm-btn.small{ height:28px; padding:0 10px; font-size:12px; border-radius:8px; }

.adm-rank-list{ list-style:none; margin:0; padding:0; }
.adm-rank-row{
  display:flex; align-items:center; gap:12px;
  padding:10px 0;
  border-bottom:1px solid #f5f5f5;
  cursor:grab;
}
.adm-rank-row:last-child{ border-bottom:none; }
.adm-rank-row:active{ cursor:grabbing; }
.adm-drag-handle{ color:#bbb; }

.adm-move-btns{
  display:flex; flex-direction:column; gap:2px; flex:none;
}
.adm-move-btn{
  width:28px; height:18px;
  border:1px solid #eee; background:#fff; color:#888;
  border-radius:4px; cursor:pointer;
  font-size:10px; line-height:1;
  padding:0;
}
.adm-move-btn:disabled{ opacity:.3; cursor:not-allowed; }
.adm-move-btn:active:not(:disabled){ background:#ffe4ef; color:#ff2e7e; }
.adm-rank-badge{
  width:30px; height:30px; border-radius:50%;
  background:#f5f5f5; color:#888;
  display:grid; place-items:center;
  font-weight:900; font-size:13px;
  flex:none;
}
.adm-rank-badge.top5{ background:#ff2e7e; color:#fff; }
.adm-rank-meta{ flex:1; min-width:0; display:flex; flex-direction:column; }
.adm-rank-meta strong{ font-size:14px; font-weight:800; }
.adm-rank-sub{ font-size:12px; color:#888; }

.adm-empty{ color:#aaa; font-size:13px; padding:20px 0; text-align:center; }

/* 모달 */
.adm-modal-mask{
  position:fixed; inset:0; background:rgba(0,0,0,.4);
  z-index:1000;
  display:flex; align-items:center; justify-content:center;
  padding:16px;
}
.adm-modal{
  width:100%; max-width:520px;
  background:#fff; border-radius:16px;
  box-shadow:0 12px 40px rgba(0,0,0,.25);
  display:flex; flex-direction:column;
  max-height:85vh;
}
.adm-modal-head{
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 18px; border-bottom:1px solid #eee;
}
.adm-modal-head strong{ font-size:15px; font-weight:800; }
.adm-modal-close{
  background:transparent; border:none; font-size:18px;
  width:28px; height:28px; border-radius:50%; cursor:pointer;
}
.adm-modal-close:hover{ background:#f5f5f5; }
.adm-modal-body{ padding:14px 18px; overflow-y:auto; }

.adm-search-input{
  width:100%; height:40px; padding:0 14px;
  border:1.5px solid #eee; border-radius:10px;
  font-size:14px; background:#fafafa;
  box-sizing:border-box;
  margin-bottom:10px;
}
.adm-search-input:focus{ outline:none; border-color:#ff2e7e; background:#fff; }

.adm-search-results{ list-style:none; margin:0; padding:0; }
.adm-search-item{
  display:flex; align-items:center; gap:10px;
  padding:10px 0; border-bottom:1px solid #f5f5f5;
}
.adm-search-item:last-child{ border-bottom:none; }
.adm-search-meta{ flex:1; min-width:0; display:flex; flex-direction:column; }
.adm-search-meta strong{ font-size:13px; font-weight:800; }
.adm-search-meta span{ font-size:11px; color:#888; }

:root[data-theme="dark"] .adm-cat-tab,
:root[data-theme="black"] .adm-cat-tab{ background:#1c1c1c; border-color:#2a2a2a; color:#ddd; }
:root[data-theme="dark"] .adm-section,
:root[data-theme="black"] .adm-section,
:root[data-theme="dark"] .adm-modal,
:root[data-theme="black"] .adm-modal{ background:#1c1c1c; border-color:#2a2a2a; color:#eee; }
:root[data-theme="dark"] .adm-rank-row,
:root[data-theme="black"] .adm-rank-row,
:root[data-theme="dark"] .adm-search-item,
:root[data-theme="black"] .adm-search-item,
:root[data-theme="dark"] .adm-modal-head,
:root[data-theme="black"] .adm-modal-head{ border-bottom-color:#2a2a2a; }
:root[data-theme="dark"] .adm-search-input,
:root[data-theme="black"] .adm-search-input{ background:#222; border-color:#2a2a2a; color:#eee; }
</style>

<style scoped>
.adm-mode-tabs{ display:flex; gap:6px; margin-bottom:8px; }
.adm-mode-tab{
  height:34px; padding:0 16px; border-radius:10px;
  border:1.5px solid #eee; background:#fff; color:#666;
  font-size:13px; font-weight:800; cursor:pointer;
}
.adm-mode-tab.active{ background:#111; border-color:#111; color:#fff; }
</style>
