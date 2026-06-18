<!--
  src/pages/admin/PartnersManagePage.vue
  ──────────────────────────────────────────────────────────
  관리자 — 제휴업체(partners) 관리
   - 진단: docs/audit/2026-06-18-제휴업체-관리-진단.md
   - 사용자 화면(PartnersPage)이 source 로 읽는 컬렉션 = partners
   - 3중 저장 패턴 유지: partners/{id} + config/marketing/partnerCards/{id} +
     config/marketing 의 partnerCardIndex / partnerCards / partnerCardList 배열
   - 이미지 경로: marketing/partnerCards/{id}/(thumb|img-N)-{ts}.jpg
   - 룰: firestore.rules (partners/partnerCards/config 모두 admin write) +
         storage.rules (marketing/** admin write) — 변경 0건
   - partnerRequests(외부 신청) 모더레이션은 별도 PR
-->
<template>
  <div class="adm-page">
    <header class="adm-page-head">
      <h2 class="adm-page-title">🤝 제휴업체 관리</h2>
      <p class="adm-page-sub">
        partners 컬렉션 + config/marketing 사본을 함께 갱신해 사용자 화면(제휴관) 에 즉시 반영됩니다.
      </p>
    </header>

    <section class="adm-section">
      <header class="adm-section-head">
        <h3>제휴업체 목록 ({{ orderedList.length }})</h3>
        <div class="adm-section-actions">
          <button
            class="adm-btn"
            type="button"
            :disabled="!orderDirty || savingOrder"
            @click="savePartnerOrder"
            :title="orderDirty ? '순서 변경사항을 저장합니다' : '변경된 순서 없음'"
          >{{ savingOrder ? '순서 저장 중…' : (orderDirty ? '순서 저장' : '순서 저장됨') }}</button>
          <button class="adm-btn primary" type="button" @click="openCreate" :disabled="loading">
            + 새 제휴업체
          </button>
        </div>
      </header>

      <p class="adm-section-hint">
        드래그 핸들(☰) 을 잡고 위/아래로 옮긴 뒤 "순서 저장" 을 누르면
        <code>config/marketing.partnerOrder</code> 에 반영되어 사용자 제휴관 화면 순서가 즉시 바뀝니다.
      </p>

      <p v-if="loading" class="adm-empty">불러오는 중…</p>
      <p v-else-if="!orderedList.length" class="adm-empty">등록된 제휴업체가 없습니다.</p>

      <ul v-else ref="partnerListRef" class="adm-partner-list">
        <li v-for="p in orderedList" :key="p.id" class="adm-partner-row">
          <span class="adm-drag-handle" title="드래그하여 순서 변경" aria-label="순서 변경">☰</span>
          <div class="adm-partner-thumb" :style="bgStyle(p.thumb)" />
          <div class="adm-partner-meta">
            <strong class="adm-partner-name">
              {{ p.name || '(이름 없음)' }}
              <span v-if="periodClassOf(p) === 'expired'" class="adm-partner-badge expired">만료</span>
              <span v-else-if="periodClassOf(p) === 'warning'" class="adm-partner-badge warning">만료 임박</span>
              <span v-if="p.active === false" class="adm-partner-badge inactive">비활성</span>
            </strong>
            <span class="adm-partner-sub">
              {{ p.region || '-' }} · {{ catLabel(p.category) }} · ⭐ {{ Number(p.rating || 4.5).toFixed(1) }}
            </span>
            <span class="adm-partner-sub muted">
              {{ p.active === false ? '비활성' : '활성' }} · {{ p.approved === false ? '미승인' : '승인' }}
            </span>
          </div>
          <div class="adm-partner-actions">
            <button class="adm-btn small" type="button" @click="openEdit(p)">수정</button>
            <button
              class="adm-btn small"
              type="button"
              :class="{ 'is-on': p.active !== false }"
              :disabled="!!periodBusy[p.id]"
              @click="toggleActive(p)"
              :title="p.active === false ? '활성화' : '비활성화'"
            >{{ p.active === false ? '활성화' : '비활성화' }}</button>
            <button
              class="adm-btn small danger"
              type="button"
              :disabled="!!deleting[p.id]"
              @click="deletePartner(p)"
            >{{ deleting[p.id] ? '삭제 중…' : '삭제' }}</button>
          </div>

          <!-- 노출 기간 UI (StoresManagePage 패턴 이식) -->
          <div class="adm-period-row">
            <span class="adm-period-status" :class="periodClassOf(p)">{{ periodLabelOf(p) }}</span>
            <div class="adm-period-presets">
              <button type="button" class="adm-period-btn" @click="setPeriod(p, 15)" :disabled="periodBusy[p.id]">15일</button>
              <button type="button" class="adm-period-btn" @click="setPeriod(p, 30)" :disabled="periodBusy[p.id]">30일</button>
              <button type="button" class="adm-period-btn" @click="setPeriod(p, 60)" :disabled="periodBusy[p.id]">60일</button>
              <button type="button" class="adm-period-btn" @click="setPeriod(p, 90)" :disabled="periodBusy[p.id]">90일</button>
              <button type="button" class="adm-period-btn extend" @click="extendPeriod(p, 30)" :disabled="periodBusy[p.id] || !p.adEnd">+30일 연장</button>
              <button v-if="p.adStart || p.adEnd" type="button" class="adm-period-btn clear" @click="clearPeriod(p)" :disabled="periodBusy[p.id]">해제</button>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <!-- ===== 추가/수정 모달 ===== -->
    <div v-if="modal" class="adm-modal-mask" @click.self="closeModal">
      <div class="adm-modal" role="dialog">
        <header class="adm-modal-head">
          <strong>{{ modal === 'create' ? '새 제휴업체 추가' : '제휴업체 수정' }}</strong>
          <button class="adm-modal-close" type="button" @click="closeModal">✕</button>
        </header>

        <div class="adm-modal-body">
          <div class="adm-form-grid">
            <label class="adm-field">
              <span>이름 *</span>
              <input v-model.trim="form.name" type="text" placeholder="제휴업체 이름" />
            </label>

            <label class="adm-field">
              <span>담당자명</span>
              <input v-model.trim="form.manager" type="text" placeholder="담당자(선택)" />
            </label>

            <label class="adm-field">
              <span>지역</span>
              <input v-model.trim="form.region" type="text" placeholder="예: 강남" />
            </label>

            <label class="adm-field">
              <span>카테고리</span>
              <select v-model="form.category">
                <option v-for="c in partnerCategoryOptions" :key="c.key" :value="c.key">{{ c.label }}</option>
              </select>
            </label>

            <label class="adm-field full">
              <span>주소</span>
              <input v-model.trim="form.address" type="text" placeholder="가게 주소" />
            </label>

            <label class="adm-field">
              <span>영업시간</span>
              <input v-model.trim="form.hours" type="text" placeholder="예: 10:00 - 21:00" />
            </label>

            <label class="adm-field">
              <span>휴무일</span>
              <input v-model.trim="form.holiday" type="text" placeholder="예: 매주 일요일" />
            </label>

            <label class="adm-field">
              <span>외부 링크</span>
              <input v-model.trim="form.link" type="url" placeholder="https://..." />
            </label>

            <label class="adm-field">
              <span>평점 (0-5)</span>
              <input v-model.number="form.rating" type="number" min="0" max="5" step="0.1" />
            </label>

            <label class="adm-field">
              <span>노출 시작</span>
              <input v-model="form.adStartStr" type="date" />
            </label>

            <label class="adm-field">
              <span>노출 종료</span>
              <input v-model="form.adEndStr" type="date" />
            </label>

            <label class="adm-field full">
              <span>한 줄 소개 / 설명</span>
              <textarea v-model.trim="form.desc" rows="3" placeholder="제휴업체 소개"></textarea>
            </label>

            <label class="adm-field full">
              <span>혜택 / 이벤트</span>
              <textarea v-model.trim="form.benefits" rows="2" placeholder="강남톡 회원 혜택"></textarea>
            </label>

            <label class="adm-field full">
              <span>태그 (쉼표로 구분)</span>
              <input v-model.trim="form.tagsStr" type="text" placeholder="예: 미용,할인,프로모션" />
            </label>

            <label class="adm-field">
              <span>활성 여부</span>
              <select v-model="form.active">
                <option :value="true">활성 (노출)</option>
                <option :value="false">비활성 (숨김)</option>
              </select>
            </label>

            <label class="adm-field">
              <span>승인 상태</span>
              <select v-model="form.approved">
                <option :value="true">승인</option>
                <option :value="false">미승인 (검토중)</option>
              </select>
            </label>

            <div class="adm-field full">
              <span>대표 이미지 + 갤러리 (최대 8장)</span>
              <div class="adm-img-row">
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/*"
                  multiple
                  class="adm-img-file"
                  :disabled="uploading"
                  @change="onPickImages"
                />
                <button
                  type="button"
                  class="adm-btn"
                  :disabled="uploading || !form.id"
                  @click="triggerFilePick"
                >{{ uploading ? '업로드 중…' : '사진 선택 (다중)' }}</button>
                <span v-if="!form.id" class="adm-hint">먼저 저장 후 이미지를 업로드하세요.</span>
              </div>
              <ul v-if="form.images.length" class="adm-img-grid">
                <li
                  v-for="(url, i) in form.images"
                  :key="i"
                  class="adm-img-item"
                  :class="{ on: form.thumb === url }"
                >
                  <img :src="url" :alt="`이미지 ${i+1}`" />
                  <div class="adm-img-actions">
                    <button type="button" class="adm-btn small" @click="setThumb(url)">대표</button>
                    <button type="button" class="adm-btn small danger" @click="removeImage(i)">제거</button>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <p v-if="formError" class="adm-form-error">{{ formError }}</p>
        </div>

        <footer class="adm-modal-foot">
          <button class="adm-btn" type="button" @click="closeModal">취소</button>
          <button
            class="adm-btn primary"
            type="button"
            :disabled="saving"
            @click="onSave"
          >{{ saving ? '저장 중…' : '저장' }}</button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { db as fbDb, storage as fbStorage } from '@/firebase'
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp,
  onSnapshot, query, limit,
} from 'firebase/firestore'
import {
  ref as sRef, uploadBytes, getDownloadURL, listAll, deleteObject,
} from 'firebase/storage'
import Sortable from 'sortablejs'

/* ───────── 카테고리 + 헬퍼 (useMyPageCore 에서 발췌) ───────── */
const partnerCategoryOptions = [
  { key:'salon',  label:'미용실' },
  { key:'nail',   label:'네일' },
  { key:'ps',     label:'성형외과' },
  { key:'real',   label:'부동산' },
  { key:'rental', label:'렌탈샵' },
  { key:'fit',    label:'피트니스' },
  { key:'cafe',   label:'카페' },
  { key:'etc',    label:'기타' },
]
const catLabel = (k) => (partnerCategoryOptions.find(o => o.key === k)?.label || '기타')

function ensurePtId(s) {
  const v = String(s || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)
  return v || `pt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

const parseDateStr = (s) => {
  const v = String(s || '').trim(); if (!v) return null
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return null
  const ms = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0).getTime()
  return isFinite(ms) ? ms : null
}
const dateStrOf = (v) => {
  if (!v) return ''
  const ms = typeof v === 'number' ? v : (v?.seconds ? v.seconds * 1000 : 0)
  if (!ms) return ''
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const parseTags = (s) => String(s || '').split(',').map(t => t.trim()).filter(Boolean)

function bgStyle(url) {
  if (!url) return { background: '#f3f4f6' }
  return { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
}

/* ───────── 상태 ───────── */
const list = ref([])
const loading = ref(false)
const deleting = ref({})
const modal = ref('')   // '' | 'create' | 'edit'
const saving = ref(false)
const formError = ref('')
const uploading = ref(false)
const fileInputRef = ref(null)

const emptyForm = () => ({
  id: '',
  name: '',
  manager: '',
  region: '',
  address: '',
  category: 'etc',
  link: '',
  rating: 4.5,
  hours: '',
  holiday: '',
  desc: '',
  benefits: '',
  tagsStr: '',
  active: true,
  approved: true,
  adStartStr: '',
  adEndStr: '',
  thumb: '',
  images: [],
  createdAt: null,
})
const form = reactive(emptyForm())

function resetForm() {
  Object.assign(form, emptyForm())
}

/* ───────── 로드 ───────── */
async function loadList() {
  loading.value = true
  try {
    const snap = await getDocs(query(collection(fbDb, 'partners'), limit(500)))
    const arr = []
    snap.forEach(d => arr.push({ id: d.id, ...d.data() }))
    arr.sort((a, b) => {
      const ta = a.updatedAt?.toMillis?.() || a.updatedAt?.seconds * 1000 || 0
      const tb = b.updatedAt?.toMillis?.() || b.updatedAt?.seconds * 1000 || 0
      return tb - ta
    })
    list.value = arr
  } catch (e) {
    console.warn('[PartnersManage] load fail:', e)
    list.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadList() })

/* ───────── 순서 변경 (config/marketing.partnerOrder) =====
 * 사용자 PartnersPage.vue:1014-1040 이 이미 partnerOrder 를 onSnapshot 구독하고
 * 같은 키 기반 인덱스 정렬을 적용 중. 관리자가 여기서 setDoc(merge:true) 하면
 * 사용자 제휴관 화면 순서가 즉시 바뀐다.
 *
 * 패턴: StoresManagePage.vue 의 SortableJS 구현 (initSortable/reorderApproved/
 *       saveAllOrders) 을 partners 에 그대로 이식.
 *
 * 충돌 없음: homeOrder / topRanks / partnerCardIndex 등 다른 config/marketing 필드는
 *           merge:true 로 보존. partnerOrder 만 갱신.
 */
const PARTNER_ORDER_FIELD = 'partnerOrder'
const partnerOrderRemote = ref([])    // Firestore 에서 마지막으로 읽은 값 (saved 비교용)
const partnerOrderLocal = ref([])     // 로컬 드래그 결과
const partnerOrderLoadedOnce = ref(false)
const savingOrder = ref(false)
let unsubMarketing = null

function subMarketing() {
  try {
    unsubMarketing = onSnapshot(doc(fbDb, 'config', 'marketing'), (snap) => {
      const data = snap.exists() ? (snap.data() || {}) : {}
      const arr = Array.isArray(data[PARTNER_ORDER_FIELD])
        ? data[PARTNER_ORDER_FIELD].map(String)
        : []
      partnerOrderRemote.value = arr
      // 첫 로드만 로컬에 반영. 이후 외부 변경은 로컬 드래그 보호 (StoresManage Tab1 패턴).
      if (!partnerOrderLoadedOnce.value) {
        partnerOrderLocal.value = arr.slice()
        partnerOrderLoadedOnce.value = true
      }
    })
  } catch (e) {
    console.warn('[PartnersManage] subMarketing error:', e)
  }
}
onMounted(subMarketing)
onBeforeUnmount(() => { if (typeof unsubMarketing === 'function') try { unsubMarketing() } catch {} })

/* orderedList: partnerOrderLocal 인덱스 우선, 없는 항목은 list 원본 (updatedAt 역순) 끝에 */
const orderedList = computed(() => {
  if (!partnerOrderLocal.value.length) return list.value.slice()
  const pos = new Map(partnerOrderLocal.value.map((id, idx) => [String(id), idx]))
  return list.value.slice().sort((a, b) => {
    const ai = pos.has(String(a.id)) ? pos.get(String(a.id)) : Infinity
    const bi = pos.has(String(b.id)) ? pos.get(String(b.id)) : Infinity
    if (ai !== bi) return ai - bi
    return 0
  })
})

const orderDirty = computed(() => {
  // 비교: 로컬 partnerOrder 와 Firestore remote 가 다른지
  const a = partnerOrderLocal.value
  const b = partnerOrderRemote.value
  if (a.length !== b.length) return true
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true
  return false
})

function reorderPartner(fromIdx, toIdx) {
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
  const displayIds = orderedList.value.map(p => String(p.id))
  if (fromIdx >= displayIds.length || toIdx >= displayIds.length) return
  const [moved] = displayIds.splice(fromIdx, 1)
  displayIds.splice(toIdx, 0, moved)

  // 현재 화면에 안 보이는 잔존 partnerOrder ID 는 뒤에 유지
  const visibleSet = new Set(displayIds)
  const tail = partnerOrderLocal.value.filter(id => !visibleSet.has(String(id)))
  partnerOrderLocal.value = [...displayIds, ...tail]
}

/* SortableJS — PC/모바일 공용 */
const partnerListRef = ref(null)
let sortableInst = null
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
      // SortableJS DOM 이동을 되돌리고 reactive 만 갱신 (Vue 일관 렌더)
      const listEl = evt.from
      listEl.insertBefore(evt.item, listEl.children[oldIndex])
      reorderPartner(oldIndex, newIndex)
    },
  })
}
watch(partnerListRef, (el) => { if (el) initSortable(el) })
onMounted(async () => {
  await nextTick()
  if (partnerListRef.value) initSortable(partnerListRef.value)
})
onBeforeUnmount(() => { if (sortableInst) try { sortableInst.destroy() } catch {} })

async function savePartnerOrder() {
  if (savingOrder.value) return
  if (!orderDirty.value) return
  savingOrder.value = true
  try {
    await setDoc(
      doc(fbDb, 'config', 'marketing'),
      {
        [PARTNER_ORDER_FIELD]: partnerOrderLocal.value.map(String),
        partnerOrderSavedAt: serverTimestamp(),
      },
      { merge: true },
    )
    // remote 즉시 동기 — onSnapshot 이 곧 따라옴
    partnerOrderRemote.value = partnerOrderLocal.value.slice()
    alert('제휴업체 순서가 저장되었습니다. 사용자 제휴관에 반영됩니다.')
  } catch (e) {
    console.error('[savePartnerOrder] fail', e)
    alert('순서 저장 실패: ' + (e?.message || e))
  } finally {
    savingOrder.value = false
  }
}

/* ───────── 노출 기간 (adStart / adEnd) + active 토글 — 즉시 저장 =====
 * StoresManagePage.vue:322-388 의 setPeriod/extendPeriod/clearPeriod 패턴 그대로.
 * 사용자 PartnersPage.vue 의 isActiveAdPartner 가 adStart/adEnd 를 즉시 필터링.
 *
 * 변경 범위: partners/{id} 만. config/marketing.partnerCards 사본의 adStart/adEnd 는
 * 변경 안 함 (사용자 화면은 partners 컬렉션 source 직접 읽음 — 진단 §1-1 / PR #92 작업 로그).
 * 사본은 모달 onSave 흐름으로만 동기 (가벼운 미러).
 */
const DAY_MS_PT = 86400000
const periodBusy = ref({})

function periodLabelOf(p) {
  if (!p?.adStart && !p?.adEnd) return '기간 미설정 (무기한)'
  const now = Date.now()
  const end = Number(p.adEnd || 0)
  if (!end) return '시작일만 설정'
  if (now >= end) return '만료'
  const diff = end - now
  const days = Math.ceil(diff / DAY_MS_PT)
  return `D-${days}` + (days <= 7 ? ' (만료 임박)' : '')
}
function periodClassOf(p) {
  if (!p?.adStart && !p?.adEnd) return 'none'
  const now = Date.now()
  const end = Number(p.adEnd || 0)
  if (end && now >= end) return 'expired'
  if (end && end - now <= 7 * DAY_MS_PT) return 'warning'
  return 'ok'
}

function patchLocal(id, patch) {
  // onSnapshot 이 없어서 (partners 는 onSnapshot 안 함) 로컬 list 도 즉시 동기
  const idx = list.value.findIndex(x => x.id === id)
  if (idx >= 0) list.value[idx] = { ...list.value[idx], ...patch }
}

async function setPeriod(p, days) {
  if (periodBusy.value[p.id]) return
  if (!confirm(`'${p.name || '(이름 없음)'}' 노출 기간을 ${days}일로 설정하시겠습니까?`)) return
  periodBusy.value = { ...periodBusy.value, [p.id]: true }
  try {
    const now = Date.now()
    const end = now + days * DAY_MS_PT
    await updateDoc(doc(fbDb, 'partners', p.id), {
      adStart: now, adEnd: end, updatedAt: serverTimestamp(),
    })
    patchLocal(p.id, { adStart: now, adEnd: end })
  } catch (e) {
    alert('기간 설정 실패: ' + (e?.message || e))
  } finally {
    periodBusy.value = { ...periodBusy.value, [p.id]: false }
  }
}
async function extendPeriod(p, days) {
  if (periodBusy.value[p.id]) return
  const cur = Number(p.adEnd || Date.now())
  const newEnd = cur + days * DAY_MS_PT
  periodBusy.value = { ...periodBusy.value, [p.id]: true }
  try {
    await updateDoc(doc(fbDb, 'partners', p.id), {
      adEnd: newEnd, updatedAt: serverTimestamp(),
    })
    patchLocal(p.id, { adEnd: newEnd })
  } catch (e) {
    alert('기간 연장 실패: ' + (e?.message || e))
  } finally {
    periodBusy.value = { ...periodBusy.value, [p.id]: false }
  }
}
async function clearPeriod(p) {
  if (periodBusy.value[p.id]) return
  if (!confirm('노출 기간을 해제하시겠습니까? (무기한 노출로 전환)')) return
  periodBusy.value = { ...periodBusy.value, [p.id]: true }
  try {
    await updateDoc(doc(fbDb, 'partners', p.id), {
      adStart: null, adEnd: null, updatedAt: serverTimestamp(),
    })
    patchLocal(p.id, { adStart: null, adEnd: null })
  } catch (e) {
    alert('기간 해제 실패: ' + (e?.message || e))
  } finally {
    periodBusy.value = { ...periodBusy.value, [p.id]: false }
  }
}
async function toggleActive(p) {
  if (periodBusy.value[p.id]) return
  const nextActive = p.active === false   // 비활성 → 활성, 활성/미지정 → 비활성
  const verb = nextActive ? '활성화' : '비활성화'
  if (!confirm(`'${p.name || '(이름 없음)'}' 을(를) ${verb}하시겠습니까?`)) return
  periodBusy.value = { ...periodBusy.value, [p.id]: true }
  try {
    await updateDoc(doc(fbDb, 'partners', p.id), {
      active: nextActive, updatedAt: serverTimestamp(),
    })
    patchLocal(p.id, { active: nextActive })
  } catch (e) {
    alert(`${verb} 실패: ` + (e?.message || e))
  } finally {
    periodBusy.value = { ...periodBusy.value, [p.id]: false }
  }
}

/* ───────── 모달 열기 ───────── */
function openCreate() {
  resetForm()
  // create 시점에 id 미리 발급 → 이미지 업로드 가능하게
  form.id = ensurePtId(`pt_${Date.now()}`)
  formError.value = ''
  modal.value = 'create'
}

function openEdit(p) {
  resetForm()
  form.id = p.id
  form.name = p.name || ''
  form.manager = p.manager || p.managerName || ''
  form.region = p.region || ''
  form.address = p.address || ''
  form.category = p.category || p.categoryRaw || 'etc'
  form.link = p.link || ''
  form.rating = Number(p.rating || 4.5)
  form.hours = p.hours || ''
  form.holiday = p.holiday || ''
  form.desc = p.desc || p.intro || ''
  form.benefits = p.benefits || ''
  form.tagsStr = Array.isArray(p.tags) ? p.tags.join(',') : ''
  form.active = p.active !== false
  form.approved = p.approved !== false
  form.adStartStr = dateStrOf(p.adStart)
  form.adEndStr = dateStrOf(p.adEnd)
  form.thumb = p.thumb || p.image || ''
  form.images = Array.isArray(p.images) && p.images.length
    ? p.images.slice()
    : (form.thumb ? [form.thumb] : [])
  form.createdAt = p.createdAt || null
  formError.value = ''
  modal.value = 'edit'
}

function closeModal() {
  modal.value = ''
  resetForm()
  formError.value = ''
}

/* ───────── 이미지 업로드 ───────── */
async function fileToJpegBlob(file, maxW = 1280, quality = 0.85) {
  const dataUrl = await new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = reject
    fr.readAsDataURL(file)
  })
  const img = new Image()
  await new Promise((res) => { img.onload = res; img.src = dataUrl })
  const scale = Math.min(1, maxW / img.width)
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  canvas.getContext('2d').drawImage(img, 0, 0, w, h)
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality))
  return blob || file
}

function triggerFilePick() {
  if (uploading.value || !form.id) return
  try { fileInputRef.value?.click() } catch {}
}

async function onPickImages(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  if (!form.id) {
    alert('id 가 없습니다.')
    return
  }
  uploading.value = true
  try {
    const remain = Math.max(0, 8 - form.images.length)
    const target = files.slice(0, remain)
    for (let i = 0; i < target.length; i++) {
      const blob = await fileToJpegBlob(target[i], 1280, 0.85)
      const ts = Date.now() + '_' + Math.random().toString(36).slice(2, 6)
      const path = `marketing/partnerCards/${form.id}/img-${form.images.length}-${ts}.jpg`
      const r = sRef(fbStorage, path)
      await uploadBytes(r, blob, {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=60',
      })
      const url = await getDownloadURL(r)
      form.images.push(url)
      if (!form.thumb) form.thumb = url
    }
  } catch (err) {
    console.warn('[upload] fail', err)
    alert('이미지 업로드 실패: ' + (err?.message || err))
  } finally {
    uploading.value = false
    try { e.target.value = '' } catch {}
  }
}

function setThumb(url) { form.thumb = url }

function removeImage(i) {
  const removed = form.images[i]
  form.images.splice(i, 1)
  if (form.thumb === removed) {
    form.thumb = form.images[0] || ''
  }
}

/* ───────── 저장 (3중 저장 패턴 — useMyPageCore.savePartnerOne 동등) ───────── */
async function onSave() {
  if (saving.value) return
  formError.value = ''
  if (!form.name) {
    formError.value = '이름을 입력해 주세요.'
    return
  }
  if (!form.id) form.id = ensurePtId(`pt_${Date.now()}`)

  saving.value = true
  try {
    const id = form.id
    const startMs = parseDateStr(form.adStartStr)
    const endMs = parseDateStr(form.adEndStr)
    const tags = parseTags(form.tagsStr)
    const thumb = form.thumb || form.images[0] || ''

    // 1) partners/{id} — source
    const partnerBody = {
      name: form.name,
      manager: form.manager,
      region: form.region,
      address: form.address,
      category: form.category,
      categoryRaw: form.category,
      link: form.link,
      rating: Number(form.rating || 4.5),
      hours: form.hours,
      holiday: form.holiday,
      desc: form.desc,
      intro: form.desc,
      benefits: form.benefits,
      tags,
      active: form.active,
      approved: form.approved,
      applyStatus: form.approved ? 'approved' : 'pending',
      adStart: startMs,
      adEnd: endMs,
      thumb,
      image: thumb,
      images: form.images.slice(),
      updatedAt: serverTimestamp(),
      createdAt: form.createdAt || serverTimestamp(),
    }
    await setDoc(doc(fbDb, 'partners', id), partnerBody, { merge: true })

    // 2) config/marketing/partnerCards/{id} — 사본 (가벼운 필드)
    await setDoc(doc(fbDb, 'config', 'marketing', 'partnerCards', id), {
      name: form.name,
      region: form.region,
      category: form.category,
      thumb,
      images: form.images.slice(),
      desc: form.desc,
      address: form.address,
      hours: form.hours,
      holiday: form.holiday,
      benefits: form.benefits,
      tags,
      adStart: startMs,
      adEnd: endMs,
      rating: Number(form.rating || 4.5),
      updatedAt: serverTimestamp(),
    }, { merge: true })

    // 3) config/marketing 의 index/array 갱신
    const mkRef = doc(fbDb, 'config', 'marketing')
    const mkSnap = await getDoc(mkRef)
    const mkData = mkSnap.exists() ? (mkSnap.data() || {}) : {}
    const idxList = Array.isArray(mkData.partnerCardIndex) ? mkData.partnerCardIndex.slice() : []
    const row = {
      id,
      name: form.name,
      region: form.region,
      category: form.category,
      thumb,
      adStart: startMs,
      adEnd: endMs,
      rating: Number(form.rating || 4.5),
    }
    const pos = idxList.findIndex(x => String(x.id || '') === id)
    if (pos >= 0) idxList[pos] = row
    else idxList.unshift(row)

    await setDoc(mkRef, {
      partnerCardIndex: idxList,
      partnerCards: idxList,
      partnerCardList: idxList,
      updatedAt: serverTimestamp(),
    }, { merge: true })

    alert(modal.value === 'create' ? '제휴업체가 추가되었습니다.' : '제휴업체가 수정되었습니다.')
    closeModal()
    await loadList()
  } catch (e) {
    console.error('[PartnersManage] save fail', e)
    formError.value = '저장 실패: ' + (e?.message || e)
  } finally {
    saving.value = false
  }
}

/* ───────── 삭제 (3중 저장 역연산 + Storage 정리) ───────── */
async function deletePartner(p) {
  if (!p?.id || deleting.value[p.id]) return
  const label = p.name || p.id

  const c1 = window.confirm(
    `'${label}' 제휴업체를 삭제하시겠습니까?\n\n` +
    `다음 데이터가 모두 함께 삭제됩니다:\n` +
    `· partners/${p.id} 문서\n` +
    `· config/marketing/partnerCards/${p.id} 사본\n` +
    `· config/marketing 의 인덱스 배열에서 제거\n` +
    `· Storage marketing/partnerCards/${p.id}/* 전체\n\n` +
    `※ stores(출근업소) 는 영향받지 않습니다.`
  )
  if (!c1) return

  const c2 = window.confirm(
    `정말 '${label}' 을(를) 삭제하시겠습니까?\n` +
    `되돌릴 수 없습니다.`
  )
  if (!c2) return

  deleting.value = { ...deleting.value, [p.id]: true }
  const errors = []
  try {
    // 1) Storage marketing/partnerCards/{id}/*
    try {
      const dirRef = sRef(fbStorage, `marketing/partnerCards/${p.id}/`)
      const all = await listAll(dirRef)
      await Promise.all(all.items.map(item => deleteObject(item).catch(() => null)))
    } catch (e) {
      errors.push(`Storage: ${e?.code || e?.message}`)
    }

    // 2) config/marketing/partnerCards/{id}
    try {
      await deleteDoc(doc(fbDb, 'config', 'marketing', 'partnerCards', p.id))
    } catch (e) {
      errors.push(`partnerCards 사본: ${e?.code || e?.message}`)
    }

    // 3) config/marketing 의 배열에서 제거
    try {
      const mkRef = doc(fbDb, 'config', 'marketing')
      const mkSnap = await getDoc(mkRef)
      if (mkSnap.exists()) {
        const mkData = mkSnap.data() || {}
        const filterById = (arr) => Array.isArray(arr) ? arr.filter(x => String(x.id || '') !== p.id) : arr
        const patch = {
          partnerCardIndex: filterById(mkData.partnerCardIndex),
          partnerCards: filterById(mkData.partnerCards),
          partnerCardList: filterById(mkData.partnerCardList),
          updatedAt: serverTimestamp(),
        }
        await setDoc(mkRef, patch, { merge: true })
      }
    } catch (e) {
      errors.push(`marketing 인덱스: ${e?.code || e?.message}`)
    }

    // 4) partners/{id} 본 doc
    try {
      await deleteDoc(doc(fbDb, 'partners', p.id))
    } catch (e) {
      errors.push(`partners doc: ${e?.code || e?.message}`)
    }

    if (errors.length) {
      alert(`'${label}' 삭제 — 일부 단계 실패:\n` + errors.join('\n'))
    } else {
      alert(`'${label}' 제휴업체를 삭제했습니다.`)
    }
    list.value = list.value.filter(x => x.id !== p.id)
  } finally {
    const next = { ...deleting.value }
    delete next[p.id]
    deleting.value = next
  }
}
</script>

<style scoped>
.adm-page{ max-width:1100px; margin:0 auto; }
.adm-page-head{ margin-bottom:18px; }
.adm-page-title{ margin:0; font-size:22px; font-weight:900; }
.adm-page-sub{ margin:4px 0 0; font-size:13px; color:#888; }

.adm-section{
  background:#fff; border:1px solid #f0f0f0; border-radius:14px;
  padding:24px; margin-bottom:14px;
}
.adm-section-head{
  display:flex; justify-content:space-between; align-items:center;
  margin-bottom:14px; gap:12px;
}
.adm-section-head h3{ margin:0; font-size:16px; font-weight:900; }

.adm-empty{ color:#aaa; font-size:14px; text-align:center; padding:24px 0; }

.adm-partner-list{ list-style:none; padding:0; margin:0; }
.adm-partner-row{
  display:grid; grid-template-columns:32px 80px 1fr auto;
  gap:14px;
  align-items:center;
  padding:12px 0;
  border-bottom:1px solid #f5f5f5;
}
.adm-partner-row > .adm-period-row{ grid-column: 1 / -1; }

/* 만료/비활성 배지 (제목 옆) */
.adm-partner-badge{
  display:inline-block;
  margin-left:6px;
  padding:2px 8px;
  border-radius:999px;
  font-size:10px; font-weight:800;
  vertical-align:middle;
}
.adm-partner-badge.expired{ background:#ffeaea; color:#ff4d4d; }
.adm-partner-badge.warning{ background:#fff3e0; color:#f2a100; }
.adm-partner-badge.inactive{ background:#f5f5f5; color:#888; }

/* 활성/비활성 토글 — 활성 시 살짝 핑크 톤 */
.adm-btn.is-on{
  background:#fff5f8; border-color:#ffd6e4; color:#ff2e7e;
}

/* 노출 기간 row (StoresManage 패턴) */
.adm-period-row{
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  margin-top:6px;
  padding-top:8px;
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

/* 드래그 핸들 (SortableJS 와 짝) */
.adm-drag-handle{
  display:inline-flex; align-items:center; justify-content:center;
  width:32px; height:36px;
  border:1px solid #eee; border-radius:8px;
  background:#fafafa; color:#888;
  font-size:18px; font-weight:700;
  cursor:grab; user-select:none;
}
.adm-drag-handle:hover{ background:#fff0f6; color:#ff2e7e; border-color:#ffd6e4; }
.adm-drag-handle:active{ cursor:grabbing; }
.adm-drag-ghost{
  opacity:.6; background:#fff5f8 !important; border:1.5px dashed #ff2e7e !important;
}

/* 섹션 액션/힌트 */
.adm-section-actions{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.adm-section-hint{
  margin:-4px 0 12px; font-size:12px; color:#888; line-height:1.5;
}
.adm-section-hint code{
  background:#fafafa; padding:1px 6px; border-radius:4px;
  font-size:11px; color:#ff2e7e; border:1px solid #f0f0f0;
}
.adm-partner-thumb{
  width:80px; height:60px; border-radius:10px;
  background:#f3f4f6; background-size:cover; background-position:center;
}
.adm-partner-meta{ display:flex; flex-direction:column; gap:2px; min-width:0; }
.adm-partner-name{ font-size:15px; font-weight:800; }
.adm-partner-sub{ font-size:12px; color:#666; }
.adm-partner-sub.muted{ color:#aaa; }
.adm-partner-actions{ display:flex; gap:6px; }

.adm-btn{
  height:34px; padding:0 14px;
  border:1px solid #eee; background:#fafafa; color:#333;
  border-radius:10px; font-weight:700; font-size:13px;
  cursor:pointer;
}
.adm-btn.primary{ background:#ff2e7e; border-color:#ff2e7e; color:#fff; }
.adm-btn.primary:disabled{ opacity:.6; cursor:not-allowed; }
.adm-btn.small{ height:30px; padding:0 10px; font-size:12px; border-radius:8px; }
.adm-btn.danger{
  color:#d92626; border-color:#f3b0b0; background:#fff;
}
.adm-btn.danger:hover:not(:disabled){
  background:#d92626; color:#fff; border-color:#d92626;
}
.adm-btn.danger:disabled{ opacity:.5; cursor:not-allowed; }

/* ===== 모달 ===== */
.adm-modal-mask{
  position:fixed; inset:0; z-index:9999;
  background:rgba(0,0,0,.4);
  display:grid; place-items:center;
  padding:20px;
}
.adm-modal{
  width:100%; max-width:780px; max-height:90vh;
  background:#fff; border-radius:16px;
  display:flex; flex-direction:column;
  box-shadow:0 10px 40px rgba(0,0,0,.2);
}
.adm-modal-head{
  display:flex; justify-content:space-between; align-items:center;
  padding:16px 20px;
  border-bottom:1px solid #f0f0f0;
}
.adm-modal-close{
  border:none; background:none; cursor:pointer;
  font-size:18px; color:#888;
}
.adm-modal-body{ padding:20px; overflow-y:auto; }
.adm-modal-foot{
  display:flex; justify-content:flex-end; gap:8px;
  padding:14px 20px;
  border-top:1px solid #f0f0f0;
}
.adm-form-error{
  margin:12px 0 0; padding:10px 12px;
  background:#fff5f5; border:1px solid #f3b0b0; border-radius:8px;
  color:#d92626; font-size:13px;
}

.adm-form-grid{
  display:grid; grid-template-columns:1fr 1fr; gap:12px;
}
.adm-field{ display:flex; flex-direction:column; gap:4px; }
.adm-field.full{ grid-column:1 / -1; }
.adm-field span{ font-size:12px; font-weight:700; color:#666; }
.adm-field input, .adm-field textarea, .adm-field select{
  padding:10px 12px;
  border:1.5px solid #eee; border-radius:8px;
  font-size:14px; background:#fff;
  font-family:inherit;
}
.adm-field input{ height:40px; padding:0 12px; }
.adm-field select{ height:40px; padding:0 12px; }
.adm-field input:focus, .adm-field textarea:focus, .adm-field select:focus{
  outline:none; border-color:#ff2e7e;
}

.adm-img-row{
  display:flex; gap:10px; align-items:center;
  margin:6px 0 10px;
}
.adm-img-file{ display:none; }
.adm-hint{ font-size:12px; color:#999; }

.adm-img-grid{
  list-style:none; padding:0; margin:0;
  display:grid; grid-template-columns:repeat(4, 1fr); gap:8px;
}
.adm-img-item{
  position:relative; aspect-ratio:4/3;
  border:2px solid transparent; border-radius:8px;
  overflow:hidden;
}
.adm-img-item.on{ border-color:#ff2e7e; }
.adm-img-item img{ width:100%; height:100%; object-fit:cover; }
.adm-img-actions{
  position:absolute; bottom:4px; left:4px; right:4px;
  display:flex; gap:4px; opacity:0;
  transition:opacity .15s;
}
.adm-img-item:hover .adm-img-actions{ opacity:1; }
.adm-img-actions .adm-btn{
  flex:1; height:24px; padding:0 6px; font-size:11px;
}

@media (max-width:768px){
  .adm-form-grid{ grid-template-columns:1fr; }
  .adm-img-grid{ grid-template-columns:repeat(2, 1fr); }
  .adm-partner-row{ grid-template-columns:28px 60px 1fr; }
  .adm-partner-thumb{ width:60px; height:45px; }
  .adm-partner-actions{ grid-column:1 / -1; }
  .adm-drag-handle{ width:28px; height:32px; font-size:16px; }
  .adm-section-actions{ width:100%; }
  .adm-section-actions .adm-btn{ flex:1; }
}

:root[data-theme="dark"] .adm-section,
:root[data-theme="black"] .adm-section{ background:#1c1c1c; border-color:#2a2a2a; color:#eee; }
:root[data-theme="dark"] .adm-modal,
:root[data-theme="black"] .adm-modal{ background:#1c1c1c; color:#eee; }
:root[data-theme="dark"] .adm-field input,
:root[data-theme="dark"] .adm-field textarea,
:root[data-theme="dark"] .adm-field select,
:root[data-theme="black"] .adm-field input,
:root[data-theme="black"] .adm-field textarea,
:root[data-theme="black"] .adm-field select{ background:#222; border-color:#2a2a2a; color:#eee; }
:root[data-theme="dark"] .adm-drag-handle,
:root[data-theme="black"] .adm-drag-handle{
  background:#222; border-color:#2a2a2a; color:#888;
}
:root[data-theme="dark"] .adm-drag-handle:hover,
:root[data-theme="black"] .adm-drag-handle:hover{
  background:#2a1a22; color:#ff86b9; border-color:#3a1d2a;
}
:root[data-theme="dark"] .adm-section-hint code,
:root[data-theme="black"] .adm-section-hint code{
  background:#222; border-color:#2a2a2a; color:#ff86b9;
}
:root[data-theme="dark"] .adm-period-row,
:root[data-theme="black"] .adm-period-row{ border-top-color:#2a2a2a; }
:root[data-theme="dark"] .adm-period-btn,
:root[data-theme="black"] .adm-period-btn{
  background:#222; border-color:#2a2a2a; color:#bbb;
}
:root[data-theme="dark"] .adm-period-btn:hover:not(:disabled),
:root[data-theme="black"] .adm-period-btn:hover:not(:disabled){
  background:#2a1a22; color:#ff86b9;
}
:root[data-theme="dark"] .adm-partner-badge.inactive,
:root[data-theme="black"] .adm-partner-badge.inactive{
  background:#2a2a2a; color:#aaa;
}
:root[data-theme="dark"] .adm-btn.is-on,
:root[data-theme="black"] .adm-btn.is-on{
  background:#2a1a22; border-color:#3a1d2a; color:#ff86b9;
}
</style>
