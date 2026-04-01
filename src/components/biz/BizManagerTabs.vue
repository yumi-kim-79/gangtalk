<!-- src/components/biz/BizManagerTabs.vue -->
<template>
  <section v-if="mode !== 'none'" class="biz-manage">
    <!-- 탭 헤더 -->
    <div class="tabs" v-if="visibleTabs.length > 1">
      <button
        v-for="t in visibleTabs"
        :key="t.key"
        class="tab"
        :class="{ active: tab === t.key }"
        :data-key="t.key"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
      <div class="spacer" />
      <div v-if="category" class="cat-chip">{{ categoryLabel }}</div>
    </div>

    <!-- 컨텐츠 -->
    <div class="panel">
      <!-- ▣ 신청 작성 (기업회원 + 관리자 공용) -->
      <div v-if="tab==='create' && (mode==='enterprise' || mode==='admin')" class="pane">
        <header class="pane-head">
          <strong>{{ displayCreateTitle }}</strong>
          <button class="btn primary" @click="openCreate">{{ displayCreateButton }}</button>
        </header>

        <!-- 기업회원 안내 -->
        <p v-if="mode==='enterprise'" class="hint">
          신청 후 관리자가 확인합니다. (기업회원은 신청 목록을 별도로 볼 수 없고,
          관리자가 이메일/푸시로 접수 내용을 확인합니다)
        </p>

        <!-- 관리자 안내 -->
        <p v-else class="hint">
          관리자 계정으로 바로 등록신청을 작성하거나, 대신 접수할 수 있습니다.
          작성된 신청은 아래 ‘신청목록’ 탭에서도 확인할 수 있습니다.
        </p>
      </div>

      <!-- ▣ (관리자 전용) 신청 목록 -->
      <div v-if="tab==='recent' && mode==='admin'" class="pane">
        <header class="pane-head">
          <strong>신청목록</strong>
          <div class="gap"></div>
          <!-- 신청목록 접기 / 보기 토글 버튼 -->
          <button class="btn" type="button" @click="adminOpen = !adminOpen">
            {{ adminOpen ? '접기' : '보기' }}
          </button>
          <button class="btn" type="button" @click="reloadAdmin">새로고침</button>
        </header>

        <ul v-if="adminOpen" class="cards">
          <li
            v-for="a in adminAll"
            :key="a._id"
            class="card"
            @click="openAdminDetail(a)"
          >
            <div class="row">
              <div>
                <strong class="name">
                  {{ a.companyName || a.name || '-' }}
                  <span class="type-chip">({{ typeLabel(a.type) }})</span>
                </strong>

                <!-- 상태 배지 -->
                <div class="status-line">
                  <span
                    class="status-badge"
                    :class="statusClass(a.status)"
                  >
                    {{ statusLabel(a.status) }}
                  </span>
                  <span
                    v-if="a.status === 'rejected' && a.reason"
                    class="reason"
                  >
                    (사유: {{ a.reason }})
                  </span>
                </div>

                <span class="meta">
                  {{ a.phone || a.email || '-' }}
                </span>
                <div class="meta2">
                  담당: {{ a.contactName || '-' }}
                  <span class="sep">|</span>
                  작성자: {{ a.createdByEmail || a.createdByUid || '-' }}
                  <span class="sep">|</span>
                  {{ dt(a.createdAt) }}
                </div>
                <div class="extra" v-if="a.message">{{ a.message }}</div>
                <div
                  class="extra"
                  v-if="a.extra && (a.extra.category || a.extra.address)"
                >
                  <span v-if="a.extra?.category">#{{ a.extra.category }}</span>
                  <span v-if="a.extra?.address"> · {{ a.extra.address }}</span>
                </div>

                <!-- ✅ 광고 신청일 때: 기간/금액 요약 한 줄 표시 -->
                <div
                  class="extra bill-mini"
                  v-if="a.type === 'ad'"
                >
                  <span>광고기간 <b>{{ a.days || AD_DEFAULT_DAYS }}</b>일</span>
                  <span class="sep">|</span>
                  <span>예상금액 <b>{{ formatWon(adAmountOf(a)) }}</b></span>
                </div>
              </div>

              <div class="gap"></div>

              <!-- 카드 우측: 액션 버튼 -->
              <div class="btn-col">
                <button
                  class="btn"
                  type="button"
                  @click.stop="openAdminDetail(a)"
                >
                  보기/편집
                </button>
                <button
                  class="btn primary"
                  type="button"
                  @click.stop="approve(a)"
                >
                  승인
                </button>
                <button
                  class="btn"
                  type="button"
                  @click.stop="reject(a)"
                >
                  거절
                </button>
                <button
                  class="btn danger"
                  type="button"
                  @click.stop="remove(a)"
                >
                  삭제
                </button>
              </div>
            </div>
          </li>
        </ul>
        <Empty
          v-if="adminOpen && adminAll.length===0"
          label="표시할 신청이 없습니다"
        />
      </div>
    </div>

    <!-- 작성 모달 (기업회원용) -->
    <dialog ref="dlg">
      <form class="editor" @submit.prevent="save">
        <h3>{{ isAd ? '새 광고 신청' : createTitleText }}</h3>

        <label>카테고리
          <input v-model.trim="form.category" placeholder="예) 네일, 성형외과, 카페" required />
        </label>
        <label>가게명
          <input v-model.trim="form.name" placeholder="상호명" required />
        </label>
        <label>담당자명
          <input v-model.trim="form.contactName" placeholder="홍길동" />
        </label>
        <label>연락 이메일
          <input v-model.trim="form.email" type="email" :placeholder="emailPlaceholder" />
        </label>
        <label>전화번호
          <input v-model.trim="form.phone" placeholder="010-0000-0000" />
        </label>
        <label>주소
          <input v-model.trim="form.address" placeholder="도로명 주소" />
        </label>
        <label>요청사항
          <textarea v-model.trim="form.message" rows="4" placeholder="요청/설명 사항을 적어주세요" />
        </label>

        <!-- 🔥 광고 신청일 때만 기간/비용 + 계좌 안내 -->
        <section v-if="isAd" class="ad-bill-section">
          <div class="bill compact">
            <div class="li">
              <span>광고기간</span>
              <span class="li-right">
                <select v-model.number="formDays" class="days-select">
                  <option v-for="d in adDayOptions" :key="d" :value="d">
                    {{ d }}일
                  </option>
                </select>
              </span>
            </div>
            <div class="li">
              <span>단가</span>
              <span class="li-right">
                <b class="amt">{{ formatWon(AD_PRICE_PER_DAY) }}</b>
              </span>
            </div>
            <div class="li total">
              <span>예상 결제금액</span>
              <span class="li-right">
                <b class="amt">{{ formatWon(adTotalCost) }}</b>
              </span>
            </div>
          </div>

          <div class="account">
            <div class="acc-bank">입금 계좌 (임시)</div>
            <div class="acc-owner">우리은행 1002-000-123456 · 예금주 ㈜강톡</div>
            <small class="muted sm">* 실제 계좌 정보는 추후 변경될 수 있습니다.</small>

            <!-- ✅ 안내 문구 추가 -->
            <small class="muted sm">
              입금자는 <b>상호명</b>으로 입금해 주세요. 입금 확인 후 등록이 완료됩니다.
            </small>
          </div>
        </section>

        <div class="rows">
          <button type="button" class="btn" @click="closeDlg">취소</button>
          <div class="gap"></div>
          <button type="submit" class="btn primary">신청</button>
        </div>
      </form>
    </dialog>

    <!-- 관리자용 신청 상세/편집 모달 -->
    <dialog ref="adminDlg">
      <form class="editor" @submit.prevent="saveAdmin">
        <h3>신청 상세 / 편집</h3>

        <p class="status-line" v-if="adminForm.id">
          <span
            class="status-badge"
            :class="statusClass(adminForm.status)"
          >
            {{ statusLabel(adminForm.status) }}
          </span>
        </p>

        <label>카테고리
          <input
            v-model.trim="adminForm.category"
            placeholder="예) 네일, 성형외과, 카페"
          />
        </label>
        <label>가게명
          <input
            v-model.trim="adminForm.name"
            placeholder="상호명"
          />
        </label>
        <label>담당자명
          <input
            v-model.trim="adminForm.contactName"
            placeholder="홍길동"
          />
        </label>
        <label>연락 이메일
          <input
            v-model.trim="adminForm.email"
            type="email"
          />
        </label>
        <label>전화번호
          <input
            v-model.trim="adminForm.phone"
            placeholder="010-0000-0000"
          />
        </label>
        <label>주소
          <input
            v-model.trim="adminForm.address"
            placeholder="도로명 주소"
          />
        </label>
        <label>요청사항
          <textarea
            v-model.trim="adminForm.message"
            rows="4"
            placeholder="요청/설명 사항을 적어주세요"
          />
        </label>

        <!-- 🔥 광고 신청 + 광고비 있는 업체등록 모두 표시 -->
        <section
          v-if="adminForm.type === 'ad' || (adminForm.type === 'store' && adminForm.amount > 0)"
          class="ad-bill-section"
        >
          <div class="bill compact">
            <div class="li">
              <span>광고기간</span>
              <span class="li-right">
                <input
                  v-model.number="adminForm.days"
                  type="number"
                  min="1"
                  max="365"
                  class="days-select"
                />
                <b class="amt">일</b>
              </span>
            </div>
            <div class="li">
              <span>단가</span>
              <span class="li-right">
                <!-- ✅ 신청 당시 저장된 단가 사용 -->
                <b class="amt">{{ formatWon(adminForm.unit || AD_PRICE_PER_DAY) }}</b>
              </span>
            </div>
            <div class="li total">
              <span>예상 결제금액</span>
              <span class="li-right">
                <!-- ✅ days × unit 계산 결과 -->
                <b class="amt">{{ formatWon(adminAdTotalCost) }}</b>
              </span>
            </div>
          </div>

          <div class="account">
            <div class="acc-bank">입금 계좌 (임시)</div>
            <div class="acc-owner">우리은행 1002-000-123456 · 예금주 ㈜강톡</div>
            <small class="muted sm">* 실제 계좌 정보는 추후 변경될 수 있습니다.</small>

            <!-- ✅ 안내 문구 추가 -->
            <small class="muted sm">
              입금자는 <b>상호명</b>으로 입금해 주세요. 입금 확인 후 등록이 완료됩니다.
            </small>
          </div>
        </section>

        <div class="rows">
          <button type="button" class="btn" @click="closeAdminDlg">
            닫기
          </button>
          <div class="gap"></div>
          <button type="button" class="btn" @click="reject()">
            거절
          </button>
          <button type="button" class="btn primary" @click="approve()">
            승인
          </button>
          <button type="submit" class="btn">
            수정 저장
          </button>
        </div>
      </form>
    </dialog>
  </section>
</template>

<script setup>
/* src/components/biz/BizManagerTabs.vue */
import { ref, computed, onMounted, onUnmounted, watch, defineComponent, h } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db as fbDb } from '@/firebase'

import {
  collection, doc, getDoc, getDocs, query, where,
  addDoc, setDoc, serverTimestamp, deleteDoc
} from 'firebase/firestore'

/* ── props ── */
const props = defineProps({
  category: { type: String, default: '' },        // 현재 페이지 카테고리
  /**
   * 'ad' | 'store' | 'partner' | 'all'
   * - 기업회원 모드: create 탭만 사용 → 'store'/'ad' 의미 유지
   * - 관리자 모드: 'all'이면 ads + applications 합쳐서 한 번만 표시
   */
  kind: { type: String, default: 'store' },
  createTitle: { type: String, default: '등록신청' },
  createButtonLabel: { type: String, default: '새 매장 등록 신청' },
  createTabLabel: { type: String, default: '등록신청' },
})

/* ── 광고/제휴 스위치(기업회원 작성 화면에서만 의미) ── */
const isAd = computed(() => props.kind === 'ad')
const createTitleText  = computed(() =>
  props.kind === 'partner' ? '새 제휴 업체 신청' : '새 매장 등록 신청'
)

/* ── 제목/버튼 라벨 ── */
const displayCreateTitle = computed(() =>
  props.createTitle || (isAd.value ? '광고신청' : (props.kind === 'partner' ? '제휴 신청' : '등록신청'))
)
const displayCreateButton = computed(() =>
  props.createButtonLabel || (isAd.value ? '새 광고 신청' : (props.kind === 'partner' ? '새 제휴 신청' : '새 매장 등록 신청'))
)

/* ── 가격 관련 상수/계산 ── */
const AD_PRICE_PER_DAY = 5000
const AD_DEFAULT_DAYS = 30

const adDayOptions = [7, 15, 30, 60, 90]
const formDays = ref(30)
const adTotalCost = computed(() => AD_PRICE_PER_DAY * Math.max(1, Number(formDays.value || 0)))
const formatWon = (n) => (Number(n || 0)).toLocaleString('ko-KR') + '원'

/** ✅ 신청 객체(a)에서 실제 광고 금액 계산 */
const adAmountOf = (a) => {
  if (!a || a.type !== 'ad') return 0
  const days = Math.max(1, Number(a.days || AD_DEFAULT_DAYS))
  const unit = Number(a.unit || AD_PRICE_PER_DAY)
  return days * unit
}

/* ── 역할 판별 ── */
const mode = ref('none') // 'enterprise' | 'admin' | 'none'
const uid = ref('')
const auth = getAuth()
const router = useRouter()

async function resolveRole(u){
  if(!u){ mode.value = 'none'; uid.value = ''; return }
  uid.value = u.uid

  // 1) 관리자
  const adminDoc = await getDoc(doc(fbDb, 'admins', u.uid))
  if (adminDoc.exists()) { mode.value = 'admin'; return }

  // 2) 기업회원
  const userDoc = await getDoc(doc(fbDb, 'users', u.uid))
  if (userDoc.exists()) {
    const data = userDoc.data() || {}
    const rawType = (data.type || data.profile?.type || '').toString().toLowerCase()
    if (['enterprise','company','biz','partner'].includes(rawType)) {
      mode.value = 'enterprise'
      return
    }
  }
  mode.value = 'none'
}

onMounted(() => {
  resolveRole(auth.currentUser)
  onAuthStateChanged(auth, resolveRole)
})

/* ── 탭 구성 ── */
const tab = ref('create')
const tabs = computed(() => {
  // 마이페이지(AdminTools)에서 쓰는 경우(kind === 'all'):
  if (mode.value === 'admin' && props.kind === 'all') {
    return [
      { key: 'recent', label: '신청목록', role: ['admin'] },
    ]
  }

  // 그 외 (가게찾기/제휴관 플로팅 패널 등)
  return [
    { key: 'create', label: props.createTabLabel || '등록신청', role: ['enterprise', 'admin'] },
    { key: 'recent', label: '신청목록', role: ['admin'] },
  ]
})

const visibleTabs = computed(() => tabs.value.filter(t => t.role.includes(mode.value)))

watch(
  [mode, () => props.kind],
  () => {
    if (mode.value === 'admin' && props.kind === 'all') {
      tab.value = 'recent'
    } else {
      tab.value = 'create'
    }
  },
  { immediate: true }
)

/* ── 공통 유틸 ── */
function dt(v){
  try {
    if (v?.seconds) return new Date(v.seconds*1000).toLocaleString()
    return new Date(v).toLocaleString()
  } catch { return '' }
}
const typeLabel = (t) => t === 'ad' ? '광고' : (t === 'store' ? '업체' : '제휴')

const statusLabel = (s) =>
  s === 'approved'
    ? '승인'
    : s === 'rejected'
    ? '거절'
    : '승인대기'

const statusClass = (s) =>
  s === 'approved' ? 'approved' : s === 'rejected' ? 'rejected' : 'pending'

/* ── 관리자: 신청 상세/편집 모달 ── */
const adminDlg = ref(null)
const adminForm = ref({
  id: '',
  col: '',
  type: '',
  status: 'pending',
  name: '',
  category: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  message: '',
  days: AD_DEFAULT_DAYS,      // ✅ 광고기간
  unit: AD_PRICE_PER_DAY,     // ✅ 단가
  amount: 0,                  // ✅ 총 금액
})

// ✅ 관리자 모달에서 총 결제금액 표시용
const adminAdTotalCost = computed(() => {
  const f = adminForm.value
  if (!f) return 0

  // 신청에 amount가 저장돼 있으면 그 값을 최우선 사용
  if (Number(f.amount || 0) > 0) {
    return Number(f.amount || 0)
  }

  // 없으면 days × unit 으로 계산
  const days = Math.max(1, Number(f.days || AD_DEFAULT_DAYS))
  const unit = Number(f.unit || AD_PRICE_PER_DAY)
  return unit * days
})

function openAdminDetail(a) {
  if (!a) return

  const days = Number(a.days || AD_DEFAULT_DAYS)
  const unit = Number(a.unit || AD_PRICE_PER_DAY)
  const amount = Number(a.amount || days * unit)

  adminForm.value = {
    id: a._id,
    col: a._col,
    type: a.type,
    status: a.status || 'pending',
    name: a.companyName || a.name || '',
    category: a.category || '',
    contactName: a.contactName || '',
    email: a.email || a.createdByEmail || '',
    phone: a.phone || '',
    address: a.address || '',
    message: a.message || '',
    days,
    unit,
    amount,
  }

  adminDlg.value?.showModal()
}

function closeAdminDlg() {
  adminDlg.value?.close()
}

/** 관리자: 내용 수정 저장 */
async function saveAdmin() {
  if (mode.value !== 'admin') return
  const f = adminForm.value
  if (!f.id) return

  try {
    if (f.type === 'store') {
      await setDoc(
        doc(fbDb, 'stores', f.id),
        {
          name: f.name,
          category: f.category || '',
          address: f.address || '',
          manager: f.contactName || '',
          phone: f.phone || '',
          ownerEmail: f.email || '',
          detailDesc: f.message || '',
          applyStatus: f.status || 'pending',
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    } else if (f.type === 'partner') {
      await setDoc(
        doc(fbDb, 'partnerRequests', f.id),
        {
          name: f.name,
          category: f.category || '',
          address: f.address || '',
          contactName: f.contactName || '',
          phone: f.phone || '',
          email: f.email || '',
          desc: f.message || '',
          status: f.status || 'pending',
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    } else if (f.type === 'ad') {
      const days = Math.max(1, Number(f.days || AD_DEFAULT_DAYS))
      const unit = Number(f.unit || AD_PRICE_PER_DAY)
      const amount = days * unit

      await setDoc(
        doc(fbDb, 'applications', f.id),
        {
          companyName: f.name,
          contactName: f.contactName || '',
          phone: f.phone || '',
          email: f.email || '',
          message: f.message || '',
          extra: {
            category: f.category || '',
            address: f.address || '',
          },
          days,
          unit,
          amount,
          status: f.status || 'pending',
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    }

    adminAll.value = adminAll.value.map((x) =>
      x._id === f.id
        ? {
            ...x,
            companyName: f.name,
            name: f.name,
            category: f.category,
            address: f.address,
            contactName: f.contactName,
            phone: f.phone,
            email: f.email,
            message: f.message,
            status: f.status,
            days,
            unit,
            amount,
          }
        : x,
    )

    alert('수정 내용을 저장했습니다.')
  } catch (e) {
    console.warn('saveAdmin error', e)
    alert('수정 저장 중 오류가 발생했습니다.')
  }
}

/** 관리자: 승인 처리 */
async function approve(a) {
  if (mode.value !== 'admin') return
  const target = a || adminAll.value.find((x) => x._id === adminForm.value.id)
  if (!target) return
  if (!confirm('이 신청을 승인할까요?')) return

  try {
    if (target.type === 'store') {
      await setDoc(
        doc(fbDb, 'stores', target._id),
        {
          applyStatus: 'approved',
          approved: true,
          lastRejectReason: '',
          decidedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    } else if (target.type === 'partner') {
      await setDoc(
        doc(fbDb, 'partnerRequests', target._id),
        {
          status: 'approved',
          approved: true,
          reason: '',
          decidedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    } else if (target.type === 'ad') {
      await setDoc(
        doc(fbDb, 'applications', target._id),
        {
          status: 'approved',
          decidedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    }

    adminAll.value = adminAll.value.map((x) =>
      x._id === target._id ? { ...x, status: 'approved', reason: '' } : x,
    )
    if (adminForm.value.id === target._id) adminForm.value.status = 'approved'

    alert('승인 처리되었습니다.')
  } catch (e) {
    console.warn('approve error', e)
    alert('승인 처리 중 오류가 발생했습니다.')
  }
}

/** 관리자: 거절 처리 */
async function reject(a) {
  if (mode.value !== 'admin') return
  const target = a || adminAll.value.find((x) => x._id === adminForm.value.id)
  if (!target) return
  const reason = prompt('거절 사유를 입력해 주세요.', target.reason || '')
  if (reason === null) return

  try {
    if (target.type === 'store') {
      await setDoc(
        doc(fbDb, 'stores', target._id),
        {
          applyStatus: 'rejected',
          approved: false,
          lastRejectReason: reason,
          decidedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    } else if (target.type === 'partner') {
      await setDoc(
        doc(fbDb, 'partnerRequests', target._id),
        {
          status: 'rejected',
          approved: false,
          reason,
          decidedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    } else if (target.type === 'ad') {
      await setDoc(
        doc(fbDb, 'applications', target._id),
        {
          status: 'rejected',
          reason,
          decidedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    }

    adminAll.value = adminAll.value.map((x) =>
      x._id === target._id ? { ...x, status: 'rejected', reason } : x,
    )
    if (adminForm.value.id === target._id) adminForm.value.status = 'rejected'

    alert('거절 처리되었습니다.')
  } catch (e) {
    console.warn('reject error', e)
    alert('승인 처리 중 오류가 발생했습니다.')
  }
}

/* ── 관리자: 신청 로딩 ── */
const adminAll = ref([])
const adminOpen = ref(true)

async function reloadAdmin(){
  if (mode.value !== 'admin') return
  if (!fbDb) return

  const rows = []

  const mapStores = (docs) =>
    docs.map((d) => {
      const x = d.data() || {}

      // ✅ MyStoresPage 에서 계산한 광고비 정보(pricePreview) 사용
      const pp = x.pricePreview || {}
      const days = Number(pp.adDays || 0)
      const unit = AD_PRICE_PER_DAY               // 단가는 동일(5,000원)
      const amount = Number(
        pp.total || (days > 0 ? days * unit : 0)   // total 없으면 days × unit
      )

      return {
        _col: 'stores',
        _id: d.id,
        type: 'store',
        companyName: x.name || '',
        name: x.name || '',
        contactName: x.manager || '',
        phone: x.phone || '',
        email: x.ownerEmail || x.email || '',
        message: x.detailDesc || x.desc || '',
        category: x.category || '',
        address: x.address || '',
        createdByUid: x.ownerId || '',
        createdByEmail: x.ownerEmail || x.email || '',
        createdAt: x.createdAt || x.approvedAt || null,
        status: x.applyStatus || 'pending',
        reason: x.lastRejectReason || '',

        // ✅ 관리자 모달/목록에서 쓸 광고비 필드
        days,
        unit,
        amount,
      }
    })

  const mapPartners = (docs) =>
    docs.map((d) => {
      const x = d.data() || {}
      return {
        _col: 'partnerRequests',
        _id: d.id,
        type: 'partner',
        companyName: x.name || '',
        name: x.name || '',
        contactName: x.contactName || '',
        phone: x.phone || '',
        email: x.ownerEmail || x.email || '',
        message: x.desc || '',
        category: x.category || '',
        address: x.address || '',
        createdByUid: x.ownerId || '',
        createdByEmail: x.ownerEmail || x.email || '',
        createdAt: x.createdAt || null,
        status: x.status || 'pending',
        reason: x.reason || '',
      }
    })

  const mapAds = (docs) =>
    docs.map((d) => {
      const x = d.data() || {}
      const extra = x.extra || {}
      const days = Number(x.days || AD_DEFAULT_DAYS)
      const unit = Number(x.unit || AD_PRICE_PER_DAY)
      const amount = Number(x.amount || days * unit)

      return {
        _col: 'applications',
        _id: d.id,
        type: 'ad',
        companyName: x.companyName || '',
        name: x.companyName || '',
        contactName: x.contactName || '',
        phone: x.phone || '',
        email: x.email || x.createdByEmail || '',
        message: x.message || '',
        category: extra.category || '',
        address: extra.address || '',
        createdByUid: x.createdByUid || '',
        createdByEmail: x.createdByEmail || '',
        createdAt: x.createdAt || null,
        status: x.status || 'pending',
        reason: x.reason || '',
        days,
        unit,
        amount,
      }
    })

  try {
    const needStore   = props.kind === 'store'   || props.kind === 'all'
    const needPartner = props.kind === 'partner' || props.kind === 'all'
    const needAd      = props.kind === 'ad'      || props.kind === 'all'

    if (needStore) {
      const snapStores = await getDocs(
        query(
          collection(fbDb, 'stores'),
          where('applyStatus', '==', 'pending'),
        ),
      )
      rows.push(...mapStores(snapStores.docs))
    }

    if (needPartner) {
      const snapPartners = await getDocs(
        query(
          collection(fbDb, 'partnerRequests'),
          where('status', '==', 'pending'),
        ),
      )
      rows.push(...mapPartners(snapPartners.docs))
    }

    if (needAd) {
      const snapAds = await getDocs(
        query(
          collection(fbDb, 'applications'),
          where('type', '==', 'ad'),
          where('status', '==', 'pending'),
        ),
      )
      rows.push(...mapAds(snapAds.docs))
    }

    adminAll.value = rows.sort((a, b) => {
      const ta = (a.createdAt?.seconds || 0) * 1000
      const tb = (b.createdAt?.seconds || 0) * 1000
      return tb - ta
    })
  } catch (e) {
    console.warn('reloadAdmin(stores/partnerRequests/applications) error:', e)
  }
}

onMounted(reloadAdmin)
watch([mode, () => props.kind], reloadAdmin)

/* ── 삭제(관리자) ── */
async function remove(a){
  if (mode.value !== 'admin') return
  const name = a.companyName || a.name || a._id
  if (!confirm(`'${name}' 신청을 삭제할까요?`)) return
  try {
    await deleteDoc(doc(fbDb, a._col, a._id))
    adminAll.value = adminAll.value.filter(x => x._id !== a._id)
    alert('삭제했습니다.')
  } catch (e) {
    console.warn('delete error', e)
    alert('삭제 중 오류가 발생했습니다. (권한/네트워크 확인)')
  }
}

/* ── (기업회원) 작성/저장 ── */
const dlg = ref(null)
const emailPlaceholder = computed(() => auth.currentUser?.email || '연락 받을 이메일')
const form = ref({
  name:'', category: props.category || '', phone:'', address:'',
  contactName:'', email: auth.currentUser?.email || '', message:''
})

function openCreate(){
  form.value = {
    name:'', category: props.category || '', phone:'', address:'',
    contactName:'', email: auth.currentUser?.email || '', message:''
  }
  if (isAd.value) formDays.value = 30
  dlg.value?.showModal()
}
function closeDlg(){ dlg.value?.close() }

/** 기업회원 저장: 모두 applications 컬렉션으로 저장 */
const appTypeForCreate = computed(() =>
  (props.kind === 'ad' ? 'ad' : (props.kind === 'store' ? 'store' : 'partner'))
)

async function save() {
  const user = auth.currentUser

  if (!user) {
    alert('로그인이 필요합니다. 먼저 로그인 후 다시 시도해 주세요.')
    return
  }
  if (!uid.value) uid.value = user.uid

  if (!form.value.name || !form.value.category) {
    alert('카테고리와 가게명을 모두 입력해 주세요.')
    return
  }

  const type     = appTypeForCreate.value
  const category = (form.value.category || '').trim()
  const name     = (form.value.name || '').trim()

  let days = null
  let unit = null
  let amount = null
  if (type === 'ad') {
    days = Math.max(1, Number(formDays.value || 0))
    unit = AD_PRICE_PER_DAY
    amount = days * unit
  }

  const payload = {
    type,                     // 'ad' | 'store' | 'partner'
    companyName: name,
    contactName: form.value.contactName || '',
    phone: (form.value.phone || '').trim(),
    email: (form.value.email || user.email || '').trim(),
    message: form.value.message || '',
    extra: {
      category,
      address: form.value.address || ''
    },
    // 광고비 정보(광고 신청일 때만 값이 들어감)
    days,
    unit,
    amount,

    createdByUid: uid.value,
    createdByEmail: user.email || '',
    status: 'pending',
    createdAt: serverTimestamp(),
  }

  console.log('[BizManagerTabs] save application', { type, payload })

  try {
    const refDoc = await addDoc(collection(fbDb, 'applications'), payload)
    console.log('[BizManagerTabs] application saved ->', refDoc.id)

    closeDlg()
    alert('신청이 접수되었습니다. 운영자가 확인 후 연락드릴게요.\n(ID: ' + refDoc.id + ')')
  } catch (e) {
    console.error('[BizManagerTabs] save error', e)
    alert('신청 저장 중 오류가 발생했습니다.\n' + (e?.message || e))
  }
}

/* ── 외부 이벤트로 폼 열기(배너/버튼) ── */
let openBizCreateHandler = null
onMounted(() => {
  openBizCreateHandler = () => {
    if (mode.value === 'none') return
    tab.value = 'create'
    openCreate()
  }
  window.addEventListener('open-biz-create', openBizCreateHandler)
})
onUnmounted(() => {
  if (openBizCreateHandler) {
    window.removeEventListener('open-biz-create', openBizCreateHandler)
    openBizCreateHandler = null
  }
})

/* ── 공용 Empty 컴포넌트 ── */
const Empty = defineComponent({
  name: 'BizEmpty',
  props: {
    label: { type: String, default: '' },
  },
  setup(props) {
    return () => h('div', { class: 'empty' }, props.label)
  },
})

const categoryLabel = computed(() => props.category || '전체')
</script>

<style scoped>
.biz-manage { margin: 8px 0 16px; border: 1px solid #eee; border-radius: 14px; background: #fff; }
.tabs { display:flex; align-items:center; padding:10px; gap:6px; border-bottom:1px solid #f1f1f1; }
.tab { padding:8px 12px; border-radius:20px; background:#f6f6f8; }
.tab.active { background:#ff2e87; color:#fff; font-weight:700; }
.spacer { flex:1; }
.cat-chip { font-size:12px; padding:4px 8px; border:1px solid #eee; border-radius:14px; background:#fafafa; }

.panel { padding:10px; }
.pane-head { display:flex; align-items:center; gap:8px; }
.pane-head .btn { margin-left:auto; }
.hint { margin:8px 0 14px; color:#777; font-size:13px; }

.cards { display:grid; grid-template-columns:1fr; gap:10px; }
.card { border:1px solid #eee; border-radius:12px; padding:10px; background:#fff; }
.row { display:flex; align-items:flex-start; gap:8px; }
.name { font-weight:900; }
.type-chip { font-weight:700; font-size:12px; color:#777; margin-left:4px; }
.meta { display:block; font-size:12px; color:#666; }
.meta2 { font-size:12px; color:#888; margin-top:4px; }
.sep { margin: 0 6px; color:#ccc; }
.extra { font-size:12px; color:#555; margin-top:4px; }
.gap { flex:1; }

dialog::backdrop { background: rgba(0,0,0,.35); }
dialog { border:none; border-radius:14px; padding:0; }
.editor { padding:16px; width:92vw; max-width:520px; }
.editor h3 { margin-bottom:12px; }
.editor label { display:block; margin:8px 0; }
.editor input, .editor textarea { width:100%; padding:10px; border:1px solid #e6e6ea; border-radius:10px; }
.editor textarea { resize: vertical; min-height: 88px; }
.editor .rows { display:flex; align-items:center; gap:8px; margin-top:12px; }

.btn { padding:8px 12px; border-radius:10px; background:#f6f6f8; }
.btn.primary { background:#ff2e87; color:#fff; font-weight:700; }
.btn.danger { background:#ef4444; color:#fff; }
.empty { padding:24px; text-align:center; color:#888; }

.status-line {
  margin: 4px 0;
  display: flex;
  align-items: center;
  gap: 4px;
}
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid #e5e7eb;
}
.status-badge.pending {
  background: #fff7ed;
  color: #c05621;
  border-color: #fed7aa;
}
.status-badge.approved {
  background: #dcfce7;
  color: #166534;
  border-color: #bbf7d0;
}
.status-badge.rejected {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #fecaca;
}
.reason {
  font-size: 11px;
  color: #6b7280;
}

.btn-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 광고비/계좌 섹션 */
.ad-bill-section{
  margin-top:8px;
}
.bill{
  border:1px dashed #e5e7eb;
  border-radius:10px;
  padding:8px 10px;
  background:#fff8fb;
}
.bill.compact{ font-size:12.5px; }
.bill .li{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:6px;
  padding:4px 0;
}
.bill .li.total{
  border-top:1px solid #e5e7eb;
  margin-top:4px;
  padding-top:6px;
}
.bill .li-right{
  display:flex;
  flex-direction:column;
  align-items:flex-end;
}
.bill .amt{ font-weight:900; }
.days-select{
  min-width:90px;
  height:28px;
  border-radius:999px;
  border:1px solid #e5e7eb;
  padding:0 10px;
  font-size:12px;
  background:#fff;
}

.account{
  margin-top:6px;
  padding:8px 10px;
  border-radius:10px;
  border:1px solid #e5e7eb;
  background:#fafafa;
  display:flex;
  flex-direction:column;
  gap:2px;
}
.acc-bank{ font-weight:900; font-size:13px; }
.acc-owner{ font-size:12px; color:#6b7280; }
.muted{ color:#6b7280; }
.sm{ font-size:11px; }

/* 🔥 화이트/라이트 테마에서 광고비/입금계좌 글씨를 항상 검정으로 고정 */
:global(:root[data-theme='white'] .biz-manage .ad-bill-section),
:global(:root[data-theme='white'] .biz-manage .ad-bill-section *),
:global(:root[data-theme='light'] .biz-manage .ad-bill-section),
:global(:root[data-theme='light'] .biz-manage .ad-bill-section *) {
  color:#111 !important;
}
</style>

