<!-- src/pages/DiaryPage.vue -->
<template>
  <main class="page">
    <!-- ============ 달력 헤더 ============ -->
    <section class="cal-head">
      <div class="left">
        <button class="icon-btn" @click="goPrevMonth" aria-label="이전 달">‹</button>
        <h1 class="title" :aria-label="`${year}년 ${month+1}월`">
          {{ year }}년 {{ month + 1 }}월
        </h1>
        <button class="icon-btn" @click="goNextMonth" aria-label="다음 달">›</button>
      </div>
    </section>

    <!-- ============ 달력 ============ -->
    <section class="calendar card ios-month">
      <!-- 요일 -->
      <div class="grid dow">
        <div
          v-for="d in ['일','월','화','수','목','금','토']"
          :key="d"
          class="cell dow-cell"
        >
          {{ d }}
        </div>
      </div>

      <!-- 날짜 그리드 -->
      <div class="grid days" role="grid" aria-label="월간 캘린더">
        <!-- 앞쪽 공백 -->
        <div
          v-for="i in firstDayOfMonth"
          :key="'padL_'+i"
          class="cell pad"
        ></div>

        <!-- 실제 날짜 -->
        <div
          v-for="d in daysInMonth"
          :key="`d_${d}`"
          class="cell day"
          :class="dayCellClass(d)"
          role="button"
          tabindex="0"
          :aria-label="ariaForDay(d)"
          @click="handleDayClick(d)"
          @keydown.enter.prevent="handleDayClick(d)"
          @keydown.space.prevent="handleDayClick(d)"
        >
          <!-- 날짜 + 공휴일 -->
          <div class="date-badge">
            <span class="date-num">{{ d }}</span>
            <span
              v-if="holidayLabel(year, month+1, d)"
              class="holi-badge"
              :title="holidayLabel(year, month+1, d)"
            >
              {{ holidayLabel(year, month+1, d) }}
            </span>
          </div>

          <!-- 일정 미리보기 -->
          <ul class="events">
            <li
              v-for="e in (eventsByDate[dateKey(year, month+1, d)] || [])"
              :key="e.id"
              class="ev"
              @click.stop="openDetail(e)"
              :title="e.title"
            >
              <span class="ttl ellip">{{ e.title }}</span>
            </li>
          </ul>

          <!-- ▼ 금액 뱃지 (항상 입/출 표시: 0원 포함) -->
          <div class="cash-badges col" @click.stop>
            <!-- 입금: 파란색, "입 0원" 형식 -->
            <span
              class="diary-chip wide diary-chip-income"
              :title="formatKRW(dayIncome(year, month + 1, d)) + ' 원'"
            >
              입&nbsp;{{ formatKRW(dayIncome(year, month + 1, d)) }}원
            </span>

            <!-- 출금: 빨간색, "출 0원" 형식 -->
            <span
              class="diary-chip wide diary-chip-expense"
              :title="formatKRW(dayExpense(year, month + 1, d)) + ' 원'"
            >
              출&nbsp;{{ formatKRW(dayExpense(year, month + 1, d)) }}원
            </span>
          </div>
          <!-- ▲ 금액 뱃지 -->

        </div>

        <!-- 뒤쪽 공백 -->
        <div
          v-for="i in tailPadCount"
          :key="'padR_'+i"
          class="cell pad"
        ></div>
      </div>
    </section>

    <!-- ============ 세금 추정 ============ -->
    <section class="card tax">
      <h2 class="tax-title">세금 추정</h2>

      <div class="tax-rows">
        <div class="tax-row">
          <span class="tax-key">기간</span>
          <div class="tax-input readonly">
            {{ year }}년 {{ month + 1 }}월
          </div>
        </div>

        <div class="tax-row">
          <span class="tax-key">총수입</span>
          <div class="tax-input readonly">
            {{ monthIncome.toLocaleString('ko-KR') }} 원
          </div>
        </div>

        <div class="tax-row">
          <span class="tax-key">총지출</span>
          <div class="tax-input readonly">
            {{ monthExpense.toLocaleString('ko-KR') }} 원
          </div>
        </div>

        <label class="tax-row">
          <span class="tax-key">소득유형</span>
          <select
            name="incomeType"
            class="tax-input"
            v-model="tax.incomeType"
            aria-label="소득유형 선택"
          >
            <option value="freelancer">프리랜서/사업(3.3% 원천징수)</option>
            <option value="employee">근로소득(갑근세: 간이세액표)</option>
          </select>
        </label>
      </div>

      <div class="tax-actions row">
        <button class="btn primary" @click="calcTax">추정세금 계산</button>
        <button class="btn primary" type="button" @click="callSupport">전문세무사 연결</button>
      </div>

      <div v-if="tax.result !== null" class="tax-table-wrap">
        <table class="tax-table">
          <tbody>
            <tr>
              <th>총수입</th>
              <td>{{ monthIncome.toLocaleString('ko-KR') }} 원</td>
            </tr>
            <tr>
              <th>총지출(필요경비)</th>
              <td>{{ monthExpense.toLocaleString('ko-KR') }} 원</td>
            </tr>
            <tr>
              <th>과세표준 추정(= 수입−지출)</th>
              <td>
                <strong>{{ tax.result.taxBase.toLocaleString('ko-KR') }}</strong> 원
              </td>
            </tr>
            <tr>
              <th>소득세(국세)</th>
              <td>{{ tax.result.incomeTax.toLocaleString('ko-KR') }} 원</td>
            </tr>
            <tr>
              <th>지방소득세(소득세의 10%)</th>
              <td>{{ tax.result.localTax.toLocaleString('ko-KR') }} 원</td>
            </tr>
            <tr class="sep">
              <th>종합소득세 합계(국세+지방)</th>
              <td>
                <strong>{{ tax.result.totalDue.toLocaleString('ko-KR') }}</strong> 원
              </td>
            </tr>
            <tr v-if="tax.incomeType==='freelancer'">
              <th>원천징수(3.3%)</th>
              <td>
                {{ tax.result.wh.total.toLocaleString('ko-KR') }} 원
                <span class="muted">
                  (소득세 {{ tax.result.wh.itx.toLocaleString('ko-KR') }},
                  지방세 {{ tax.result.wh.ltx.toLocaleString('ko-KR') }})
                </span>
              </td>
            </tr>
            <tr v-else>
              <th>갑근세(근로 원천징수)</th>
              <td>
                <span class="muted">
                  간이세액표 기준 월별 원천징수(간이 추정 미적용)
                </span>
              </td>
            </tr>
            <tr class="sep">
              <th>예상 추가 납부(= 종합소득세 − 원천징수)</th>
              <td>
                <strong
                  :class="{
                    pos: tax.result.finalPayable > 0,
                    zero: tax.result.finalPayable === 0,
                    neg: tax.result.finalPayable < 0
                  }"
                >
                  {{ tax.result.finalPayable.toLocaleString('ko-KR') }} 원
                </strong>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="tax-note">
          ※ 간이 계산입니다. 실제 산출세액은 공제·감면, 소득구분, 가족수/공제항목, 간이세액표 적용 등에 따라 달라질 수 있습니다.
        </p>
      </div>
    </section>

    <!-- ============ 일정/금액 모달 ============ -->
    <div v-if="modal.open" class="modal" @click.self="closeModal">
      <div class="sheet" role="dialog" aria-modal="true">
        <header class="sheet-head">
          <strong>{{ modal.editing ? '일정 수정' : '일정 추가' }}</strong>
          <button class="icon-btn" @click="closeModal" aria-label="닫기">✕</button>
        </header>

        <div class="modal-grid">
          <!-- 일정 폼 -->
          <form class="form" @submit.prevent="saveEvent" aria-label="일정 폼">
            <label class="row">
              <span class="key">날짜</span>
              <input
                class="inp"
                type="date"
                v-model="modal.dateStr"
                name="eventDate"
                aria-label="날짜"
                required
              />
            </label>
            <label class="row">
              <span class="key">제목</span>
              <input
                class="inp"
                type="text"
                v-model.trim="modal.title"
                name="eventTitle"
                aria-label="제목"
                placeholder="예: 테스트 오픈"
              />
            </label>
            <label class="row">
              <span class="key">메모</span>
              <textarea
                class="inp"
                rows="4"
                v-model.trim="modal.memo"
                name="eventMemo"
                aria-label="메모"
                placeholder="상세 메모(선택)"
              ></textarea>
            </label>
            <div class="sheet-acts">
              <button type="button" class="btn ghost" @click="closeModal">닫기</button>
              <button type="submit" class="btn">일정 저장</button>
            </div>
          </form>

          <!-- 금액 입력 -->
          <section class="money-card" aria-label="수입지출 입력">
            <div class="money-title">수입·지출 입력</div>
            <div class="row">
              <span class="key">수입</span>
              <input
                class="inp"
                type="text"
                inputmode="numeric"
                pattern="\d*"
                name="income"
                aria-label="수입"
                v-model="modal.moneyIncomeStr"
                @input="modal.moneyIncomeStr = withCommaDigits(modal.moneyIncomeStr)"
                placeholder="0"
              />
            </div>
            <div class="row">
              <span class="key">지출</span>
              <input
                class="inp"
                type="text"
                inputmode="numeric"
                pattern="\d*"
                name="expense"
                aria-label="지출"
                v-model="modal.moneyExpenseStr"
                @input="modal.moneyExpenseStr = withCommaDigits(modal.moneyExpenseStr)"
                placeholder="0"
              />
            </div>
            <div class="sheet-acts">
              <button
                type="button"
                class="btn primary"
                @click="saveMoneyForDate(modal.dateStr)"
              >
                금액 저장
              </button>
            </div>

            <div class="money-help">
              * 금액 저장만 해도 달력에 즉시 반영됩니다. 일정은 비워둬도 됩니다.
            </div>

            <template v-if="eventsForModal.length">
              <div class="splitter"></div>
              <div class="modal-subtitle">이 날짜의 일정</div>
              <ul class="modal-event-list">
                <li
                  v-for="e in eventsForModal"
                  :key="e.id"
                  class="modal-event-item"
                >
                  <button
                    type="button"
                    class="modal-event-main"
                    @click="openDetail(e)"
                  >
                    <div class="modal-event-title">{{ e.title }}</div>
                    <div
                      v-if="e.memo"
                      class="modal-event-memo ellip-2"
                    >
                      {{ e.memo }}
                    </div>
                  </button>
                  <div class="modal-event-acts">
                    <button
                      class="link tiny"
                      type="button"
                      @click="openEditEvent(e)"
                    >
                      수정
                    </button>
                    <button
                      class="link tiny danger"
                      type="button"
                      @click="removeEvent(e)"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              </ul>
            </template>
          </section>
        </div>
      </div>
    </div>

    <!-- ✅ 상세 보기 모달 -->
    <div v-if="detail.open" class="modal" @click.self="closeDetail">
      <div class="sheet" role="dialog" aria-modal="true">
        <header class="sheet-head">
          <strong>상세 일정</strong>
          <button class="icon-btn" @click="closeDetail" aria-label="닫기">
            ✕
          </button>
        </header>

        <article class="detail-body">
          <div class="detail-row">
            <span class="key">날짜</span>
            <span class="val">{{ detail.item?.date }}</span>
          </div>
          <div class="detail-row">
            <span class="key">제목</span>
            <span class="val">{{ detail.item?.title }}</span>
          </div>
          <div
            v-if="detail.item?.memo"
            class="detail-row"
          >
            <span class="key">메모</span>
            <span class="val pre">{{ detail.item?.memo }}</span>
          </div>
        </article>

        <div class="sheet-acts">
          <button class="btn ghost" type="button" @click="closeDetail">
            닫기
          </button>
          <button
            class="btn"
            type="button"
            @click="openEditEvent(detail.item)"
          >
            수정
          </button>
          <button
            class="btn primary"
            type="button"
            @click="removeEvent(detail.item); closeDetail()"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount } from 'vue'

/* ===================== 계정키 탐지 ===================== */
function tryJSON (s) {
  try { return JSON.parse(s) } catch { return null }
}
function getFirebaseUID () {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) || ''
    if (key.startsWith('firebase:authUser:')) {
      const obj = tryJSON(localStorage.getItem(key))
      const uid = obj?.uid || obj?.user?.uid
      if (uid) return String(uid)
    }
  }
  return ''
}
function getCandidateUIDFromKnownKeys () {
  const CANDS = ['auth_user', 'user', 'currentUser', 'profile', 'member']
  for (const k of CANDS) {
    const v = tryJSON(localStorage.getItem(k))
    const uid = v?.uid || v?.id || v?.userId || v?.email || v?.phone
    if (uid) return String(uid)
  }
  return ''
}
function ensureGuestId () {
  let gid = localStorage.getItem('diary_guest_id')
  if (!gid) {
    gid = 'guest_' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem('diary_guest_id', gid)
  }
  return gid
}
function detectAccountKey () {
  const f = getFirebaseUID()
  if (f) return f
  const c = getCandidateUIDFromKnownKeys()
  if (c) return c
  return ensureGuestId()
}
const accountKey = ref(detectAccountKey())

/* ===================== 스토리지 키 ===================== */
const STORAGE_BASE = 'diary_events_v1'
const MONEY_STORAGE_BASE = 'diary_money_v1'
const HOST_NS = (typeof location !== 'undefined' ? location.host : 'app')
const storageKey = computed(
  () => `${STORAGE_BASE}::${HOST_NS}::${accountKey.value}`,
)
const moneyStorageKey = computed(
  () => `${MONEY_STORAGE_BASE}::${HOST_NS}::${accountKey.value}`,
)

/* ===================== 데이터 로드/저장 ===================== */
const eventsByDate = reactive({})
function loadAll (key) {
  try {
    const raw = localStorage.getItem(key) || '{}'
    const obj = JSON.parse(raw)
    for (const k of Object.keys(obj)) {
      obj[k] = (obj[k] || []).sort((a, b) => a.title.localeCompare(b.title))
    }
    return obj
  } catch {
    return {}
  }
}
function replaceAll (target, source) {
  for (const k of Object.keys(target)) delete target[k]
  for (const k of Object.keys(source)) target[k] = source[k]
}
function reloadEvents () {
  replaceAll(eventsByDate, loadAll(storageKey.value))
}
function persist () {
  localStorage.setItem(storageKey.value, JSON.stringify(eventsByDate))
}

/* ---- 수입/지출 저장 ---- */
const moneyByDate = reactive({}) // { 'YYYY-MM-DD': { i: number, e: number } }
function loadMoneyAll (key) {
  try {
    const raw = localStorage.getItem(key) || '{}'
    const obj = JSON.parse(raw)
    for (const k of Object.keys(obj)) {
      const v = obj[k] || {}
      obj[k] = { i: Number(v.i) || 0, e: Number(v.e) || 0 }
    }
    return obj
  } catch {
    return {}
  }
}
function reloadMoney () {
  replaceAll(moneyByDate, loadMoneyAll(moneyStorageKey.value))
}
function persistMoney () {
  localStorage.setItem(moneyStorageKey.value, JSON.stringify(moneyByDate))
}

watch(storageKey, (now, prev) => {
  const prevData = loadAll(prev)
  const nextData = loadAll(now)
  if (Object.keys(prevData).length && Object.keys(nextData).length === 0) {
    localStorage.setItem(now, JSON.stringify(prevData))
  }
  reloadEvents()
})
watch(moneyStorageKey, (now, prev) => {
  const prevData = loadMoneyAll(prev)
  const nextData = loadMoneyAll(now)
  if (Object.keys(prevData).length && Object.keys(nextData).length === 0) {
    localStorage.setItem(now, JSON.stringify(prevData))
  }
  reloadMoney()
})

/* ---- auth 변화 감지 ---- */
function handleStorage (e) {
  if (!e || typeof e.key !== 'string') return
  if (
    e.key.startsWith('firebase:authUser:') ||
    /auth|user|profile|member|current/i.test(e.key)
  ) {
    const next = detectAccountKey()
    if (next && next !== accountKey.value) accountKey.value = next
  }
}
let pollTimer = null
function startPolling () {
  let last = accountKey.value
  pollTimer = setInterval(() => {
    const next = detectAccountKey()
    if (next && next !== last) {
      last = next
      accountKey.value = next
    }
  }, 1000)
}

onMounted(() => {
  window.addEventListener('storage', handleStorage)
  startPolling()
  reloadEvents()
  reloadMoney()
  goToday()
})
onBeforeUnmount(() => {
  window.removeEventListener('storage', handleStorage)
  if (pollTimer) clearInterval(pollTimer)
})

/* ===================== 달력 상태/계산 ===================== */
const today = new Date()
const year = ref(today.getFullYear())
const month = ref(today.getMonth())
const selectedDate = ref(
  new Date(today.getFullYear(), today.getMonth(), today.getDate()),
)

const firstDayOfMonth = computed(
  () => new Date(year.value, month.value, 1).getDay(),
)
const daysInMonth = computed(
  () => new Date(year.value, month.value + 1, 0).getDate(),
)
const totalCells = computed(() => firstDayOfMonth.value + daysInMonth.value)
const tailPadCount = computed(
  () => (7 - (totalCells.value % 7)) % 7,
)

function goPrevMonth () {
  const d = new Date(year.value, month.value - 1, 1)
  year.value = d.getFullYear()
  month.value = d.getMonth()
}
function goNextMonth () {
  const d = new Date(year.value, month.value + 1, 1)
  year.value = d.getFullYear()
  month.value = d.getMonth()
}
function goToday () {
  const d = new Date()
  year.value = d.getFullYear()
  month.value = d.getMonth()
  selectedDate.value = new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function handleDayClick (d) {
  const dt = new Date(year.value, month.value, d)
  selectedDate.value = dt
  openNewEvent(dt)
  const k = dateKeyFromDate(dt)
  const v = moneyByDate[k] || { i: 0, e: 0 }
  modal.moneyIncomeStr = v.i ? v.i.toLocaleString('ko-KR') : ''
  modal.moneyExpenseStr = v.e ? v.e.toLocaleString('ko-KR') : ''
}

/* ===================== 모달: 일정 CRUD + 금액 ===================== */
const modal = reactive({
  open: false,
  editing: false,
  id: null,
  dateStr: '',
  title: '',
  memo: '',
  moneyIncomeStr: '',
  moneyExpenseStr: '',
})
function openNewEvent (date = selectedDate.value) {
  modal.open = true
  modal.editing = false
  modal.id = null
  modal.dateStr = toDateInputValue(date)
  modal.title = ''
  modal.memo = ''
}
function openEditEvent (e) {
  modal.open = true
  modal.editing = true
  modal.id = e.id
  modal.dateStr = e.date
  modal.title = e.title
  modal.memo = e.memo || ''
  const v = moneyByDate[e.date] || { i: 0, e: 0 }
  modal.moneyIncomeStr = v.i ? v.i.toLocaleString('ko-KR') : ''
  modal.moneyExpenseStr = v.e ? v.e.toLocaleString('ko-KR') : ''
}
function closeModal () {
  modal.open = false
}

function saveEvent () {
  const key = modal.dateStr
  if (!eventsByDate[key]) eventsByDate[key] = []
  if (modal.editing) {
    for (const k of Object.keys(eventsByDate)) {
      const idx = eventsByDate[k].findIndex(x => x.id === modal.id)
      if (idx !== -1) {
        const updated = {
          ...eventsByDate[k][idx],
          title: modal.title,
          memo: modal.memo,
          date: modal.dateStr,
        }
        eventsByDate[k].splice(idx, 1)
        if (!eventsByDate[key]) eventsByDate[key] = []
        eventsByDate[key].push(updated)
        break
      }
    }
  } else if (modal.title?.trim()) {
    eventsByDate[key].push({
      id: 'e_' + Math.random().toString(36).slice(2, 10),
      date: modal.dateStr,
      title: modal.title,
      memo: modal.memo,
    })
  }
  if (eventsByDate[key]) {
    eventsByDate[key].sort((a, b) => a.title.localeCompare(b.title))
  }
  persist()
  const d = keyToDate(key)
  year.value = d.getFullYear()
  month.value = d.getMonth()
  selectedDate.value = d
}

const eventsForModal = computed(() => eventsByDate[modal.dateStr] || [])

const detail = reactive({ open: false, item: null })
function openDetail (e) {
  detail.open = true
  detail.item = e
}
function closeDetail () {
  detail.open = false
  detail.item = null
}

function removeEvent (e) {
  const k = e.date
  if (!eventsByDate[k]) return
  eventsByDate[k] = eventsByDate[k].filter(x => x.id !== e.id)
  if (eventsByDate[k].length === 0) delete eventsByDate[k]
  persist()
}

/* ----- 금액 저장 로직 ----- */
function digitsOnly (s) {
  return String(s ?? '').replace(/[^\d]/g, '')
}
function withCommaDigits (s) {
  const d = digitsOnly(s)
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
function saveMoneyForDate (key) {
  const i = Number(digitsOnly(modal.moneyIncomeStr) || 0)
  const e = Number(digitsOnly(modal.moneyExpenseStr) || 0)
  if (!moneyByDate[key]) moneyByDate[key] = { i: 0, e: 0 }
  moneyByDate[key].i = i
  moneyByDate[key].e = e
  persistMoney()
}

/* ===================== 공휴일 표시 ===================== */
const KR_HOLIDAYS = {
  '2025-10-03': '개천절',
  '2025-10-06': '추석',
  '2025-10-08': '대체공휴일',
  '2025-10-09': '한글날',
}
function holidayLabel (y, m, d) {
  return KR_HOLIDAYS[dateKey(y, m, d)] || ''
}

/* ===================== 세금 계산 ===================== */
const tax = reactive({ incomeType: 'freelancer', result: null })
const monthKeyPrefix = computed(() => {
  const mm = String(month.value + 1).padStart(2, '0')
  return `${year.value}-${mm}-`
})
const monthIncome = computed(() => {
  let sum = 0; const p = monthKeyPrefix.value
  for (const k of Object.keys(moneyByDate)) {
    if (k.startsWith(p)) sum += Number(moneyByDate[k]?.i || 0)
  }
  return sum
})
const monthExpense = computed(() => {
  let sum = 0; const p = monthKeyPrefix.value
  for (const k of Object.keys(moneyByDate)) {
    if (k.startsWith(p)) sum += Number(moneyByDate[k]?.e || 0)
  }
  return sum
})
const PIT_BRACKETS = [
  { upTo: 14_000_000, rate: 0.06, quick: 0 },
  { upTo: 50_000_000, rate: 0.15, quick: 1_080_000 },
  { upTo: 88_000_000, rate: 0.24, quick: 5_220_000 },
  { upTo: 150_000_000, rate: 0.35, quick: 14_900_000 },
  { upTo: 300_000_000, rate: 0.38, quick: 19_400_000 },
  { upTo: 500_000_000, rate: 0.40, quick: 25_400_000 },
  { upTo: 1_000_000_000, rate: 0.42, quick: 35_400_000 },
  { upTo: Infinity, rate: 0.45, quick: 65_400_000 },
]
function calcIncomeTaxKRW (base) {
  if (base <= 0) return 0
  const b = PIT_BRACKETS.find(br => base <= br.upTo) || PIT_BRACKETS.at(-1)
  return Math.max(Math.round(base * b.rate - b.quick), 0)
}
function calcTax () {
  const income = monthIncome.value
  const expense = monthExpense.value
  const taxBase = Math.max(income - expense, 0)
  const incomeTax = calcIncomeTaxKRW(taxBase)
  const localTax = Math.round(incomeTax * 0.10)
  const totalDue = incomeTax + localTax
  let wh = { total: 0, itx: 0, ltx: 0, label: '' }
  if (tax.incomeType === 'freelancer') {
    const itx = Math.round(income * 0.03)
    const ltx = Math.round(income * 0.003)
    wh = { total: itx + ltx, itx, ltx, label: '프리랜서 3.3%' }
  } else {
    wh = { total: 0, itx: 0, ltx: 0, label: '근로(간이세액표 별도)' }
  }
  tax.result = {
    taxBase,
    incomeTax,
    localTax,
    totalDue,
    wh,
    finalPayable: totalDue - wh.total,
  }
}

/* ===================== 세무사 상담 연결(전화) ===================== */
const SUPPORT_PHONE = '010-5919-0815'

function callSupport () {
  const tel = SUPPORT_PHONE.replace(/[^0-9+]/g, '')
  if (!tel) return
  window.location.href = `tel:${tel}`
}

/* ===================== 유틸 ===================== */
function dateKey (y, m, d) {
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}
function dateKeyFromDate (dt) {
  return dateKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
}
function keyToDate (key) {
  const [y, m, d] = key.split('-').map(n => parseInt(n))
  return new Date(y, m - 1, d)
}
function toDateInputValue (dt) {
  return dateKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
}
function ariaForDay (d) {
  const dt = new Date(year.value, month.value, d)
  const k = dateKeyFromDate(dt)
  const c = (eventsByDate[k] || []).length
  const base = `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${d}일`
  const inc = dayIncome(year.value, month.value + 1, d)
  const exp = dayExpense(year.value, month.value + 1, d)
  const money = (inc || exp) ? `, 수입 ${inc} 지출 ${exp}` : ''
  return c ? `${base}, 일정 ${c}건${money}` : `${base}${money}`
}
function isToday (d) {
  return (
    year.value === today.getFullYear() &&
    month.value === today.getMonth() &&
    d === today.getDate()
  )
}
function isSelected (d) {
  return (
    year.value === selectedDate.value.getFullYear() &&
    month.value === selectedDate.value.getMonth() &&
    d === selectedDate.value.getDate()
  )
}
function dayCellClass (d) {
  const dt = new Date(year.value, month.value, d)
  const k = dateKeyFromDate(dt)
  return {
    sun: dt.getDay() === 0,
    sat: dt.getDay() === 6,
    today: isToday(d),
    selected: isSelected(d),
    hasEvents: (eventsByDate[k] || []).length > 0,
    isHoliday: !!holidayLabel(year.value, month.value + 1, d),
  }
}
function ensureMoney (k) {
  if (!moneyByDate[k]) moneyByDate[k] = { i: 0, e: 0 }
  return moneyByDate[k]
}
function dayIncome (y, m, d) {
  return ensureMoney(dateKey(y, m, d)).i
}
function dayExpense (y, m, d) {
  return ensureMoney(dateKey(y, m, d)).e
}
function formatKRW (n) {
  const v = Number(n) || 0
  return v.toLocaleString('ko-KR')
}
// "1000000" → "100만" 처럼 만원 단위로 변환
const formatManKRW = (value) => {
  const n = Number(value || 0)
  if (!n) return '0'
  const man = Math.round(n / 10000)
  return `${man}만`
}
</script>

<style scoped>
/* 페이지 여백 */
.page { padding: 12px 14px 88px; }

/* 헤더 */
.cal-head {
  display:flex; align-items:center; justify-content:space-between;
  margin-bottom:4px;
}
.cal-head .left { display:flex; align-items:center; gap:8px; }
.title { margin:0; font-size:20px; font-weight:800; }

/* 화살표 버튼 */
.cal-head .icon-btn {
  width:36px; height:36px; border-radius:10px; border:1px solid var(--line);
  background:#fff !important; font-size:22px; font-weight:900; line-height:36px;
  color:#000 !important; -webkit-text-fill-color:#000 !important;
  filter:none !important; mix-blend-mode:normal !important;
  box-shadow:none !important; opacity:1 !important;
}

/* 카드 */
.card {
  border:1px solid var(--line); border-radius:12px; background:var(--surface);
  box-shadow:0 6px 14px var(--shadow); padding:10px;
}

/* 버튼 */
.btn{
  height:36px; padding:0 12px; border-radius:10px;
  border:1px solid var(--line); background:#fff; color:#111; font-weight:800;
}
.btn.ghost{ background:transparent; }
.btn.tiny{ height:30px; padding:0 10px; font-size:13px; }
.btn.primary{ background:var(--primary,#111); color:#fff; }

/* 그리드 */
.grid{ display:grid; grid-template-columns: repeat(7, 1fr); gap:4px; }

/* 요일 행 */
.ios-month .dow .cell,
.ios-month .dow .dow-cell{
  height:auto; min-height:0; padding:2px 0;
  border:0; background:transparent;
}
.ios-month .dow .dow-cell{ line-height:1; }
.ios-month .dow{
  padding-bottom:0; border-bottom:1px solid var(--line);
}

/* 날짜 셀 */
.cell{
  height:96px;
  border:0; border-radius:10px; background:transparent;
  position:relative; padding:4px; overflow:hidden;
}
.ios-month .days{
  --rowH:104px;
  position:relative; padding-top:0; padding-bottom:2px;
  background:repeating-linear-gradient(
    to bottom,
    transparent,
    transparent calc(var(--rowH) - 1px),
    var(--line) calc(var(--rowH) - 1px),
    var(--line) var(--rowH)
  );
  border-radius:12px;
}
@media (prefers-color-scheme: dark){
  .ios-month .days{
    background:repeating-linear-gradient(
      to bottom,
      transparent,
      transparent calc(var(--rowH) - 1px),
      rgba(255,255,255,.2) calc(var(--rowH) - 1px),
      rgba(255,255,255,.2) var(--rowH)
    );
  }
}
.cell.pad{ background:transparent; border:none; }
.cell.day{ cursor:pointer; outline:none; }
.cell.day:focus{ box-shadow:0 0 0 2px var(--primary,#111) inset; }
.cell.day.sun .date-num{ color:#d84b5d; }
.cell.day.sat .date-num{ color:#3b6bd6; }
.cell.day.today{ border-color:var(--primary,#111); }
.cell.day.selected{ box-shadow:0 0 0 2px var(--primary,#111) inset; }

/* 날짜 숫자/휴일 */
.cell.day .date-badge{
  display:flex; flex-direction:row; align-items:baseline;
  gap:6px; margin-bottom:2px;
}
.cell.day.isHoliday .date-num{ color:#d84b5d; }

/* 휴일 배지 */
.ios-month .cell.day .holi-badge{
  position:static; display:inline-flex; align-items:center;
  white-space:nowrap; font-size:10px;
  padding:1px 5px; border-radius:8px;
  background:#f7d9dc; color:#b93649; border:1px solid #f0b8c0;
}
/* 휴일인 날만 아래로 배치 */
.ios-month .cell.day.isHoliday > .date-badge{
  flex-direction:column; align-items:flex-start; gap:2px;
}

/* 일정 미리보기 */
.events{
  list-style:none; margin:0; padding:0;
  display:flex; flex-direction:column; gap:2px;
}
.ev{
  display:flex; align-items:center; gap:6px;
  padding:2px 6px; border-radius:8px;
  background:#f8f8f8; border:1px solid #eee;
  cursor:pointer; white-space:nowrap; overflow:hidden;
  line-height:16px; height:16px; font-size:9.5px;
}
.ev .ttl{
  max-width:100%; font-size:10px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
@media (prefers-color-scheme: dark){
  .ev{
    background:#ffffff !important;
    border-color:rgba(255,255,255,.35) !important;
  }
  .ev .ttl{
    color:#000 !important; -webkit-text-fill-color:#000 !important;
  }
}
.ev:hover{ background:#f3f3f3; }
.ellip{
  overflow:hidden; white-space:nowrap;
  text-overflow:ellipsis; max-width:100%; display:block;
}

/* ▼ 금액 뱃지 (두 줄 세로) */
.cash-badges.col{
  position:absolute; left:4px; right:4px; bottom:2px;
  display:flex; flex-direction:column; gap:2px;
  height:36px;
}

/* 다이어리 전용 칩 스타일 */
.diary-chip{
  display:flex; align-items:center; justify-content:center;
  padding:0 4px; border-radius:8px;
  border:1px solid var(--line);
  font-size:10px; line-height:18px; height:20px;
  white-space:nowrap; overflow:hidden;
  background:#fff;
}
.diary-chip.wide{ width:100%; }

/* 입금(파랑) / 출금(빨강) 공통 색상 */
.diary-chip-income{
  background:#e5f0ff;
  border-color:#c3ddff;
  color:#1d4ed8;
}
.diary-chip-expense{
  background:#ffe5e5;
  border-color:#ffbaba;
  color:#d92c2c;
}

.diary-chip.wide{ width:100%; }

/* 빈 줄 자리유지용 (완전 투명) */
.diary-chip.diary-chip-placeholder{
  visibility:hidden;
  background:transparent !important;
  border-color:transparent !important;
  color:transparent !important;
}

/* 세금 카드 */
.tax{ margin-top:12px; }
.tax-title{ margin:0 0 8px; font-size:16px; }
.tax-rows{ display:flex; flex-direction:column; gap:8px; }
.tax-row{
  display:flex; align-items:center; gap:12px;
  border:1px solid var(--line); background:#fff;
  border-radius:10px; padding:8px 10px;
}
.tax-key{ width:88px; min-width:88px; font-weight:700; color:#444; }
.tax-input{
  flex:1; height:32px; border:1px solid var(--line);
  border-radius:8px; padding:0 10px; background:#fff;
}
.tax-input.readonly{
  display:flex; align-items:center;
  border-style:dashed; background:#fafafa;
}
.tax-actions.row{ display:flex; gap:8px; margin-top:10px; }
.tax-note{ margin-top:8px; color:#666; font-size:12px; }
.pos{ color:#c0392b; } .neg{ color:#0d6f3f; } .zero{ color:#444; }

/* 모달 공통 */
.modal{
  position:fixed; inset:0;
  background:rgba(0,0,0,.36);
  display:flex; align-items:center; justify-content:center;
  padding:16px;
}
.sheet{
  width:100%; max-width:680px;
  background:#fff; border-radius:16px;
  padding:12px; border:1px solid var(--line);
  box-shadow:0 12px 28px rgba(0,0,0,.25);
}
.sheet-head{
  display:flex; align-items:center;
  justify-content:space-between; margin-bottom:8px;
}

.modal-grid{
  display:grid; grid-template-columns: 1fr; gap:12px;
}
@media (min-width: 720px){
  .modal-grid{ grid-template-columns: 1fr 1fr; }
}

.form .row{
  display:flex; align-items:center;
  gap:10px; margin-bottom:10px;
}
.form .key{ width:88px; color:#555; }
.inp{
  flex:1; height:36px; padding:0 10px;
  border-radius:10px; border:1px solid var(--line); background:#fff;
}
textarea.inp{ height:auto; padding:8px 10px; }
.sheet-acts{
  display:flex; justify-content:flex-end; gap:8px; margin-top:8px;
}

/* 금액 박스 */
.money-card{
  border:1px solid var(--line); border-radius:12px;
  padding:10px; background:#fafafa;
}
.money-title{ font-weight:800; margin-bottom:8px; }
.money-help{ margin-top:6px; font-size:12px; color:#666; }

/* 모달 하단 일정 리스트 */
.modal-subtitle{ font-weight:800; margin:8px 0 6px; }
.modal-event-list{
  list-style:none; margin:0; padding:0;
  display:flex; flex-direction:column; gap:6px;
}
.modal-event-item{
  display:flex; gap:8px; align-items:flex-start;
  border:1px solid var(--line); border-radius:10px;
  background:#fff; padding:8px;
}
.modal-event-main{
  flex:1; text-align:left; background:transparent;
  border:0; padding:0; cursor:pointer;
}
.modal-event-title{ font-weight:800; margin-bottom:2px; }
.modal-event-memo{ color:#444; font-size:13px; }
.modal-event-acts{ display:flex; align-items:center; gap:8px; }
.ellip-2{
  display:-webkit-box; -webkit-line-clamp:2;
  -webkit-box-orient:vertical; overflow:hidden;
}

/* 상세 보기 */
.detail-body{
  display:flex; flex-direction:column;
  gap:10px; padding:6px 0 2px;
}
.detail-row{ display:flex; gap:10px; }
.detail-row .key{ width:72px; color:#666; }
.detail-row .val{ flex:1; }
.detail-row .val.pre{ white-space:pre-wrap; }

/* 결과 표 */
.tax-table-wrap{ margin-top:12px; }
.tax-table{
  width:100%; border-collapse:separate; border-spacing:0;
}
.tax-table th,
.tax-table td{
  padding:8px 10px; border-top:1px solid var(--line);
}
.tax-table th{
  width:48%; text-align:left; background:#fafafa;
}
.tax-table tr.sep th,
.tax-table tr.sep td{
  border-top:2px solid #222;
}
</style>
