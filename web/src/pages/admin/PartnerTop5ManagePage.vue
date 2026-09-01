<!--
  src/pages/admin/PartnerTop5ManagePage.vue
  제휴관(사용자) Top5 카테고리별 관리 — Top5ManagePage 패턴 이식
  Firestore: config/marketing { partnerTopRanks: { catKey: [partnerId, ...] } }

  - 출근업소(stores) 의 topRanks 와 완전 분리된 별도 키 사용 — 충돌 0
  - 카테고리는 src/lib/partnerCategories.js 공용 9 키 사용 (PR #99 통일)
  - 사용자 PartnersPage 는 partnerTopRanks 있으면 우선, 빈 카테고리는 기존 score 자동 정렬 폴백
-->
<template>
  <div class="adm-page">
    <header class="adm-page-head">
      <h2 class="adm-page-title">🏆 제휴관 Top5 관리</h2>
      <p class="adm-page-sub">
        제휴업체 카테고리별 인기 순위를 직접 관리합니다.
        (<code>config/marketing.partnerTopRanks</code>)
      </p>
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
        <span class="adm-cat-count">{{ (partnerTopRanks[c.key] || []).length }}</span>
      </button>
    </nav>

    <!-- 본문 -->
    <section class="adm-section">
      <header class="adm-section-head">
        <h3>'{{ currentCatLabel }}' Top 순위</h3>
        <div class="adm-section-actions">
          <button class="adm-btn" type="button" @click="openAddModal">+ 제휴업체 추가</button>
          <button class="adm-btn primary" type="button" :disabled="saving" @click="saveRanks">
            {{ saving ? '저장 중…' : '저장' }}
          </button>
        </div>
      </header>
      <p class="adm-hint">
        드래그(☰)로 순서를 변경하세요. 상위 5개가 사용자 제휴관 카테고리 섹션에 노출됩니다.
        빈 카테고리는 자동 정렬(평점/태그) 폴백으로 노출됩니다.
      </p>

      <ul ref="rankListRef" class="adm-rank-list" v-if="currentList.length">
        <li
          v-for="(p, i) in currentList"
          :key="p.id || i"
          class="adm-rank-row"
          :class="{ 'is-missing': p._missing }"
        >
          <span class="adm-drag-handle" title="드래그">☰</span>
          <span class="adm-rank-badge" :class="{ top5: i < 5 }">{{ i + 1 }}</span>
          <div class="adm-rank-meta">
            <strong>
              {{ p.name || '(이름 없음)' }}
              <span v-if="p._missing" class="adm-rank-tag missing">삭제됨</span>
              <span v-else-if="p._expired" class="adm-rank-tag expired">만료</span>
              <span v-else-if="p._inactive" class="adm-rank-tag inactive">비활성</span>
            </strong>
            <span class="adm-rank-sub">
              {{ p.region || '-' }} · {{ catLabel(p.category) }} · ⭐ {{ Number(p.rating || 4.5).toFixed(1) }}
            </span>
          </div>
          <button class="adm-btn ghost small" type="button" @click="removeFromRanks(i)">제거</button>
        </li>
      </ul>
      <p v-else class="adm-empty">
        '{{ currentCatLabel }}' 카테고리에 등록된 Top 순위가 없습니다.<br />
        '제휴업체 추가' 로 시작하거나, 비워두면 사용자 화면에서 자동 정렬됩니다.
      </p>
    </section>

    <!-- 제휴업체 추가 모달 -->
    <div v-if="addOpen" class="adm-modal-mask" @click.self="addOpen = false">
      <div class="adm-modal" role="dialog" aria-modal="true">
        <header class="adm-modal-head">
          <strong>'{{ currentCatLabel }}' 에 제휴업체 추가</strong>
          <button class="adm-modal-close" type="button" @click="addOpen = false">✕</button>
        </header>
        <div class="adm-modal-body">
          <input
            class="adm-search-input"
            v-model="searchQ"
            :placeholder="`'${currentCatLabel}' 카테고리 partner 검색 (이름/지역)`"
            autofocus
          />
          <p class="adm-modal-hint">
            현재 카테고리({{ currentCatLabel }})의 partner 만 표시됩니다.
            다른 카테고리는 해당 탭에서 추가하세요.
          </p>
          <ul class="adm-search-results" v-if="searchResults.length">
            <li v-for="p in searchResults" :key="p.id" class="adm-search-item">
              <div class="adm-search-meta">
                <strong>{{ p.name || '(이름 없음)' }}</strong>
                <span>
                  {{ p.region || '-' }} · ⭐ {{ Number(p.rating || 4.5).toFixed(1) }}
                </span>
              </div>
              <button
                class="adm-btn small"
                :class="alreadyAdded(p.id) ? 'ghost' : 'primary'"
                type="button"
                :disabled="alreadyAdded(p.id)"
                @click="addToRanks(p)"
              >
                {{ alreadyAdded(p.id) ? '이미 추가됨' : '+ 추가' }}
              </button>
            </li>
          </ul>
          <p v-else-if="searchQ.trim()" class="adm-empty">검색 결과 없음.</p>
          <p v-else class="adm-empty">{{ availableInCategory.length }} 개의 partner 가 있습니다. 검색하거나 아래에서 선택하세요.</p>

          <!-- 검색 빈 입력 시 카테고리 내 전체 표시 (최대 50) -->
          <ul v-if="!searchQ.trim() && availableInCategory.length" class="adm-search-results">
            <li v-for="p in availableInCategory.slice(0, 50)" :key="p.id" class="adm-search-item">
              <div class="adm-search-meta">
                <strong>{{ p.name || '(이름 없음)' }}</strong>
                <span>
                  {{ p.region || '-' }} · ⭐ {{ Number(p.rating || 4.5).toFixed(1) }}
                </span>
              </div>
              <button
                class="adm-btn small"
                :class="alreadyAdded(p.id) ? 'ghost' : 'primary'"
                type="button"
                :disabled="alreadyAdded(p.id)"
                @click="addToRanks(p)"
              >
                {{ alreadyAdded(p.id) ? '이미 추가됨' : '+ 추가' }}
              </button>
            </li>
          </ul>
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
import {
  PARTNER_CATEGORIES,
  partnerCatLabel,
  normalizePartnerCategory,
} from '@/lib/partnerCategories'

const categories = PARTNER_CATEGORIES
const catLabel = partnerCatLabel
const catKey = ref(categories[0]?.key || 'ps')
const currentCatLabel = computed(() => partnerCatLabel(catKey.value))

const partners = ref([])
const partnerTopRanks = ref({})       // 로컬 편집용 (저장 전 미보존 안 함 — 첫 로드만 시드)
const loadedOnce = ref(false)
let unsubPartners = null
let unsubMarketing = null

onMounted(() => {
  unsubPartners = onSnapshot(
    query(collection(fbDb, 'partners'), limit(500)),
    (snap) => {
      partners.value = snap.docs.map(d => {
        const data = d.data() || {}
        return {
          id: d.id,
          ...data,
          // 옛 키 partner 도 새 키로 정규화 (PR #99 와 일관)
          category: normalizePartnerCategory(data.category || data.categoryRaw || ''),
        }
      })
    },
  )
  unsubMarketing = onSnapshot(
    doc(fbDb, 'config', 'marketing'),
    (snap) => {
      const data = snap.exists() ? (snap.data() || {}) : {}
      // 로컬 편집 보호: 첫 로드 시에만 시드. 이후 외부 변경은 무시 (저장 시 덮어쓰기)
      if (!loadedOnce.value) {
        partnerTopRanks.value = { ...(data.partnerTopRanks || {}) }
        loadedOnce.value = true
      }
    },
  )
})
onBeforeUnmount(() => {
  if (unsubPartners) try { unsubPartners() } catch {}
  if (unsubMarketing) try { unsubMarketing() } catch {}
})

/* partnerId → partner 객체 빠른 조회 */
const partnersById = computed(() => {
  const map = {}
  for (const p of partners.value) map[String(p.id)] = p
  return map
})

/* 현재 카테고리의 partnerId 배열 → partner 객체 (삭제/만료 메타 포함) */
const currentList = computed(() => {
  const ids = Array.isArray(partnerTopRanks.value[catKey.value])
    ? partnerTopRanks.value[catKey.value]
    : []
  const now = Date.now()
  return ids.map(id => {
    const p = partnersById.value[String(id)]
    if (!p) {
      return { id, name: '(삭제됨)', region: '', category: '', _missing: true }
    }
    const _inactive = p.active === false
    const _expired = !!(p.adEnd && Number(p.adEnd) <= now)
    return { ...p, _inactive, _expired }
  })
})

/* === SortableJS 드래그 === */
const rankListRef = ref(null)
let sortableInst = null

function reorderTopRanks(fromIdx, toIdx) {
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
  const arr = (partnerTopRanks.value[catKey.value] || []).slice()
  if (fromIdx >= arr.length || toIdx >= arr.length) return
  const [moved] = arr.splice(fromIdx, 1)
  arr.splice(toIdx, 0, moved)
  partnerTopRanks.value = { ...partnerTopRanks.value, [catKey.value]: arr }
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
      reorderTopRanks(oldIndex, newIndex)
    },
  })
}
watch(rankListRef, (el) => { if (el) initSortable(el) })
onMounted(async () => {
  await nextTick()
  if (rankListRef.value) initSortable(rankListRef.value)
})
onBeforeUnmount(() => { if (sortableInst) try { sortableInst.destroy() } catch {} })

/* === 추가/제거 === */
function alreadyAdded(id) {
  const arr = partnerTopRanks.value[catKey.value] || []
  return arr.some(x => String(x) === String(id))
}
function addToRanks(p) {
  if (alreadyAdded(p.id)) return
  const arr = (partnerTopRanks.value[catKey.value] || []).slice()
  arr.push(String(p.id))
  partnerTopRanks.value = { ...partnerTopRanks.value, [catKey.value]: arr }
}
function removeFromRanks(i) {
  const arr = (partnerTopRanks.value[catKey.value] || []).slice()
  arr.splice(i, 1)
  partnerTopRanks.value = { ...partnerTopRanks.value, [catKey.value]: arr }
}

/* === 검색 모달 === */
const addOpen = ref(false)
const searchQ = ref('')
function openAddModal() { searchQ.value = ''; addOpen.value = true }

/* 현재 카테고리에 속한 partner 만 후보로 (이미 추가된 것도 포함 — 버튼이 비활성) */
const availableInCategory = computed(() => {
  return partners.value
    .filter(p => p.category === catKey.value)
    .filter(p => p.active !== false)  // 비활성은 후보에서 제외
})

const searchResults = computed(() => {
  const q = searchQ.value.trim().toLowerCase()
  if (!q) return []
  return availableInCategory.value.filter(p => {
    return (
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.region || '').toLowerCase().includes(q)
    )
  }).slice(0, 30)
})

/* === 저장 === */
const saving = ref(false)
async function saveRanks() {
  if (saving.value) return
  saving.value = true
  try {
    // 빈 배열은 저장에서 제외 (자동정렬 폴백 트리거를 위해 partnerTopRanks 에서 빈 카테고리는 안 남김)
    const cleaned = {}
    for (const [k, v] of Object.entries(partnerTopRanks.value)) {
      if (Array.isArray(v) && v.length) cleaned[k] = v.map(String)
    }
    await setDoc(doc(fbDb, 'config', 'marketing'), {
      partnerTopRanks: cleaned,
      partnerTopRanksSavedAt: serverTimestamp(),
    }, { merge: true })
    // 로컬 ref 도 cleaned 로 동기 (빈 배열 표시 일관성)
    partnerTopRanks.value = { ...cleaned }
    alert('저장되었습니다. 사용자 제휴관에 반영됩니다.')
  } catch (e) {
    console.error('[savePartnerTopRanks] fail', e)
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
.adm-page-sub code{
  background:#fafafa; padding:1px 6px; border-radius:4px;
  font-size:11px; color:#ff2e7e; border:1px solid #f0f0f0;
}

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
.adm-hint{ font-size:12px; color:#888; margin:0 0 12px; line-height:1.5; }

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
}
.adm-rank-row:last-child{ border-bottom:none; }
.adm-rank-row.is-missing{ opacity:.6; background:#fff5f5; padding:10px 8px; border-radius:8px; }
.adm-drag-handle{
  width:24px; text-align:center;
  color:#bbb; font-size:16px; cursor:grab; user-select:none;
}
.adm-drag-handle:active{ cursor:grabbing; }
.adm-drag-ghost{
  opacity:.6; background:#fff5f8 !important; border:1.5px dashed #ff2e7e !important;
}

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

.adm-rank-tag{
  display:inline-block;
  margin-left:6px;
  padding:1px 7px;
  border-radius:999px;
  font-size:10px; font-weight:800;
  vertical-align:middle;
}
.adm-rank-tag.missing{ background:#ffeaea; color:#ff4d4d; }
.adm-rank-tag.expired{ background:#ffeaea; color:#ff4d4d; }
.adm-rank-tag.inactive{ background:#f5f5f5; color:#888; }

.adm-empty{ color:#aaa; font-size:13px; padding:20px 0; text-align:center; line-height:1.6; }

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
.adm-modal-hint{ font-size:11px; color:#999; margin:0 0 10px; }

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

@media (max-width:768px){
  .adm-section{ padding:14px; }
  .adm-section-head{ flex-direction:column; align-items:stretch; }
  .adm-section-actions{ width:100%; }
  .adm-section-actions .adm-btn{ flex:1; }
}

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
:root[data-theme="dark"] .adm-rank-row.is-missing,
:root[data-theme="black"] .adm-rank-row.is-missing{ background:#2a1620; }
:root[data-theme="dark"] .adm-page-sub code,
:root[data-theme="black"] .adm-page-sub code{
  background:#222; border-color:#2a2a2a; color:#ff86b9;
}
</style>
