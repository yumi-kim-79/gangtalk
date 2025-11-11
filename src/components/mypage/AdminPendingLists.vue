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

        <!-- 액션: 삭제만 남김 -->
        <div class="pro-actions">
          <button class="btn danger" @click.stop="removeStoreReq(s)">삭제</button>
        </div>

        <div class="pro-period" v-if="s.adStart || s.adEnd">
          <span>광고기간</span>
          <strong>{{ fmtDate(s.adStart) }} ~ {{ fmtDate(s.adEnd) }}</strong>
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

        <!-- 액션: 삭제만 남김 -->
        <div class="pro-actions">
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

        <!-- 액션: 삭제만 남김 -->
        <div class="pro-actions">
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
</script>
