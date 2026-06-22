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
        <div class="adm-section-actions">
          <!-- "+ 새 업소 등록" 버튼은 PR e (2026-06-22) 에서 제거됨.
               신규 업소 등록은 회원 빌드 /biz-signup (PR #113) 으로 일원화. -->
          <button class="adm-btn primary" type="button" :disabled="savingExpose" @click="saveExposeAndOrder">
            {{ savingExpose ? '저장 중…' : '저장' }}
          </button>
        </div>
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
            <button
              type="button"
              class="adm-btn danger sm"
              :disabled="!!deleting[s.id]"
              @click="deleteStore(s)"
              title="이 출근업소를 삭제합니다 (연관 데이터 모두 정리)"
            >{{ deleting[s.id] ? '삭제 중…' : '삭제' }}</button>
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
            <button class="adm-btn primary" type="button" @click="openReview(s)">검토</button>
            <button class="adm-btn ghost" type="button" @click="approveStore(s)">승인</button>
            <button class="adm-btn ghost" type="button" @click="rejectStore(s)">거절</button>
            <button
              class="adm-btn danger"
              type="button"
              :disabled="!!deleting[s.id]"
              @click="deleteStore(s)"
              title="신청 자체를 삭제 (연관 데이터 모두 정리)"
            >{{ deleting[s.id] ? '삭제 중…' : '삭제' }}</button>
          </div>
        </li>
      </ul>
      <p v-else class="adm-empty">대기 중인 신청이 없습니다.</p>
    </section>

    <!-- ===== 검토 모달 (pending 업소 수정 + 승인/거절) ===== -->
    <!-- 진단: docs/audit/2026-06-22-관리자-승인화면-수정승인-진단.md (PR d)
         업체가 /biz-signup 으로 제출한 11 필드를 폼으로 표시 + 수정.
         푸터 4 버튼: 저장만 / 저장+승인 / 거절(사유) / 취소.
         이미지는 정책 유지(승인 후 BizMyStore 에서 업체가 직접 업로드). -->
    <div v-if="review.open" class="adm-modal-mask" @click.self="closeReview">
      <div class="adm-modal adm-modal-wide" role="dialog" aria-modal="true">
        <header class="adm-modal-head">
          <strong>업소 등록 신청 검토</strong>
          <button class="adm-modal-close" type="button" @click="closeReview">✕</button>
        </header>

        <div class="adm-modal-body">
          <!-- 신청자 정보 (읽기 전용) -->
          <h4 class="adm-modal-section-title">신청자 정보</h4>
          <div class="adm-review-applicant">
            <div class="adm-review-row">
              <span class="adm-review-label">이메일</span>
              <span class="adm-review-value">{{ review.applicant.email || '-' }}</span>
            </div>
            <div class="adm-review-row">
              <span class="adm-review-label">휴대폰 (SMS 인증)</span>
              <span class="adm-review-value">{{ review.applicant.phone || '-' }}</span>
            </div>
            <div class="adm-review-row">
              <span class="adm-review-label">신청일</span>
              <span class="adm-review-value">{{ fmtTime(review.applicant.createdAt) }}</span>
            </div>
          </div>

          <!-- 업소 정보 폼 (11 필드, 수정 가능) -->
          <h4 class="adm-modal-section-title">업소 정보 (수정 가능)</h4>
          <div class="adm-form-grid-2">
            <label class="adm-field">
              <span>가게명 *</span>
              <input v-model.trim="review.form.name" type="text" placeholder="가게 이름" />
            </label>
            <label class="adm-field">
              <span>매장 전화</span>
              <input v-model.trim="review.form.phone" type="tel" placeholder="010-0000-0000" />
            </label>
          </div>

          <div class="adm-field">
            <span>카테고리</span>
            <div class="adm-chip-grid">
              <button
                v-for="c in storeCategoryOptions"
                :key="c.key"
                type="button"
                class="adm-chip"
                :class="{ on: review.form.category === c.key }"
                @click="review.form.category = c.key"
              >{{ c.label }}</button>
            </div>
          </div>

          <div class="adm-field">
            <span>지역</span>
            <div class="adm-chip-grid">
              <button
                v-for="r in storeRegionOptions"
                :key="r"
                type="button"
                class="adm-chip"
                :class="{ on: review.form.region === r }"
                @click="review.form.region = r"
              >{{ r }}</button>
            </div>
          </div>

          <label class="adm-field">
            <span>한 줄 소개</span>
            <input v-model.trim="review.form.desc" type="text" maxlength="40" placeholder="가게 한 줄 소개 (16자 내외)" />
          </label>
          <label class="adm-field">
            <span>상세 설명</span>
            <textarea v-model.trim="review.form.detailDesc" rows="3" placeholder="가게 상세 설명"></textarea>
          </label>

          <label class="adm-field">
            <span>주소</span>
            <input v-model.trim="review.form.address" type="text" placeholder="가게 주소" />
          </label>

          <div class="adm-form-grid-2">
            <label class="adm-field">
              <span>영업시간</span>
              <input v-model.trim="review.form.hours" type="text" placeholder="예: 18:00 - 02:00" />
            </label>
            <label class="adm-field">
              <span>휴무일</span>
              <input v-model.trim="review.form.closed" type="text" placeholder="예: 매주 일요일" />
            </label>
          </div>

          <div class="adm-field">
            <span>시급 / 일급 / 월급</span>
            <div class="adm-chip-grid">
              <button
                v-for="w in storeWageTypeOptions"
                :key="w.key"
                type="button"
                class="adm-chip"
                :class="{ on: review.form.wageType === w.key }"
                @click="review.form.wageType = w.key"
              >{{ w.label }}</button>
            </div>
          </div>
          <label class="adm-field">
            <span>금액 (원)</span>
            <input
              :value="reviewWageDisplay"
              @input="onReviewWageInput"
              type="text"
              inputmode="numeric"
              placeholder="예: 15000"
            />
          </label>

          <!-- 이미지 정책 안내 (폼에서 제외) -->
          <p class="adm-review-image-note">
            📷 대표 이미지는 승인 후 업체가 직접 업로드합니다 (BizMyStore).
            관리자 검토 단계에서는 이미지를 수정하지 않습니다.
          </p>

          <!-- 거절 사유 (거절 시 사용, 선택) -->
          <h4 class="adm-modal-section-title">거절 사유 (거절 시 사용)</h4>
          <label class="adm-field">
            <textarea
              v-model.trim="review.rejectReason"
              rows="2"
              placeholder="거절 사유를 입력하세요 (선택). 거절 버튼 클릭 시 함께 저장됩니다."
            ></textarea>
          </label>

          <!-- 저장/처리 결과 -->
          <p v-if="review.errorMsg" class="adm-result-error">{{ review.errorMsg }}</p>
          <p v-if="review.successMsg" class="adm-result-success">{{ review.successMsg }}</p>
        </div>

        <footer class="adm-modal-foot adm-review-foot">
          <button
            class="adm-btn ghost"
            type="button"
            @click="closeReview"
            :disabled="review.busy"
          >취소</button>
          <button
            class="adm-btn danger"
            type="button"
            @click="onReviewReject"
            :disabled="review.busy"
          >{{ review.busy ? '처리 중…' : '거절' }}</button>
          <button
            class="adm-btn"
            type="button"
            @click="onReviewSaveOnly"
            :disabled="review.busy"
          >{{ review.busy ? '처리 중…' : '저장만 (pending 유지)' }}</button>
          <button
            class="adm-btn primary"
            type="button"
            @click="onReviewSaveAndApprove"
            :disabled="review.busy"
          >{{ review.busy ? '처리 중…' : '저장 + 승인' }}</button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, reactive } from 'vue'
import Sortable from 'sortablejs'
import { useRoute } from 'vue-router'
import { db as fbDb } from '@/firebase'
import {
  collection, doc, onSnapshot, setDoc, updateDoc, getDoc,
  writeBatch, query, limit, serverTimestamp,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'

const route = useRoute()
const tab = ref(['expose','metrics','pending'].includes(route.query.tab) ? route.query.tab : 'expose')

const stores = ref([])
const homeOrder = ref([])
/**
 * homeOrder 첫 로드 후 자체 편집 보호용 가드.
 * - false 일 때: onSnapshot 콜백이 Firestore 의 homeOrder 로 ref 갱신
 * - true 일 때:  Firestore 가 갱신되어도 로컬 편집을 덮어쓰지 않음
 * Top5ManagePage 와 동일 패턴.
 * (저장 후의 echo 도 무시되지만, 어차피 로컬 값과 동일하므로 무해)
 */
const homeOrderLoadedOnce = ref(false)

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
      if (homeOrderLoadedOnce.value) return  // 로컬 편집 보호
      const data = snap.exists() ? (snap.data() || {}) : {}
      homeOrder.value = Array.isArray(data.homeOrder) ? data.homeOrder.map(String) : []
      homeOrderLoadedOnce.value = true
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
      // baseline (시드) 보존 — saveAllMetrics 에서 dirty 비교용.
      // 진단: docs/audit/2026-06-19-rooms_biz-입력경로-진단.md
      // (이전 버그: 시드 그대로 일괄 저장 → 13개 모두 0/0/manualSaved 덮어쓰기)
      const seedMatch      = Number(s.match || 0)
      const seedPersons    = Number(s.persons || 0)
      const seedTotalRooms = Number(s.totalRooms || 0)
      const seedMaxPersons = Number(s.maxPersons || 0)
      const seedStatusMode = String(s.statusMode || 'auto')
      const seedStatus     = String(s.status || '좋음')

      next[s.id] = {
        match: seedMatch,
        persons: seedPersons,
        totalRooms: seedTotalRooms,
        maxPersons: seedMaxPersons,
        statusMode: seedStatusMode,
        status: seedStatus,
        // dirty 비교용 baseline (관리자 수정 시 변경 안 됨)
        _seedMatch:      seedMatch,
        _seedPersons:    seedPersons,
        _seedTotalRooms: seedTotalRooms,
        _seedMaxPersons: seedMaxPersons,
        _seedStatusMode: seedStatusMode,
        _seedStatus:     seedStatus,
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

  // dirty 추적 + 0/0 confirm 가드 (2026-06-21 추가).
  // 진단: docs/audit/2026-06-19-rooms_biz-입력경로-진단.md
  // 배경: 시드 그대로 일괄 저장 시 모든 노출 store 가 0/0/manualSaved 로 덮어써짐.
  //   - dirty 필터: _seed* baseline 과 현재 값이 모두 같으면 commit 제외
  //   - 0/0 confirm: dirty store 중 match=0 + persons=0 저장이 있으면 사용자 확인
  const allItems = exposedStores.value
    .map(s => ({ s, e: metricEdits.value[s.id] }))
    .filter(({ e }) => !!e)

  // 1) dirty 추적 — 시드 그대로면 스킵
  const dirtyItems = allItems.filter(({ e }) => {
    return Number(e.match)      !== Number(e._seedMatch)
        || Number(e.persons)    !== Number(e._seedPersons)
        || Number(e.totalRooms) !== Number(e._seedTotalRooms)
        || Number(e.maxPersons) !== Number(e._seedMaxPersons)
        || String(e.statusMode) !== String(e._seedStatusMode)
        || String(e.status)     !== String(e._seedStatus)
  })
  const skipped = allItems.length - dirtyItems.length

  if (!dirtyItems.length) {
    alert(`변경된 업소가 없습니다. (전체 ${allItems.length}개 중 0개 변경)\n\n` +
          `값을 수정한 뒤 다시 저장해 주세요.`)
    return
  }

  // 2) 0/0 저장 confirm — 의도치 않은 0 덮어쓰기 경고
  const zeroItems = dirtyItems.filter(({ e }) =>
    Number(e.match || 0) === 0 && Number(e.persons || 0) === 0
  )
  if (zeroItems.length) {
    const sampleNames = zeroItems.slice(0, 5).map(({ s }) => s.name || s.id).join(', ')
    const more = zeroItems.length > 5 ? ` 외 ${zeroItems.length - 5}개` : ''
    const ok = window.confirm(
      `⚠️ ${zeroItems.length}개 업소를 맞출방 0 / 필요인원 0 으로 저장합니다.\n\n` +
      `· ${sampleNames}${more}\n\n` +
      `마감/휴업 등 의도가 맞으면 [확인], 아니면 [취소] 후 값을 입력하세요.\n` +
      `(0/0 저장 시 사용자 현황판에 0 으로 표시되며 manualSaved 플래그가 적용됩니다.)`
    )
    if (!ok) return
  }

  savingMetrics.value = true
  let okCount = 0, failCount = 0
  const errors = []
  try {
    // 가게당 (stores + rooms_biz) 2 writes 를 writeBatch 로 묶어 원자성 보장.
    // - 한쪽만 성공하고 다른쪽 실패하는 부분 실패 불가 → 사용자 화면에서 두 컬렉션이 어긋남 차단.
    // - Firestore batch 한도 = 500 writes / commit. 250 가게 마다 chunk.
    // - 2026-06-21: dirty 만 commit (allItems → dirtyItems)
    const items = dirtyItems

    const CHUNK = 250
    for (let i = 0; i < items.length; i += CHUNK) {
      const slice = items.slice(i, i + CHUNK)
      const batch = writeBatch(fbDb)
      for (const { s, e } of slice) {
        const match      = Number(e.match || 0)
        const persons    = Number(e.persons || 0)
        const totalRooms = Number(e.totalRooms || 0)
        const maxPersons = Number(e.maxPersons || 0)
        const statusMode = String(e.statusMode || 'auto')
        const status     = statusMode === 'manual'
          ? String(e.status || '좋음')
          : autoStatusOf(match, totalRooms)
        const now = serverTimestamp()

        batch.update(doc(fbDb, 'stores', s.id), {
          match, persons, totalRooms, maxPersons,
          statusMode, status,
          updatedAt: now,
        })
        // rooms_biz 미러. manualSaved=true + manualSavedAt 로 자동파싱(ChatBiz/pastedText)
        // 보다 우선임을 명시 → applyRoomsBiz 의 tier 머지에서 가장 높은 우선순위.
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
      }
      try {
        await batch.commit()
        okCount += slice.length
      } catch (err) {
        console.warn('metric batch commit fail', i, err)
        for (const { s } of slice) {
          errors.push(`${s.name || s.id}: ${err?.code || err?.message || err}`)
        }
        failCount += slice.length
      }
    }

    // 성공한 dirty entry 의 seed baseline 갱신 — 같은 화면에서 또 저장 시 dirty 비교 정확
    if (okCount > 0) {
      const nextEdits = { ...metricEdits.value }
      for (const { s, e } of dirtyItems) {
        const cur = nextEdits[s.id]
        if (!cur) continue
        nextEdits[s.id] = {
          ...cur,
          _seedMatch:      Number(e.match || 0),
          _seedPersons:    Number(e.persons || 0),
          _seedTotalRooms: Number(e.totalRooms || 0),
          _seedMaxPersons: Number(e.maxPersons || 0),
          _seedStatusMode: String(e.statusMode || 'auto'),
          _seedStatus:     String(e.status || '좋음'),
        }
      }
      metricEdits.value = nextEdits
    }

    const skipMsg = skipped > 0 ? ` (변경 안 함 ${skipped}건 스킵)` : ''
    if (failCount > 0) {
      alert(`저장 완료: 성공 ${okCount} / 실패 ${failCount}${skipMsg}\n\n실패 사유 (처음 3건):\n${errors.slice(0,3).join('\n')}`)
    } else {
      alert(`저장 완료: ${okCount}건${skipMsg}`)
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

/* =========================================================
 * 탭 3 — 검토 모달 (PR d / 2026-06-22)
 *   진단: docs/audit/2026-06-22-관리자-승인화면-수정승인-진단.md
 *   업체가 /biz-signup 으로 제출한 11 필드 표시 + 수정 + 승인/거절.
 *   approveStore / rejectStore 의 핵심 update 와 정합 (재호출 안 함 — form 통합 차이).
 *   firestore.rules / Cloud Functions / partners / 이미지 정책 변경 0.
 * ========================================================= */
const review = reactive({
  open: false,
  busy: false,
  storeId: '',
  applicant: { email: '', phone: '', createdAt: null },
  form: {
    name: '', phone: '', category: 'hopper', region: '강남',
    desc: '', detailDesc: '', address: '', hours: '', closed: '',
    wage: 0, wageType: 'hourly',
  },
  rejectReason: '',
  errorMsg: '',
  successMsg: '',
})

const reviewWageDisplay = computed(() => {
  const n = Number(review.form.wage || 0)
  return n ? String(n) : ''
})
function onReviewWageInput(e) {
  const digits = String(e.target.value || '').replace(/[^\d]/g, '')
  review.form.wage = digits ? Number(digits) : 0
}

async function openReview(s) {
  if (!s?.id) return
  // 폼 11 필드 채우기 (얕은 복사 — 도중에 onSnapshot 갱신돼도 폼 보존)
  review.storeId = s.id
  review.form.name       = s.name       || ''
  review.form.phone      = s.phone      || ''
  review.form.category   = s.category   || 'hopper'
  review.form.region     = s.region     || '강남'
  review.form.desc       = s.desc       || ''
  review.form.detailDesc = s.detailDesc || ''
  review.form.address    = s.address    || ''
  review.form.hours      = s.hours      || ''
  review.form.closed     = s.closed     || ''
  review.form.wage       = Number(s.wage || 0)
  review.form.wageType   = s.wageType   || 'hourly'
  // 신청자 정보 (stores) — 기본
  review.applicant.email     = s.ownerEmail || ''
  review.applicant.phone     = ''
  review.applicant.createdAt = s.createdAt || null
  // users(type=company) 추가 조회 — profile.phone (SMS 인증 휴대폰)
  // 실패해도 모달 자체는 열림 (이메일/생성일은 stores 측에 이미 있음)
  if (s.ownerId) {
    try {
      const usnap = await getDoc(doc(fbDb, 'users', s.ownerId))
      if (usnap.exists()) {
        const u = usnap.data() || {}
        review.applicant.phone = u?.profile?.phone || ''
        // 이메일 보강 (stores.ownerEmail 비어 있는 경우 대비)
        if (!review.applicant.email) {
          review.applicant.email = u?.profile?.email || ''
        }
      }
    } catch (e) {
      console.warn('[openReview] users getDoc fail:', e?.code || e?.message)
    }
  }
  review.rejectReason = ''
  review.errorMsg = ''
  review.successMsg = ''
  review.busy = false
  review.open = true
}

function closeReview() {
  if (review.busy) return
  review.open = false
  review.storeId = ''
  review.errorMsg = ''
  review.successMsg = ''
}

// 폼 11 필드만 추출 (소유자/상태/노출 필드 제외 — 이중 안전).
// updateDoc 의 payload 베이스.
function buildReviewFormPayload() {
  return {
    name:       review.form.name,
    phone:      review.form.phone,
    category:   review.form.category,
    region:     review.form.region,
    desc:       review.form.desc,
    detailDesc: review.form.detailDesc,
    address:    review.form.address,
    hours:      review.form.hours,
    closed:     review.form.closed,
    wage:       Number(review.form.wage || 0),
    wageType:   review.form.wageType,
  }
}

async function onReviewSaveOnly() {
  if (review.busy || !review.storeId) return
  if (!review.form.name) { review.errorMsg = '가게명을 입력해 주세요.'; return }
  review.busy = true
  review.errorMsg = ''
  review.successMsg = ''
  try {
    await updateDoc(doc(fbDb, 'stores', review.storeId), {
      ...buildReviewFormPayload(),
      updatedAt: serverTimestamp(),
    })
    review.successMsg = '저장되었습니다 (승인 대기 유지).'
  } catch (e) {
    review.errorMsg = '저장 실패: ' + (e?.message || e?.code || e)
  } finally {
    review.busy = false
  }
}

async function onReviewSaveAndApprove() {
  if (review.busy || !review.storeId) return
  if (!review.form.name) { review.errorMsg = '가게명을 입력해 주세요.'; return }
  if (!confirm(`'${review.form.name}' 을(를) 저장 후 즉시 승인하시겠습니까?`)) return
  review.busy = true
  review.errorMsg = ''
  review.successMsg = ''
  try {
    await updateDoc(doc(fbDb, 'stores', review.storeId), {
      ...buildReviewFormPayload(),
      approved: true,
      applyStatus: 'approved',
      'exposure.gangtalk': true,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    review.successMsg = '승인되었습니다. 현황판에 노출됩니다.'
    // pending 에서 사라지므로 잠시 후 모달 닫기 (UX)
    setTimeout(() => { if (review.open) closeReview() }, 800)
  } catch (e) {
    review.errorMsg = '승인 실패: ' + (e?.message || e?.code || e)
  } finally {
    review.busy = false
  }
}

async function onReviewReject() {
  if (review.busy || !review.storeId) return
  const reason = String(review.rejectReason || '').trim()
  const confirmMsg = reason
    ? `'${review.form.name || review.storeId}' 신청을 거절하시겠습니까?\n\n사유: ${reason}`
    : `'${review.form.name || review.storeId}' 신청을 거절하시겠습니까?\n(사유 미입력)`
  if (!confirm(confirmMsg)) return
  review.busy = true
  review.errorMsg = ''
  review.successMsg = ''
  try {
    // 폼 변경사항도 함께 저장 (재신청 시 도움) + reject 상태 + 사유
    await updateDoc(doc(fbDb, 'stores', review.storeId), {
      ...buildReviewFormPayload(),
      approved: false,
      applyStatus: 'rejected',
      rejectedReason: reason,
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    review.successMsg = '거절 처리되었습니다.'
    setTimeout(() => { if (review.open) closeReview() }, 800)
  } catch (e) {
    review.errorMsg = '거절 처리 실패: ' + (e?.message || e?.code || e)
  } finally {
    review.busy = false
  }
}

/* ===== 출근업소 완전 삭제 (Cloud Function deleteStoreFull) =====
 * 2중 confirm + 중복 클릭 방지. 백엔드가 5종 연관 데이터 정리.
 * partners(제휴처) 는 백엔드 함수가 절대 건드리지 않음 (PR #90).
 */
const deleting = ref({})
const fnDeleteStore = httpsCallable(
  getFunctions(undefined, 'asia-northeast3'),
  'deleteStoreFull',
)

async function deleteStore(s){
  if (!s?.id || deleting.value[s.id]) return
  const label = s.name || s.id

  // 1차 확인
  const c1 = window.confirm(
    `'${label}' 출근업소를 삭제하시겠습니까?\n\n` +
    `다음 데이터가 모두 함께 삭제됩니다:\n` +
    `· 현황판 지표 (rooms_biz)\n` +
    `· 별점 (ratings)\n` +
    `· 사용자 즐겨찾기 (favorites)\n` +
    `· 가게 이미지 (Storage)\n` +
    `· 노출 순서 (homeOrder / topRanks / listOrders)\n` +
    `· 업소 자체 (stores)\n\n` +
    `※ 제휴처(partners) 는 영향받지 않습니다.`
  )
  if (!c1) return

  // 2차 확인 — 더 강한 경고
  const c2 = window.confirm(
    `정말 '${label}' 을(를) 삭제하시겠습니까?\n` +
    `되돌릴 수 없습니다.`
  )
  if (!c2) return

  deleting.value = { ...deleting.value, [s.id]: true }
  try {
    const res = await fnDeleteStore({ storeId: s.id })
    const r = res?.data?.result
    // 단계별 결과 — 실패 단계 있으면 경고
    const fails = []
    if (r) {
      if (r.storage && !r.storage.ok) fails.push(`Storage(${r.storage.error || 'unknown'})`)
      if (r.roomsBiz && !r.roomsBiz.ok) fails.push(`rooms_biz(${r.roomsBiz.error || 'unknown'})`)
      if (r.ratings && !r.ratings.ok) fails.push(`ratings(${r.ratings.error || 'unknown'})`)
      if (r.favorites && !r.favorites.ok) fails.push(`favorites(${r.favorites.error || 'unknown'})`)
      if (r.marketingRefs && !r.marketingRefs.ok) fails.push(`marketingRefs(${r.marketingRefs.error || 'unknown'})`)
      if (r.storeDoc && !r.storeDoc.ok) fails.push(`stores(${r.storeDoc.error || 'unknown'})`)
    }
    if (fails.length) {
      alert(`'${label}' 삭제 — 일부 단계 실패:\n` + fails.join('\n'))
    } else {
      alert(`'${label}' 업소를 삭제했습니다.`)
    }
    // 로컬 stores ref 도 갱신 (onSnapshot 이 자동 갱신하지만 즉시 제거로 UX 향상)
    stores.value = stores.value.filter(x => x.id !== s.id)
  } catch (e) {
    console.error('[deleteStore] fail', e)
    alert(`삭제 실패: ${e?.message || e}`)
  } finally {
    const next = { ...deleting.value }
    delete next[s.id]
    deleting.value = next
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
.adm-btn.danger{
  background:#fff; color:#d92626; border-color:#f3b0b0;
}
.adm-btn.danger:hover:not(:disabled){
  background:#d92626; color:#fff; border-color:#d92626;
}
.adm-btn.danger:disabled{ opacity:.5; cursor:not-allowed; }
.adm-btn.sm{ height:28px; padding:0 10px; font-size:12px; }

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

/* ===== 새 업소 등록 모달 (관리자 직접 등록) ===== */
.adm-section-actions{ display:flex; gap:8px; align-items:center; }

.adm-modal-mask{
  position:fixed; inset:0; z-index:1000;
  background:rgba(0,0,0,.45);
  display:flex; align-items:center; justify-content:center;
  padding:16px;
}
.adm-modal{
  width:100%; max-width:520px; max-height:90vh;
  background:#fff; border-radius:16px;
  display:flex; flex-direction:column;
  box-shadow:0 12px 40px rgba(0,0,0,.2);
}
.adm-modal-wide{ max-width:720px; }
.adm-modal-head{
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 18px; border-bottom:1px solid #eee;
}
.adm-modal-head strong{ font-size:15px; font-weight:800; }
.adm-modal-close{
  background:transparent; border:none; font-size:18px;
  width:28px; height:28px; border-radius:50%; cursor:pointer;
}
.adm-modal-body{
  padding:16px 18px; overflow-y:auto;
  display:flex; flex-direction:column; gap:14px;
}
.adm-modal-foot{
  display:flex; gap:8px; justify-content:flex-end;
  padding:12px 18px; border-top:1px solid #eee;
}

/* ===== 검토 모달 (PR d) ===== */
.adm-review-applicant{
  padding:10px 12px;
  background:#fafafa; border:1px solid #eee; border-radius:8px;
  display:flex; flex-direction:column; gap:6px;
}
.adm-review-row{
  display:flex; gap:10px; align-items:center;
  font-size:13px;
}
.adm-review-label{
  min-width:110px;
  color:#888; font-weight:600;
}
.adm-review-value{
  flex:1;
  color:#222; font-weight:600;
  word-break:break-all;
}
.adm-review-image-note{
  margin:6px 0; padding:10px 12px;
  background:#fff5f8; border:1px dashed #ffd6e4; border-radius:8px;
  font-size:12px; color:#666; line-height:1.5;
}
.adm-review-foot{
  flex-wrap:wrap;
  justify-content:flex-end;
}
.adm-result-error{
  margin:6px 0 0; padding:8px 10px;
  background:#fff5f5; border:1px solid #fecaca; border-radius:6px;
  color:#c0392b; font-size:13px;
}
.adm-result-success{
  margin:6px 0 0; padding:8px 10px;
  background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px;
  color:#2e8b57; font-size:13px;
}
@media (max-width:560px){
  .adm-review-row{ flex-direction:column; align-items:flex-start; gap:2px; }
  .adm-review-label{ min-width:0; font-size:11px; }
  .adm-review-foot .adm-btn{ flex:1; min-width:0; }
}

/* 다크모드 보정 */
:root[data-theme="dark"] .adm-review-applicant,
:root[data-theme="black"] .adm-review-applicant{
  background:#1c1c1c; border-color:#2a2a2a;
}
:root[data-theme="dark"] .adm-review-label,
:root[data-theme="black"] .adm-review-label{ color:#999; }
:root[data-theme="dark"] .adm-review-value,
:root[data-theme="black"] .adm-review-value{ color:#eee; }
:root[data-theme="dark"] .adm-review-image-note,
:root[data-theme="black"] .adm-review-image-note{
  background:#2a1620; border-color:#3a2030; color:#ccc;
}
:root[data-theme="dark"] .adm-result-error,
:root[data-theme="black"] .adm-result-error{
  background:#2a1010; border-color:#5a2020; color:#ff8080;
}
:root[data-theme="dark"] .adm-result-success,
:root[data-theme="black"] .adm-result-success{
  background:#0a2010; border-color:#205a30; color:#80ff80;
}
.adm-modal-section-title{
  margin:8px 0 4px;
  font-size:14px; font-weight:800; color:#333;
  padding-bottom:6px; border-bottom:1px dashed #eee;
}

.adm-form-grid-2{
  display:grid; grid-template-columns:1fr 1fr; gap:12px;
}
@media (max-width:560px){ .adm-form-grid-2{ grid-template-columns:1fr; } }

.adm-field{ display:flex; flex-direction:column; gap:4px; }
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

/* 칩 그룹 (BizMyStorePage 패턴) */
.adm-chip-grid{ display:flex; flex-wrap:wrap; gap:6px; }
.adm-chip{
  min-height:36px; padding:0 12px;
  border:1.5px solid #eee; border-radius:8px;
  background:#fff; color:#333;
  font-size:13px; font-weight:600; font-family:inherit;
  cursor:pointer;
  transition:border-color .12s, background .12s, color .12s;
}
.adm-chip:hover{ border-color:#ffd6e4; }
.adm-chip.on{ background:#ff2e7e; border-color:#ff2e7e; color:#fff; }

/* PR #111 (라디오/체크박스/결과 패널) CSS 는 PR e (2026-06-22) 에서 제거됨.
   PR #115 검토 모달은 별도 클래스 (.adm-review-*) 사용. */

/* 다크모드 보정 */
:root[data-theme="dark"] .adm-modal,
:root[data-theme="black"] .adm-modal{ background:#1c1c1c; color:#eee; }
:root[data-theme="dark"] .adm-modal-head,
:root[data-theme="black"] .adm-modal-head,
:root[data-theme="dark"] .adm-modal-foot,
:root[data-theme="black"] .adm-modal-foot{ border-color:#2a2a2a; }
:root[data-theme="dark"] .adm-modal-section-title,
:root[data-theme="black"] .adm-modal-section-title{ color:#ddd; border-bottom-color:#2a2a2a; }
:root[data-theme="dark"] .adm-field input,
:root[data-theme="dark"] .adm-field textarea,
:root[data-theme="dark"] .adm-field select,
:root[data-theme="black"] .adm-field input,
:root[data-theme="black"] .adm-field textarea,
:root[data-theme="black"] .adm-field select{ background:#222; border-color:#2a2a2a; color:#eee; }
:root[data-theme="dark"] .adm-chip,
:root[data-theme="black"] .adm-chip{ background:#222; border-color:#2a2a2a; color:#ddd; }
/* .adm-radio-detail / .adm-result-* 다크 보정은 PR e 에서 PR #111 제거와 함께 삭제됨. */
</style>
