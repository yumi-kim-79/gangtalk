<!-- src/mypage/AdminPendingLists.vue -->

<template>
  <section v-if="isAdmin" class="section">
    <!-- 등록신청(업체) -->
    <div class="admin-pending">
      <h3 class="sub">등록신청 목록</h3>
      <div v-if="!admin.pending.length" class="empty"><p>대기중인 등록신청이 없습니다.</p></div>

      <article v-for="s in admin.pending" :key="s.id" class="pro-card">
        <div class="pro-top">
          <div class="pro-thumb" :style="bgStyle(s.thumb || '')"></div>
          <div class="pro-meta">
            <div class="pro-name ellip">{{ s.name || s.id }}</div>
            <div class="pro-sub ellip">
              {{ s.region || '-' }} · {{ catLabel(normalizeCat(s.category || 'etc')) }}
            </div>
            <div class="pro-chips">
              <span v-if="hourlyOf(s)" class="chip wage">시급 {{ formatWon(hourlyOf(s)) }}</span>
            </div>
            <div class="pro-chips">
              <span class="chip strong"><b>{{ s.match || 0 }}</b> 맞출방</span>
              <span class="chip strong"><b>{{ s.persons || 0 }}</b> 맞출인원</span>
            </div>
            <div class="apply"><span class="badge pending">검토중</span></div>
          </div>
        </div>

        <!-- 액션: 보기/승인/거절/삭제 -->
        <div class="pro-actions">
          <button class="btn" @click.stop="openStore(s)">보기/편집</button>
          <span class="spacer"></span>
          <button class="btn primary" @click.stop="approveStoreLocal(s)">승인</button>
          <button class="btn" @click.stop="rejectStoreLocal(s)">거절</button>
          <button class="btn danger" @click.stop="removeStoreReq(s)">삭제</button>
        </div>

        <div class="pro-period" v-if="s.adStart || s.adEnd">
          <span>광고기간</span>
          <strong>{{ fmtDate(s.adStart) }} ~ {{ fmtDate(s.adEnd) }}</strong>
        </div>

        <!-- ✅ 등록신청 시 계산된 광고비 요약 (있을 때만 표시) -->
        <div class="bill-mini" v-if="adDaysOf(s) > 0">
          <b>{{ adDaysOf(s) }}</b>일 × <b>5,000</b>원 =
          <b>{{ formatWon(adCostOf(s)) }}</b>
        </div>
      </article>
    </div>

    <!-- 제휴업체 등록신청 -->
    <div class="admin-pending">
      <h3 class="sub">제휴업체 등록신청 목록</h3>
      <div v-if="!admin.partnerPending.length" class="empty">
        <p>대기중인 제휴신청이 없습니다.</p>
      </div>

      <article v-for="p in admin.partnerPending" :key="p.id" class="pro-card">
        <div class="pro-top">
          <div class="pro-thumb" :style="bgStyle(p.thumb || '')"></div>
          <div class="pro-meta">
            <div class="pro-name ellip">{{ p.name || p.id }}</div>
            <div class="pro-sub ellip">
              {{ p.region || '-' }} · {{ catLabel(normalizeCat(p.category || 'etc')) }}
            </div>
            <p v-if="p.desc" class="pro-desc">{{ p.desc }}</p>
            <div class="pro-chips">
              <span v-for="t in (p.tags || [])" :key="t" class="chip">{{ t }}</span>
            </div>
          </div>
        </div>

        <!-- 액션: 보기/승인/거절/삭제 -->
        <div class="pro-actions">
          <button class="btn" @click.stop="openPartner(p)">보기/편집</button>
          <span class="spacer"></span>
          <button class="btn primary" @click.stop="approvePartnerLocal(p)">승인</button>
          <button class="btn" @click.stop="rejectPartnerLocal(p)">거절</button>
          <button class="btn danger" @click.stop="removePartnerReq(p)">삭제</button>
        </div>

        <div class="pro-period" v-if="p.adStart || p.adEnd">
          <span>광고기간</span>
          <strong>{{ fmtDate(p.adStart) }} ~ {{ fmtDate(p.adEnd) }}</strong>
        </div>

        <div class="bill-mini" v-if="adDaysOf(p) > 0">
          <b>{{ adDaysOf(p) }}</b>일 × <b>5,000</b>원 = <b>{{ formatWon(adCostOf(p)) }}</b>
        </div>
      </article>
    </div>

    <!-- 연장신청 -->
    <div class="admin-pending">
      <h3 class="sub">연장신청 목록</h3>
      <div v-if="!admin.extendPending.length" class="empty">
        <p>대기중인 연장신청이 없습니다.</p>
      </div>

      <article v-for="r in admin.extendPending" :key="r.id" class="pro-card">
        <div class="pro-top">
          <div
            class="pro-thumb"
            :style="bgStyle(
              r.storeThumb || r.partnerThumb || r.thumb || r._thumb ||
              r._target?.thumb || r._target?.image || ''
            )"
          ></div>
          <div class="pro-meta">
            <div class="pro-name ellip">
              {{ r.storeName || r.partnerName || r.name || r._name || r.storeId || r.partnerId || r.targetId || r.id }}
            </div>
            <div class="pro-sub ellip">
              {{ r.storeRegion || r.partnerRegion || r._region || r._target?.region || '-' }}
              ·
              {{ catLabel(normalizeCat(r.storeCategory || r.partnerCategory || r._category || r._target?.category || 'etc')) }}
            </div>

            <div class="pro-chips">
              <span class="chip strong"><b>{{ r.days }}</b> 일 연장</span>
              <span class="chip strong"><b>{{ formatWon(unitOf(r)) }}</b> /일</span>
            </div>
            <div class="bill-mini final" style="margin-top:6px;">
              <b>{{ formatWon(totalOf(r)) }}</b>
            </div>
            <small class="muted">신청: {{ timeAgo(r.createdAt) }} 전</small>
          </div>
        </div>

        <!-- 액션: 보기/승인/거절/삭제 -->
        <div class="pro-actions">
          <button class="btn" @click.stop="openExtend(r)">보기/편집</button>
          <span class="spacer"></span>
          <button class="btn primary" @click.stop="approveExtendLocal(r)">승인</button>
          <button class="btn" @click.stop="rejectExtendLocal(r)">거절</button>
          <button class="btn danger" @click.stop="removeExtendReq(r)">삭제</button>
        </div>

        <div class="pro-period">
          <span>승인 시 변경될 광고기간</span>
          <strong>{{ previewAfterApprove(r) }}</strong>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { nextTick } from 'vue'

/**
 * 부모가 실제 삭제(Firestore 등)를 처리할 수 있도록
 * 아래 3개 콜백을 전달해 주세요.
 * - deleteStoreReq(item): Promise<void>
 * - deletePartnerReq(item): Promise<void>
 * - deleteExtendReq(item): Promise<void>
 *
 * 콜백이 전달되지 않으면 화면 목록에서만 제거됩니다(폴백).
 */
const props = defineProps({
  isAdmin: { type: Boolean, required: true },
  admin:   { type: Object,   required: true },
  // helpers
  bgStyle:     { type: Function, required: true },
  fmtDate:     { type: Function, required: true },
  formatWon:   { type: Function, required: true },
  timeAgo:     { type: Function, required: true },
  normalizeCat:{ type: Function, required: true },
  catLabel:    { type: Function, required: true },
  adDaysOf:    { type: Function, required: true },
  adCostOf:    { type: Function, required: true },
  hourlyOf:    { type: Function, required: true },
  unitOf:      { type: Function, required: true },
  totalOf:     { type: Function, required: true },
  previewAfterApprove: { type: Function, required: true },
  // 🔸 삭제 콜백(있으면 우선 사용)
  deleteStoreReq:   { type: Function, default: null },
  deletePartnerReq: { type: Function, default: null },
  deleteExtendReq:  { type: Function, default: null },
  // 🔸 승인/거절/상세 콜백(있으면 우선 사용)
  approveStore:       { type: Function, default: null },
  rejectStore:        { type: Function, default: null },
  openStoreDetail:    { type: Function, default: null },

  approvePartnerReq:  { type: Function, default: null },
  rejectPartnerReq:   { type: Function, default: null },
  openPartnerDetail:  { type: Function, default: null },

  approveExtendReq:   { type: Function, default: null },
  rejectExtendReq:    { type: Function, default: null },
  openExtendDetail:   { type: Function, default: null },
})

function confirmDelete(name = '이 항목') {
  return window.confirm(`정말로 "${name}" 신청을 삭제할까요?`)
}

/** 공통: 배열에서 id로 제거 */
function removeById(list, id) {
  const i = Array.isArray(list) ? list.findIndex(v => v?.id === id) : -1
  if (i >= 0) list.splice(i, 1)
}

/** 등록신청 삭제 */
async function removeStoreReq(s) {
  const name = s?.name || s?.id || '등록신청'
  if (!confirmDelete(name)) return
  try {
    if (typeof props.deleteStoreReq === 'function') {
      await props.deleteStoreReq(s)
    }
    removeById(props.admin.pending, s.id)
    await nextTick()
    alert('삭제되었습니다.')
  } catch (e) {
    console.error('[AdminPendingLists] removeStoreReq fail:', e)
    alert(`삭제 실패: ${e?.message || e}`)
  }
}

/** 제휴업체 등록신청 삭제 */
async function removePartnerReq(p) {
  const name = p?.name || p?.id || '제휴신청'
  if (!confirmDelete(name)) return
  try {
    if (typeof props.deletePartnerReq === 'function') {
      await props.deletePartnerReq(p)
    }
    removeById(props.admin.partnerPending, p.id)
    await nextTick()
    alert('삭제되었습니다.')
  } catch (e) {
    console.error('[AdminPendingLists] removePartnerReq fail:', e)
    alert(`삭제 실패: ${e?.message || e}`)
  }
}

/** 연장신청 삭제 */
async function removeExtendReq(r) {
  const name = r?.name || r?.id || '연장신청'
  if (!confirmDelete(name)) return
  try {
    if (typeof props.deleteExtendReq === 'function') {
      await props.deleteExtendReq(r)
    }
    removeById(props.admin.extendPending, r.id)
    await nextTick()
    alert('삭제되었습니다.')
  } catch (e) {
    console.error('[AdminPendingLists] removeExtendReq fail:', e)
    alert(`삭제 실패: ${e?.message || e}`)
  }
}
/** 업체 신청 상세 열기 (폼으로 이동 등) */
function openStore(s) {
  if (!s) return
  if (typeof props.openStoreDetail === 'function') {
    // 부모에서 라우터 처리 (예: StoreEditPage 로 이동)
    props.openStoreDetail(s)
  }
}

/** 제휴 신청 상세 열기 */
function openPartner(p) {
  if (!p) return
  if (typeof props.openPartnerDetail === 'function') {
    props.openPartnerDetail(p)
  }
}

/** 연장 신청 상세 열기 */
function openExtend(r) {
  if (!r) return
  if (typeof props.openExtendDetail === 'function') {
    props.openExtendDetail(r)
  }
}

/** 업체 신청 승인 */
async function approveStoreLocal(s) {
  const name = s?.name || s?.id || '등록신청'
  if (!window.confirm(`"${name}" 신청을 승인할까요?`)) return
  try {
    if (typeof props.approveStore === 'function') {
      await props.approveStore(s)
    }
    // 승인 후 목록에서 제거
    removeById(props.admin.pending, s.id)
    await nextTick()
    alert('승인 처리되었습니다.')
  } catch (e) {
    console.error('[AdminPendingLists] approveStoreLocal fail:', e)
    alert(`승인 실패: ${e?.message || e}`)
  }
}

/** 업체 신청 거절 */
async function rejectStoreLocal(s) {
  const name = s?.name || s?.id || '등록신청'
  const reason = window.prompt(
    `"${name}" 신청을 거절하는 사유를 입력해 주세요.`,
    s?.lastRejectReason || ''
  )
  if (reason === null) return
  try {
    if (typeof props.rejectStore === 'function') {
      await props.rejectStore({ ...s, reason })
    }
    removeById(props.admin.pending, s.id)
    await nextTick()
    alert('거절 처리되었습니다.')
  } catch (e) {
    console.error('[AdminPendingLists] rejectStoreLocal fail:', e)
    alert(`거절 실패: ${e?.message || e}`)
  }
}

/** 제휴 신청 승인 */
async function approvePartnerLocal(p) {
  const name = p?.name || p?.id || '제휴신청'
  if (!window.confirm(`"${name}" 제휴신청을 승인할까요?`)) return
  try {
    if (typeof props.approvePartnerReq === 'function') {
      await props.approvePartnerReq(p)
    }
    removeById(props.admin.partnerPending, p.id)
    await nextTick()
    alert('승인 처리되었습니다.')
  } catch (e) {
    console.error('[AdminPendingLists] approvePartnerLocal fail:', e)
    alert(`승인 실패: ${e?.message || e}`)
  }
}

/** 제휴 신청 거절 */
async function rejectPartnerLocal(p) {
  const name = p?.name || p?.id || '제휴신청'
  const reason = window.prompt(
    `"${name}" 제휴신청을 거절하는 사유를 입력해 주세요.`,
    p?.reason || ''
  )
  if (reason === null) return
  try {
    if (typeof props.rejectPartnerReq === 'function') {
      await props.rejectPartnerReq({ ...p, reason })
    }
    removeById(props.admin.partnerPending, p.id)
    await nextTick()
    alert('거절 처리되었습니다.')
  } catch (e) {
    console.error('[AdminPendingLists] rejectPartnerLocal fail:', e)
    alert(`거절 실패: ${e?.message || e}`)
  }
}

/** 연장 신청 승인 */
async function approveExtendLocal(r) {
  if (!window.confirm('이 연장신청을 승인할까요?')) return
  try {
    if (typeof props.approveExtendReq === 'function') {
      await props.approveExtendReq(r)
    }
    removeById(props.admin.extendPending, r.id)
    await nextTick()
    alert('승인 처리되었습니다.')
  } catch (e) {
    console.error('[AdminPendingLists] approveExtendLocal fail:', e)
    alert(`승인 실패: ${e?.message || e}`)
  }
}

/** 연장 신청 거절 */
async function rejectExtendLocal(r) {
  const reason = window.prompt(
    '연장신청을 거절하는 사유를 입력해 주세요.',
    r?.reason || ''
  )
  if (reason === null) return
  try {
    if (typeof props.rejectExtendReq === 'function') {
      await props.rejectExtendReq({ ...r, reason })
    }
    removeById(props.admin.extendPending, r.id)
    await nextTick()
    alert('거절 처리되었습니다.')
  } catch (e) {
    console.error('[AdminPendingLists] rejectExtendLocal fail:', e)
    alert(`거절 실패: ${e?.message || e}`)
  }
}

</script>
