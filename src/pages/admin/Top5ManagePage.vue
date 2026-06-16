<!--
  src/pages/admin/Top5ManagePage.vue
  가게찾기 Top5 관리 — 카테고리 탭 + 드래그 정렬 + 업소 추가/제거
  Firestore: config/marketing { topRanks: { catKey: [storeId, ...] } }
-->
<template>
  <div class="adm-page">
    <header class="adm-page-head">
      <h2 class="adm-page-title">🏆 가게찾기 Top5 관리</h2>
      <p class="adm-page-sub">카테고리별 인기 순위를 직접 관리합니다. (config/marketing.topRanks)</p>
    </header>

    <!-- 카테고리 탭 -->
    <nav class="adm-cat-tabs">
      <button
        v-for="c in categories"
        :key="c.key"
        class="adm-cat-tab"
        :class="{ active: catKey === c.key }"
        type="button"
        @click="catKey = c.key"
      >
        {{ c.label }}
        <span class="adm-cat-count">{{ (topRanks[c.key] || []).length }}</span>
      </button>
    </nav>

    <!-- 본문 -->
    <section class="adm-section">
      <header class="adm-section-head">
        <h3>'{{ currentCatLabel }}' Top 순위</h3>
        <div class="adm-section-actions">
          <button class="adm-btn" type="button" @click="openAddModal">+ 업소 추가</button>
          <button class="adm-btn primary" type="button" :disabled="saving" @click="saveRanks">
            {{ saving ? '저장 중…' : '저장' }}
          </button>
        </div>
      </header>
      <p class="adm-hint">드래그(☰)로 순서를 변경하세요. 상위 5개가 사용자 페이지에 노출됩니다.</p>

      <ul class="adm-rank-list" v-if="currentList.length">
        <li
          v-for="(s, i) in currentList"
          :key="s.id || i"
          class="adm-rank-row"
          draggable="true"
          @dragstart="onDragStart(i, $event)"
          @dragover.prevent
          @drop="onDropTop5($event, i)"
          @dragend="onDragEnd"
        >
          <span class="adm-drag-handle">☰</span>
          <span class="adm-rank-badge" :class="{ top5: i < 5 }">{{ i + 1 }}</span>
          <div class="adm-rank-meta">
            <strong>{{ s.name || '(이름 없음)' }}</strong>
            <span class="adm-rank-sub">{{ s.region || '-' }} · {{ s.category || '-' }}</span>
          </div>
          <!-- 모바일 fallback: 위/아래 화살표 -->
          <div class="adm-move-btns">
            <button class="adm-move-btn" type="button" :disabled="i===0" @click="moveTop5(i, -1)" aria-label="위로">▲</button>
            <button class="adm-move-btn" type="button" :disabled="i===currentList.length-1" @click="moveTop5(i, 1)" aria-label="아래로">▼</button>
          </div>
          <button class="adm-btn ghost small" type="button" @click="removeFromRanks(i)">제거</button>
        </li>
      </ul>
      <p v-else class="adm-empty">아직 등록된 업소가 없습니다. '업소 추가' 로 추가하세요.</p>
    </section>

    <!-- 업소 추가 모달 -->
    <div v-if="addOpen" class="adm-modal-mask" @click.self="addOpen = false">
      <div class="adm-modal" role="dialog" aria-modal="true">
        <header class="adm-modal-head">
          <strong>'{{ currentCatLabel }}' 에 업소 추가</strong>
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
                <span>{{ s.region || '-' }} · {{ s.category || '-' }}</span>
              </div>
              <button
                class="adm-btn small"
                :class="alreadyAdded(s.id) ? 'ghost' : 'primary'"
                type="button"
                :disabled="alreadyAdded(s.id)"
                @click="addToRanks(s)"
              >
                {{ alreadyAdded(s.id) ? '이미 추가됨' : '+ 추가' }}
              </button>
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { db as fbDb } from '@/firebase'
import {
  collection, doc, onSnapshot, setDoc,
  query, limit, serverTimestamp,
} from 'firebase/firestore'

const categories = [
  { key:'hopper', label:'하퍼' },
  { key:'point5', label:'쩜오' },
  { key:'ten',    label:'텐카페' },
  { key:'tenpro', label:'텐프로' },
  { key:'bar',    label:'바(Bar)' },
  { key:'onep',   label:'일프로' },
  { key:'nrb',    label:'노래방' },
  { key:'kara',   label:'가라오케' },
  { key:'etc',    label:'기타' },
]

const catKey = ref('hopper')
const currentCatLabel = computed(() => categories.find(c => c.key === catKey.value)?.label || '')

const stores = ref([])
const topRanks = ref({}) // 로컬 편집용
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
      // 저장 전 로컬 편집을 잃지 않도록, 첫 로드 시에만 동기
      if (!loadedOnce.value) {
        topRanks.value = { ...(data.topRanks || {}) }
        loadedOnce.value = true
      }
    },
  )
})
onBeforeUnmount(() => {
  if (unsubStores) try { unsubStores() } catch {}
  if (unsubMarketing) try { unsubMarketing() } catch {}
})
const loadedOnce = ref(false)

/* 현재 카테고리의 storeId 배열 → store 객체 */
const currentList = computed(() => {
  const ids = Array.isArray(topRanks.value[catKey.value]) ? topRanks.value[catKey.value] : []
  return ids.map(id => stores.value.find(s => String(s.id) === String(id)) || { id, name: '(삭제됨)', region:'', category:'' })
})

/* === 드래그 (드롭 기반) === */
const drag = ref({ from: -1 })
function onDragStart(i, e){
  drag.value.from = i
  try {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(i))
  } catch {}
}
function reorderTopRanks(fromIdx, toIdx){
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
  const arr = (topRanks.value[catKey.value] || []).slice()
  if (fromIdx >= arr.length || toIdx >= arr.length) return
  const [moved] = arr.splice(fromIdx, 1)
  arr.splice(toIdx, 0, moved)
  topRanks.value = { ...topRanks.value, [catKey.value]: arr }
}
function onDropTop5(e, targetIdx){
  e.preventDefault()
  const dt = Number(e.dataTransfer?.getData('text/plain'))
  const fromIdx = Number.isFinite(dt) ? dt : drag.value.from
  reorderTopRanks(fromIdx, targetIdx)
}
function onDragEnd(){ drag.value.from = -1 }

/* === 모바일 fallback === */
function moveTop5(i, dir){
  reorderTopRanks(i, i + dir)
}

/* === 추가/제거 === */
function alreadyAdded(id){
  const arr = topRanks.value[catKey.value] || []
  return arr.some(x => String(x) === String(id))
}
function addToRanks(s){
  if (alreadyAdded(s.id)) return
  const arr = (topRanks.value[catKey.value] || []).slice()
  arr.push(String(s.id))
  topRanks.value = { ...topRanks.value, [catKey.value]: arr }
}
function removeFromRanks(i){
  const arr = (topRanks.value[catKey.value] || []).slice()
  arr.splice(i, 1)
  topRanks.value = { ...topRanks.value, [catKey.value]: arr }
}

/* === 검색 모달 === */
const addOpen = ref(false)
const searchQ = ref('')
function openAddModal(){ searchQ.value = ''; addOpen.value = true }

const searchResults = computed(() => {
  const q = searchQ.value.trim().toLowerCase()
  if (!q) return []
  return stores.value.filter(s => {
    return (
      String(s.name || '').toLowerCase().includes(q) ||
      String(s.region || '').toLowerCase().includes(q) ||
      String(s.category || '').toLowerCase().includes(q)
    )
  }).slice(0, 30)
})

/* === 저장 === */
const saving = ref(false)
async function saveRanks(){
  if (saving.value) return
  saving.value = true
  try {
    await setDoc(doc(fbDb, 'config', 'marketing'), {
      topRanks: { ...topRanks.value },
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
    }, { merge: true })
    alert('저장되었습니다.')
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
