<!-- src/pages/MyStoresPage.vue -->
<template>
  <main class="page">
    <header class="topbar">
      <h1 class="ttl">내가게</h1>

      <div class="rt">
        <nav class="tabs">
          <button class="tab" :class="{ on: activeTab==='stores' }" @click="activeTab='stores'">내가게찾기</button>
          <button class="tab" :class="{ on: activeTab==='gangtalk' }" @click="activeTab='gangtalk'">내 배너광고</button>
          <button class="tab" :class="{ on: activeTab==='partners' }" @click="activeTab='partners'">내제휴관</button>
        </nav>

        <div class="rt-actions">
          <!-- ✅ 내가게 탭일 때는 누구나 업체 등록 가능 -->
          <button
            v-if="activeTab==='stores'"
            class="btn primary reg-btn"
            @click="createNew"
          >
            새 업체 등록
          </button>

          <!-- 제휴업체 등록신청은 그대로 관리자만 -->
          <button
            v-if="activeTab==='partners' && isAdmin"
            class="btn primary reg-btn reg-btn-lg"
            @click="goPartnerApply"
          >
            제휴업체 등록신청
          </button>
        </div>
      </div>
    </header>

    <section v-if="loading" class="empty">불러오는 중…</section>

    <section v-else-if="error" class="empty">
      <p>불러오는 중 문제가 발생했어요.<br />{{ error }}</p>
      <button class="btn" @click="reload">다시 시도</button>
    </section>

    <!-- ===== 내가게찾기 (내 업체 목록) ===== -->
    <section
      v-show="!loading && !error && activeTab==='stores'"
      class="stack"
      ref="secStores"
    >
      <!-- 빈 상태: 안내 문구만 남기고 버튼 제거 -->
      <div v-if="stores.length === 0" class="empty">
        <p>아직 등록된 내 업체가 없습니다.</p>
      </div>

      <!-- 업체 카드 목록 -->
      <article v-for="s in stores" :key="s.id" class="pro-card">
        <div class="wifi-pin" :class="wifiColor(s)" aria-label="혼잡도">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M8.5 16a6 6 0 0 1 7 0" />
            <path d="M12 20h.01" />
          </svg>
        </div>

        <div class="pro-top">
          <div
            class="pro-thumb"
            :style="{ backgroundImage:`url(${s.thumb || fallbackThumb(s.category)})` }"
          />
          <div class="pro-meta">
            <!-- 상호 + 지역·업종 -->
            <div class="pro-head">
              <div class="pro-name ellip">{{ s.name }}</div>
            </div>
            <div class="pro-sub ellip">
              {{ s.region || '-' }} · {{ mapCat[s.category] || s.category }}
              <template v-if="s.manager"> · 담당: {{ s.manager }}</template>
            </div>

            <!-- 소개(한 줄 고정) -->
            <div v-if="s.desc" class="pro-intro one-line">
              {{ s.desc }}
            </div>

            <!-- 이벤트(한 줄, 라벨 + 내용) -->
            <div v-if="eventOf(s)" class="pro-ev">
              <span class="ev-lbl">이벤트</span>
              <span class="ev-text one-line">{{ eventOf(s) }}</span>
            </div>

            <!-- 시급 표시(있을 때만) -->
            <div v-if="hourlyOf(s)" class="wage-line">
              시급 {{ formatWon(hourlyOf(s)) }}
            </div>

            <!-- 맞출방/필요인원 -->
            <div class="pro-chips">
              <span class="chip strong">
                <b>{{ s.match || 0 }}</b> 맞출방
              </span>
              <span class="chip strong">
                <b>{{ s.persons || 0 }}</b> 맞출인원
              </span>
            </div>

            <!-- 업체 등록 신청 상태 -->
            <div v-if="s.applyStatus" class="apply">
              <span
                class="badge"
                :class="{
                  approved: s.applyStatus === 'approved',
                  pending:  s.applyStatus === 'pending',
                  rejected: s.applyStatus === 'rejected'
                }"
              >
                {{ statusLabel(s.applyStatus) }}
              </span>
            </div>

            <div v-if="!s.ownerId" class="claim">소유권 연결 중…</div>
          </div>
        </div>

        <div class="pro-actions">
          <button class="btn primary" @click="openEdit(s.id)">편집</button>
          <span class="spacer"></span>
          <button class="btn danger" @click="remove(s.id)">삭제</button>
        </div>

        <div class="pro-period">
          <span>광고기간</span>
          <strong>{{ formatPeriod(s.adStart, s.adEnd) }}</strong>
        </div>
      </article>
    </section>

    <!-- ===== 내 배너광고 ===== -->
    <section
      v-show="!loading && !error && activeTab==='gangtalk'"
      class="stack"
      ref="secGangtalk"
      id="gangtalk"
    >
      <h2 class="sec-ttl">내 배너광고</h2>

      <!-- boards + adApps 둘 다 없을 때만 빈 상태 표시 -->
      <div v-if="boards.length === 0 && adApps.length === 0" class="empty">
        <p>신청한 배너 광고가 없어요.</p>
        <p class="sm muted">광고 신청 후 관리자가 등록해 드립니다.</p>
      </div>

      <!-- 실제 게시판 배너(boards 컬렉션) -->
      <article v-for="b in boards" :key="b.id" class="pro-card">
        <div class="wifi-pin ok" aria-label="게시판">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </div>

        <div class="pro-top">
          <!-- ✅ 배너 썸네일: 가능한 실제 배너 이미지 사용 -->
          <div
            class="pro-thumb"
            :style="{ backgroundImage:`url(${b.thumb || fallbackThumb('default')})` }"
          />
          <div class="pro-meta">
            <div class="pro-head">
              <!-- ✅ 제목 앞에 (가게찾기)/(제휴관) 태그 -->
              <div class="pro-name ellip">
                <span class="banner-place-tag">
                  ({{ b.placeLabel || '가게찾기' }})
                </span>
                {{ b.title || b.storeName || '(제목 없음)' }}
              </div>
            </div>

            <div class="pro-sub ellip">
              <template v-if="b.storeName">
                업체: {{ b.storeName }}
              </template>
              <template v-else>
                배너 광고
              </template>
              <template v-if="b.region"> · {{ b.region }}</template>
            </div>

            <p v-if="b.desc" class="pro-desc">{{ b.desc }}</p>

            <div class="pro-chips">
              <span class="chip"><b>{{ b.posts || 0 }}</b> 진행</span>
              <span class="chip"><b>{{ b.comments || 0 }}</b> 종료</span>
            </div>
          </div>
        </div>

        <div class="pro-actions">
          <button class="btn primary" @click="editBoard(b)">편집</button>
          <span class="spacer"></span>
          <button class="btn danger" @click="removeBoard(b)">삭제</button>
        </div>

        <div class="pro-period">
          <span>최근변경</span>
          <strong>{{ formatDateTime(b.updatedAt || b.createdAt) }}</strong>
        </div>
      </article>

      <!-- 🔥 광고 신청 내역 (applications, type='ad') -->
      <section v-if="adApps.length" class="stack" style="margin-top: 8px;">
        <h3 class="sec-ttl">광고 신청 내역</h3>

        <article v-for="a in adApps" :key="a.id" class="pro-card">
          <div class="pro-top">
            <div class="pro-thumb" :style="{ backgroundImage:`url(${fallbackThumb('default')})` }" />
            <div class="pro-meta">
              <div class="pro-head">
                <div class="pro-name ellip">
                  {{ a.companyName || '(상호명 없음)' }}
                </div>
              </div>

              <div class="pro-sub ellip">
                {{ a.extra?.category || '카테고리' }}
                <span v-if="a.extra?.address"> · {{ a.extra.address }}</span>
              </div>

              <p class="pro-desc">
                요청사항: {{ a.message || '요청/설명 내용이 없습니다.' }}
              </p>

              <p class="pro-desc muted">
                신청일: {{ formatDateTime(a.createdAt) }}
              </p>

              <div class="apply" v-if="a.status">
                <span
                  class="badge"
                  :class="{
                    approved: a.status === 'approved',
                    pending:  a.status === 'pending',
                    rejected: a.status === 'rejected'
                  }"
                >
                  {{ statusLabel(a.status) }}
                </span>
                <small
                  v-if="a.status === 'rejected' && a.reason"
                  class="muted"
                >
                  (사유: {{ a.reason }})
                </small>
              </div>
            </div>
          </div>

          <div class="pro-actions">
            <button class="btn primary" @click="openAdEdit(a)">편집</button>
            <span class="spacer"></span>
            <button class="btn danger" @click="removeAdApp(a)">삭제</button>
          </div>
        </article>
      </section>
    </section>

    <!-- ===== 내제휴관 ===== -->
    <section v-show="!loading && !error && activeTab==='partners'" class="stack" ref="secPartners" id="partners">
      <h2 class="sec-ttl">제휴관</h2>

      <div v-if="partners.length === 0" class="empty">
        <p>등록된 제휴가 없어요.</p>
      </div>

      <article v-for="p in partners" :key="p.id + '_' + (p.requestId||'r')" class="pro-card">
        <div class="wifi-pin ok" aria-label="제휴">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
            <path d="M8.5 16a6 6 0 0 1 7 0"/>
            <path d="M12 20h.01"/>
          </svg>
        </div>

        <div class="pro-top">
          <div class="pro-thumb" :style="{ backgroundImage:`url(${p.thumb || fallbackThumb('default')})` }"/>
          <div class="pro-meta">
            <div class="pro-head"><div class="pro-name ellip">{{ p.name || '(제목 없음)' }}</div></div>
            <div class="pro-sub ellip">{{ p.region || '-' }} · {{ partnerCatLabel(p.category) }}</div>
            <p v-if="p.desc" class="pro-desc">{{ p.desc }}</p>

            <div class="pro-chips">
              <span v-for="t in (p.tags || [])" :key="t" class="chip strong">{{ t }}</span>
            </div>

            <!-- ✅ 제휴 신청 상태: 신청자/관리자 모두 표시 -->
            <div v-if="p.status" class="apply">
              <span
                class="badge"
                :class="{
                  approved: p.status === 'approved',
                  pending:  p.status === 'pending',
                  rejected: p.status === 'rejected'
                }"
              >
                {{ statusLabel(p.status) }}
              </span>
              <!-- 거절 사유는 관리자에게만 노출 -->
              <small
                v-if="p.status === 'rejected' && p.reason && isAdmin"
                class="muted"
              >
                (사유: {{ p.reason }})
              </small>
            </div>
          </div>
        </div>

        <div class="pro-actions">
          <template v-if="isAdmin">
            <!-- 제휴 쪽 버튼 구성은 기존 유지(요청 범위: 업체 목록만 단순화) -->
            <button class="btn" @click="goFindPartner(p)">위치찾기</button>
            <button class="btn primary" @click="editPartner(p)">편집</button>
            <button class="btn warning" @click="openExtend('partner', p)">연장</button>
            <button class="btn success" @click="infoPartner(p)">등록신청</button>
            <span class="spacer"></span>
            <button class="btn danger" @click="removePartner(p)">삭제</button>
          </template>

          <template v-else>
            <button class="btn primary" @click="editPartner(p)">편집</button>
            <span class="spacer"></span>
            <button class="btn danger" @click="removePartner(p)">삭제</button>
          </template>
        </div>

        <div class="pro-period">
          <span>광고기간</span>
          <strong>{{ formatPeriod(p.adStart, p.adEnd) }}</strong>
        </div>
      </article>

      <div class="stack-cta">
        <button v-if="isAdmin" class="btn primary wide" @click="goPartnerApply">제휴 업체 등록신청</button>
      </div>
    </section>

    <!-- ===== 광고 신청 편집 모달 ===== -->
    <div v-if="adEdit.open" class="modal-wrap" @click.self="closeAdEdit">
      <div class="modal">
        <h3 class="modal-ttl">광고 신청 수정</h3>

        <div class="form">
          <label>카테고리</label>
          <input
            v-model.trim="adEdit.form.category"
            placeholder="예) 네일, 성형외과, 카페"
          />

          <label>가게명</label>
          <input
            v-model.trim="adEdit.form.name"
            placeholder="상호명"
          />

          <label>담당자명</label>
          <input
            v-model.trim="adEdit.form.contactName"
            placeholder="홍길동"
          />

          <label>연락 이메일</label>
          <input
            v-model.trim="adEdit.form.email"
            type="email"
            placeholder="you@example.com"
          />

          <label>전화번호</label>
          <input
            v-model.trim="adEdit.form.phone"
            placeholder="010-0000-0000"
          />

          <label>주소</label>
          <input
            v-model.trim="adEdit.form.address"
            placeholder="도로명 주소"
          />

          <label>요청사항</label>
          <textarea
            v-model.trim="adEdit.form.message"
            rows="3"
            placeholder="요청/설명 사항을 적어주세요"
          />
        </div>

        <!-- 광고비 / 입금계좌 안내 -->
        <div class="bill compact" style="margin-top:8px;">
          <div class="li">
            <span>광고기간</span>
            <span class="li-right">
              <!-- ✅ 광고기간 직접 수정 가능 -->
              <input
                v-model.number="adEdit.form.days"
                type="number"
                min="1"
                max="365"
                class="days-input"
              />
              <b class="amt">일</b>
            </span>
          </div>
          <div class="li">
            <span>단가</span>
            <span class="li-right"><b class="amt">{{ formatWon(AD_PRICE_PER_DAY) }}</b></span>
          </div>
          <div class="li total">
            <span>총 결제금액</span>
            <span class="li-right"><b class="amt">{{ formatWon(adTotalCost) }}</b></span>
          </div>
        </div>

        <div class="account">
          <div class="acc-bank">입금 계좌 (임시)</div>
          <div class="acc-owner">우리은행 1002-000-123456 · 예금주 ㈜강톡</div>
          <small class="muted sm">* 실제 계좌 정보는 추후 변경될 수 있습니다.</small>
        </div>

        <div class="row" style="margin-top:10px;">
          <button class="btn" @click="closeAdEdit">취소</button>
          <button
            class="btn primary"
            :disabled="adEdit.saving"
            @click="saveAdEdit"
          >
            {{ adEdit.saving ? '저장 중…' : '저장' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ===== 연장 신청 모달 ===== -->
    <div v-if="extOpen" class="modal-wrap" @click.self="closeExtend">
      <div class="modal">
        <h3 class="modal-ttl">광고 연장 신청</h3>
        <p class="muted" style="margin-top:-6px">
          {{ extTarget?.name }} <span v-if="extTarget?.type==='store'">[업체]</span><span v-else>[제휴]</span>
        </p>

        <div class="form">
          <label>연장 일수</label>
          <input type="number" v-model.number="extDays" min="1" max="365" />
        </div>

        <div class="sum">
          <div>단가</div>
          <b>{{ formatWon(pricePerDay) }}</b>
        </div>
        <div class="sum">
          <div>총 금액</div>
          <b>{{ formatWon(totalPrice) }}</b>
        </div>

        <div class="row">
          <button class="btn" @click="closeExtend">취소</button>
          <button class="btn primary" :disabled="extSubmitting" @click="requestExtend">
            {{ extSubmitting ? '신청 중…' : '연장 신청' }}
          </button>
        </div>

        <p v-if="extErr" class="err">{{ extErr }}</p>
        <p class="muted sm">운영자 승인 후 광고기간이 자동으로 연장됩니다.</p>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { auth as fbAuth, db as fbDb } from '@/firebase'
import {
  collection, query, where, getDocs, getDoc, doc,
  updateDoc, serverTimestamp, deleteDoc, setDoc, onSnapshot
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

/* 활성 탭 */
const activeTab = ref('stores')

/* 카테고리 라벨 (가게) */
const categories = [
  { key:'hopper',  label:'하퍼' },
  { key:'point5',  label:'쩜오' },
  { key:'ten',     label:'텐카페' },
  { key:'tenpro',  label:'텐프로' },
  { key:'onep',    label:'1%' },
  { key:'nrb',     label:'노래방' },
  { key:'kara',    label:'가라오케' },
  { key:'bar',     label:'바' },
  { key:'lounge',  label:'라운지' },
  { key:'default', label:'기타' },
]
const mapCat = Object.fromEntries(categories.map(c => [c.key, c.label]))

/* 제휴 카테고리 라벨 */
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
const partnerCatLabel = (k)=> (partnerCategoryOptions.find(o=>o.key===String(k||'').toLowerCase())?.label || '기타')

/* 기본 썸네일 */
const FALLBACK_THUMB = {
  lounge : 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?q=80&w=1200&auto=format&fit=crop',
  bar    : 'https://images.unsplash.com/photo-1532634896-26909d0d4b6a?q=80&w=1200&auto=format&fit=crop',
  ten    : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop',
  point5 : 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop',
  hopper : 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop',
  nrb    : 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1200&auto=format&fit=crop',
  kara   : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200&auto=format&fit=crop',
  onep   : 'https://images.unsplash.com/photo-1514361892636-7f05f1d2710f?q=80&w=1200&auto=format&fit=crop',
  default: 'https://images.unsplash.com/photo-1521017432531-fbd92d59d4b1?q=80&w=1200&auto=format&fit=crop',
}
const fallbackThumb = (k) => FALLBACK_THUMB[k] || FALLBACK_THUMB.default

const MS_DAY = 24*60*60*1000

const router  = useRouter()
const uid     = computed(() => fbAuth.currentUser?.uid || null)
/** 🔹 내 계정 이메일(소문자) – ownerEmail 기반 매장 찾기용 */
const userEmail = computed(() =>
  (fbAuth.currentUser?.email || '').toLowerCase()
)

const loading = ref(true)
const error   = ref('')
const stores  = ref([])

/* 메인 현황판(home)과 동일한 노출 순서 (config/marketing.homeOrder) */
const homeOrder = ref([])
let unsubHomeOrder = null

/* ===== 연장 신청 모달 상태 ===== */
const extOpen = ref(false)
const extTarget = ref(null)
const extDays = ref(30)
const extSubmitting = ref(false)
const extErr = ref('')

/* 연장 단가 — config/pricing.extendUnit */
const DEFAULT_UNIT = 5000
const pricePerDay = ref(DEFAULT_UNIT)
async function loadUnitPrice(){
  try{
    const r = await getDoc(doc(fbDb,'config','pricing'))
    const v = r.exists() ? Number(r.data()?.extendUnit || r.data()?.extendPrice) : NaN
    if (Number.isFinite(v) && v > 0) pricePerDay.value = v
  }catch{}
}
const totalPrice = computed(()=> Math.max(1, Number(extDays.value||0)) * Number(pricePerDay.value||DEFAULT_UNIT))

/* ===== 광고 신청 단가 기본값 ===== */
const AD_PRICE_PER_DAY = 5000
const AD_DEFAULT_DAYS = 30

// ✅ 편집폼의 days 를 기준으로 총 금액 계산
const adTotalCost = computed(() => {
  const days = Math.max(1, Number(adEdit.value.form.days || AD_DEFAULT_DAYS))
  return AD_PRICE_PER_DAY * days
})

/* ====== 제휴 리스트 + 캐시 ====== */
const partners = ref([])
const partnersLoaded = ref(false)
const partnersCacheKey = computed(()=> `cache:partners:${uid.value || 'guest'}`)
function loadPartnersCache(){
  try{
    const raw = localStorage.getItem(partnersCacheKey.value)
    if (!raw) return
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) partners.value = arr
  }catch{}
}
function savePartnersCache(list){
  try{ localStorage.setItem(partnersCacheKey.value, JSON.stringify(list)) }catch{}
}

function subHomeOrder(){
  try {
    const ref = doc(fbDb, 'config', 'marketing')
    unsubHomeOrder = onSnapshot(ref, (snap)=>{
      const data = snap.exists() ? (snap.data() || {}) : {}
      homeOrder.value = Array.isArray(data.homeOrder)
        ? data.homeOrder.map(id => String(id))
        : []
      // 순서 설정이 바뀌면 내가게 목록 정렬도 다시 적용
      applyList()
    }, (e)=>{
      console.warn('homeOrder onSnapshot err:', e?.message || e)
    })
  } catch (e) {
    console.warn('subHomeOrder error:', e?.message || e)
  }
}

/* ====== 내 배너/보드 ====== */
const boards = ref([])
const boardsLoaded = ref(false)
const boardsCacheKey = computed(()=> `cache:boards:${uid.value || 'guest'}`)
let unsubBoardsOwner = null
let unsubBoardsAuthor = null
// ✅ banner 위치 추출(도큐먼트 필드에서 키워드 뽑기)
function boardPlaceKeyFromDoc(d){
  const raw =
    d.place ||
    d.position ||
    d.slot ||
    d.target ||
    d.kind ||
    d.category ||
    ''
  return String(raw || '').toLowerCase()
}

// ✅ 키값 → 화면에 보여줄 라벨 (가게찾기 / 제휴관)
function bannerPlaceLabelFromKey(k){
  const key = String(k || '').toLowerCase()
  if (!key) return '가게찾기'

  if (
    key.includes('partner') ||
    key.includes('part') ||
    key.includes('제휴')
  ) {
    return '제휴관'
  }

  if (
    key.includes('store') ||
    key.includes('find') ||
    key.includes('finder') ||
    key.includes('가게')
  ) {
    return '가게찾기'
  }

  // 기타 값들은 일단 기본값
  return '가게찾기'
}

function loadBoardsCache(){
  try{
    const raw = localStorage.getItem(boardsCacheKey.value)
    if (!raw) return
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) boards.value = arr
  }catch{}
}
function saveBoardsCache(list){
  try{ localStorage.setItem(boardsCacheKey.value, JSON.stringify(list)) }catch{}
}
function sortByUpdatedDesc(list){
  return list.slice().sort((a,b)=> (toMs(b.updatedAt)||toMs(b.createdAt)||0) - (toMs(a.updatedAt)||toMs(a.createdAt)||0))
}

/* ✅ 배너 종류 판단: 가게찾기 / 제휴관 */
function detectBannerKind(d){
  const raw = String(
    d.place || d.slot || d.position || d.target || d.type || ''
  ).toLowerCase()

  if (
    raw.includes('partner') ||
    raw.includes('제휴') ||
    raw === 'p'
  ) return '제휴관'

  if (
    raw.includes('store') ||
    raw.includes('finder') ||
    raw.includes('가게') ||
    raw === 's'
  ) return '가게찾기'

  // 별도 필드가 없어도 partnerId 있으면 제휴관 취급
  if (d.partnerId) return '제휴관'

  // 기본값은 가게찾기
  return '가게찾기'
}

function watchMyBoards(){

  if (unsubBoardsOwner){ try{unsubBoardsOwner()}catch{}; unsubBoardsOwner = null }
  if (unsubBoardsAuthor){ try{unsubBoardsAuthor()}catch{}; unsubBoardsAuthor = null }

  const my = uid.value
  boardsLoaded.value = false
  boards.value = []
  if (!my) return

  const mergeMap = new Map()

  const handleSnap = (snap)=>{
    snap.docChanges().forEach(ch=>{
      const id = ch.doc.id
      if (ch.type === 'removed') {
        mergeMap.delete(id)
      } else {
        const d = ch.doc.data() || {}

        // ✅ 배너 위치/라벨 계산
        const placeKey   = boardPlaceKeyFromDoc(d)
        const placeLabel = bannerPlaceLabelFromKey(placeKey)

        mergeMap.set(id, {
          id,
          title: d.title || d.name || '',
          storeId: d.storeId || '',
          storeName: d.storeName || '',
          region: d.region || '',
          desc: d.desc || d.summary || '',
          // ✅ 다양한 필드 이름을 다 받아서 실제 배너 이미지 최대한 사용
          thumb:
            d.imageUrl ||
            d.bannerUrl ||
            d.bannerImage ||
            d.thumb ||
            d.cover ||
            '',
          place: placeKey,
          placeLabel,
          posts: Number(d.posts || d.postCount || 0),
          comments: Number(d.comments || d.commentCount || 0),
          createdAt: d.createdAt || null,
          updatedAt: d.updatedAt || null,
        })
      }
    })
    const list = sortByUpdatedDesc(Array.from(mergeMap.values()))
    boards.value = list
    boardsLoaded.value = true
    saveBoardsCache(list)
  }

  try{
    const q1 = query(collection(fbDb, 'boards'), where('ownerId','==', my))
    unsubBoardsOwner = onSnapshot(q1, handleSnap, ()=>{ if (!boardsLoaded.value) loadBoardsCache() })
  }catch(e){ console.warn('boards(ownerId) watch fail:', e?.message||e) }

  try{
    const q2 = query(collection(fbDb, 'boards'), where('authorId','==', my))
    unsubBoardsAuthor = onSnapshot(q2, handleSnap, ()=>{ if (!boardsLoaded.value) loadBoardsCache() })
  }catch(e){ console.warn('boards(authorId) watch fail:', e?.message||e) }

  loadBoardsCache()
}

/* 열기/편집/삭제 (보드) */
function openBoard(b){
  router.push({ path:'/gangtalk', query:{ boardId: b.id } })
}
function editBoard(b){
  router.push({ path:'/gangtalk', query:{ boardId: b.id, edit: '1' } })
}
async function removeBoard(b){
  if (!confirm('이 항목을 삭제할까요? 삭제 후에는 복구할 수 없습니다.')) return
  try{
    await deleteDoc(doc(fbDb,'boards', b.id))
  }catch(e){
    alert('삭제 중 오류가 발생했어요.')
    console.error(e)
  }
}

/* ===== Admin 식별 ===== */
const isAdminDoc = ref(false)
let unsubAdmin = null
function watchAdminDoc(){
  if (unsubAdmin){ try{unsubAdmin()}catch{}; unsubAdmin = null }
  const u = fbAuth.currentUser?.uid
  if (!u || !fbDb){ isAdminDoc.value = false; return }
  const ref = doc(fbDb, 'admins', String(u))
  unsubAdmin = onSnapshot(ref, (snap)=>{ isAdminDoc.value = snap.exists() }, ()=>{ isAdminDoc.value = false })
}
const isAdmin = computed(()=> isAdminDoc.value)

/* 타임스탬프 → ms */
const toMs = (v) => {
  if (!v) return 0
  if (typeof v === 'number') return v
  if (typeof v.seconds === 'number') return v.seconds*1000 + Math.floor((v.nanoseconds||0)/1e6)
  if (v instanceof Date) return v.getTime()
  return 0
}

/* ===== 실시간 구독 (가게) ===== */
let unsubs = []
const cache = new Map()

function clearSubs(){
  unsubs.forEach(fn => { try{ fn() }catch{} })
  unsubs = []
}
function applyList(){
  const my      = uid.value
  const myEmail = userEmail.value

  // 1) 내 가게 필터까지 적용한 전체 리스트
  const all = Array.from(cache.values()).filter((s) => {
    // 🔸 관리자는 전체 보기
    if (isAdmin.value) return true

    const oId    = s.ownerId || ''
    const oEmail = String(s.ownerEmail || s.email || '').toLowerCase()

    // 🔸 1순위: ownerId == 내 uid
    if (my && oId === my) return true

    // 🔸 2순위: ownerEmail == 내 이메일
    if (myEmail && oEmail && oEmail === myEmail) return true

    return false
  })

  // 2) 기본 정렬: displayOrder → updatedAt 내림차순
  const baseSorted = all.slice().sort((a,b)=>{
    const da = Number(a.displayOrder ?? 0)
    const db = Number(b.displayOrder ?? 0)
    if (da !== db) return da - db

    const ta = toMs(a.updatedAt) || toMs(a.createdAt)
    const tb = toMs(b.updatedAt) || toMs(b.createdAt)
    return tb - ta   // 최근 수정이 위로
  })

  // 3) config/marketing.homeOrder 가 있으면, 그 순서를 최우선으로 사용
  if (homeOrder.value.length){
    const pos = new Map(homeOrder.value.map((id,idx)=>[String(id), idx]))

    baseSorted.sort((a,b)=>{
      const ai = pos.has(String(a.id)) ? pos.get(String(a.id)) : Infinity
      const bi = pos.has(String(b.id)) ? pos.get(String(b.id)) : Infinity

      if (ai !== bi) return ai - bi   // homeOrder 순서 우선

      // 같은 순서이거나 homeOrder 에 없는 애들은 기본 정렬 규칙으로
      const da = Number(a.displayOrder ?? 0)
      const db = Number(b.displayOrder ?? 0)
      if (da !== db) return da - db

      const ta = toMs(a.updatedAt) || toMs(a.createdAt)
      const tb = toMs(b.updatedAt) || toMs(b.createdAt)
      return tb - ta
    })
  }

  stores.value = baseSorted

  window.dispatchEvent(new CustomEvent('stores:changed', {
    detail: { ids: baseSorted.map(x=>x.id) }
  }))
}

/* ===== 광고 신청 내역 (applications, type='ad') ===== */
const adApps = ref([])
let unsubAdApps = null

const adEdit = ref({
  open: false,
  id: '',
  saving: false,
  form: {
    category: '',
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    message: '',
    days: AD_DEFAULT_DAYS,   // ✅ 기본 광고기간
  },
})

function watchMyAdApplications(){
  if (unsubAdApps){ try{unsubAdApps()}catch{}; unsubAdApps = null }
  const my = uid.value
  adApps.value = []
  if (!my) return

  try{
    const qApps = query(
      collection(fbDb,'applications'),
      where('createdByUid','==', my),
      where('type','==','ad')
    )
    unsubAdApps = onSnapshot(qApps, snap => {
      const arr = []
      snap.forEach(d => {
        const x = d.data() || {}
        arr.push({ id:d.id, ...x, createdAt: x.createdAt || null })
      })
      adApps.value = arr.slice().sort((a,b)=> (toMs(b.createdAt)||0) - (toMs(a.createdAt)||0))
    })
  }catch(e){
    console.warn('watchMyAdApplications error:', e?.message || e)
  }
}

function openAdEdit(a){
  if (!a) return
  adEdit.value.open = true
  adEdit.value.id = a.id
  adEdit.value.saving = false
  adEdit.value.form = {
    category: a.extra?.category || '',
    name: a.companyName || a.name || '',
    contactName: a.contactName || '',
    email: a.email || a.createdByEmail || '',
    phone: a.phone || '',
    address: a.extra?.address || '',
    message: a.message || '',
    // ✅ 저장된 days 가 있으면 사용, 없으면 30일
    days: a.days || AD_DEFAULT_DAYS,
  }
}

function closeAdEdit(){
  adEdit.value.open = false
}

async function saveAdEdit(){
  const f = adEdit.value.form
  if (!adEdit.value.id) return
  if (!f.name.trim() || !f.category.trim()){
    alert('카테고리와 가게명을 모두 입력해 주세요.')
    return
  }

  // ✅ 입력된 광고기간 기준으로 금액 계산
  const days = Math.max(1, Number(f.days || AD_DEFAULT_DAYS))
  const unit = AD_PRICE_PER_DAY
  const amount = days * unit

  adEdit.value.saving = true
  try{
    await setDoc(
      doc(fbDb,'applications', adEdit.value.id),
      {
        type: 'ad',
        companyName: f.name.trim(),
        contactName: f.contactName.trim(),
        phone: f.phone.trim(),
        email: f.email.trim(),
        message: f.message.trim(),
        extra: {
          category: f.category.trim(),
          address: f.address.trim(),
        },
        // ✅ 광고기간/단가/총액도 함께 저장
        days,
        unit,
        amount,
        updatedAt: serverTimestamp(),
      },
      { merge:true }
    )
    alert('광고 신청이 수정되었습니다.')
    adEdit.value.open = false
  }catch(e){
    console.warn('saveAdEdit error', e)
    alert('저장 중 오류가 발생했습니다.')
  }finally{
    adEdit.value.saving = false
  }
}

async function removeAdApp(a){
  if (!a?.id) return
  if (!confirm('이 광고 신청을 삭제할까요? 삭제 후에는 복구할 수 없습니다.')) return
  try{
    await deleteDoc(doc(fbDb,'applications', a.id))
  }catch(e){
    console.warn('removeAdApp error', e)
    alert('삭제 중 오류가 발생했습니다.')
  }
}

async function mountRealtime(){
  clearSubs()
  cache.clear()

  const my      = uid.value
  const myEmail = userEmail.value

  if (!my){
    loading.value = false
    router.replace({ path:'/auth', query:{ next:'/my-stores', mode:'login', who:'biz' } })
    return
  }

  try{
    // 공통 onSnapshot 핸들러: 어떤 쿼리에서 오든 cache에 합쳐서 관리
    const handleSnap = (snap)=>{
      snap.docChanges().forEach(ch => {
        const id = ch.doc.id
        if (ch.type === 'removed') {
          cache.delete(id)
        } else {
          cache.set(id, { id, ...ch.doc.data() })
        }
      })
      applyList()
      loading.value = false
    }
    const handleErr = (e)=>{
      console.warn('stores onSnapshot err:', e)
      loading.value = false
    }

    if (isAdmin.value){
      // 🔹 관리자는 기존처럼 전체 stores 구독
      const qAll = query(collection(fbDb, 'stores'))
      const unsubAll = onSnapshot(qAll, handleSnap, handleErr)
      unsubs.push(unsubAll)

      // 로컬에만 있던 id 들도 그대로 유지
      const locals = getLocalIds()
      locals.forEach((id)=>{
        const ref = doc(fbDb, 'stores', id)
        const unsub = onSnapshot(ref, (d)=>{
          if (d.exists()){
            const data = { id:d.id, ...d.data() }
            cache.set(d.id, data)
          }else{
            cache.delete(id)
          }
          applyList()
          loading.value = false
        }, (e)=>console.warn('local onSnapshot err:', e))
        unsubs.push(unsub)
      })
    } else {
      // 🔹 일반 사용자
      // 1) ownerId == 내 uid 인 가게
      const qOwner = query(collection(fbDb, 'stores'), where('ownerId','==', my))
      const unsubOwner = onSnapshot(qOwner, handleSnap, handleErr)
      unsubs.push(unsubOwner)

      // 2) ownerEmail == 내 이메일 인 가게 (관리자가 이메일로만 등록해둔 매장)
      if (myEmail) {
        const qEmail = query(collection(fbDb, 'stores'), where('ownerEmail','==', myEmail))
        const unsubEmail = onSnapshot(qEmail, handleSnap, handleErr)
        unsubs.push(unsubEmail)
      }
    }

    // 나머지 부가 구독/캐시는 그대로 유지
    loadPartnersCache()
    watchMyPartners()
    watchMyExtendApprovals()
    watchMyBoards()
    watchMyAdApplications()   // 🔥 광고 신청 내역도 같이 구독
  }catch(e){
    console.error(e)
    error.value = e?.message || '알 수 없는 오류'
    loading.value = false
  }
}

async function reload(){
  loading.value = true
  await mountRealtime()
}

function getLocalIds(){
  try{ const v = JSON.parse(localStorage.getItem('my:storeIds') || '[]'); return Array.isArray(v)?v:[] }catch{ return [] }
}

/* 이동/행동 */
function createNew(){ router.push({ name:'storeEdit', params:{ id:'new' } }) }
function openEdit(id){ router.push({ name:'storeEdit', params:{ id } }) }
function goFind(s){ router.push({ path:'/find', query:{ view:'list', q:s?.name || '' } }) }
function goPartnerApply(){ router.push('/partner-apply') }

async function remove(id){
  if (!confirm('정말 삭제할까요? 삭제 후에는 복구할 수 없습니다.')) return
  try{
    await deleteDoc(doc(fbDb,'stores', id))
  }catch(e){
    alert('삭제 중 오류가 발생했어요.')
    console.error(e)
  }
}

/* === (참조용) 상태 라벨 === */
const statusLabel = (s) => {
  return s === 'pending'
    ? '검토 중'
    : s === 'approved'
    ? '승인됨'
    : s === 'rejected'
    ? '거절됨'
    : s;
};

/* ====== 제휴 — 내 신청 전체 구독 ====== */
let unsubPartners = null
function sortByCreatedDesc(list){
  return list.slice().sort((a,b)=> (toMs(b.createdAt)||0) - (toMs(a.createdAt)||0))
}
function watchMyPartners(){
  if (unsubPartners){ try{unsubPartners()}catch{}; unsubPartners = null }
  const my = uid.value
  if (!my) { partners.value = []; return }

  const qReq = query(
    collection(fbDb, 'partnerRequests'),
    where('ownerId','==', my)
  )
  unsubPartners = onSnapshot(qReq, (snap)=>{
    const list = []
    snap.forEach(d => {
      const r = d.data() || {}
      list.push({
        id: r.partnerId || `pt_${d.id}`,
        requestId: d.id,
        status: r.status || 'pending',
        reason: r.reason || '',
        name: r.name || '',
        region: r.region || '',
        category: String(r.category || 'etc').toLowerCase(),
        desc: r.desc || '',
        address: r.address || '',
        hours: r.hours || '',
        holiday: r.holiday || '',
        benefits: r.benefits || '',
        tags: Array.isArray(r.tags) ? r.tags : [],
        thumb: r.thumb || '',
        adStart: r.adStart || null,
        adEnd: r.adEnd || null,
        createdAt: r.createdAt || null,
      })
    })
    const sorted = sortByCreatedDesc(list)
    partners.value = sorted
    partnersLoaded.value = true
    savePartnersCache(sorted)
  }, (e)=>{
    console.warn('partnerRequests watch error:', e?.message || e)
    if (!partnersLoaded.value) loadPartnersCache()
  })
}

/* ===== 연장 모달 열기/닫기 & 신청 ===== */
function openExtend(type, target){
  extErr.value = ''
  extDays.value = 30
  extTarget.value = {
    type,
    id: type==='store' ? target.id : target.requestId,
    name: target.name || '',
    baseStart: target.adStart || null,
    baseEnd: target.adEnd || null
  }
  extOpen.value = true
}
function closeExtend(){
  extOpen.value = false
  extTarget.value = null
  extErr.value = ''
}
async function requestExtend(){
  if (!extTarget.value) return
  const user = fbAuth.currentUser
  if (!user){ extErr.value = '로그인이 필요합니다.'; return }
  const days = Math.max(1, Math.min(365, Number(extDays.value||0)))
  const ppd  = Number(pricePerDay.value||DEFAULT_UNIT)
  extSubmitting.value = true
  extErr.value = ''
  try{
    const ref = doc(collection(fbDb,'extendRequests'))
    const payload = {
      id: ref.id,
      ownerId: user.uid,
      ownerEmail: user.email || '',
      targetType: extTarget.value.type,
      targetId: extTarget.value.id,
      storeId: extTarget.value.type==='store' ? extTarget.value.id : '',
      days,
      unit: ppd,
      amount: days * ppd,
      status: 'pending',
      processed: false,
      baseStart: extTarget.value.baseStart || null,
      baseEnd: extTarget.value.baseEnd || null,
      createdAt: serverTimestamp(),
      decidedAt: null,
    }
    await setDoc(ref, payload)

    try{
      const nref = doc(collection(fbDb,'adminInbox'))
      await setDoc(nref, {
        id: nref.id,
        kind: 'extendRequest',
        requestId: ref.id,
        ownerId: user.uid,
        targetType: payload.targetType,
        targetId: payload.targetId,
        title: `[연장신청] ${extTarget.value.name} — ${days}일 (${(days*ppd).toLocaleString()}원)`,
        createdAt: serverTimestamp(),
        unread: true,
      })
    }catch(e){ console.warn('adminInbox notify fail:', e?.message || e) }

    closeExtend()
    alert('연장신청이 접수되었습니다. 운영자가 승인 후 자동으로 연장됩니다.')
  }catch(e){
    console.error(e)
    extErr.value = '신청 중 오류가 발생했어요.'
  }finally{
    extSubmitting.value = false
  }
}

/* ===== 연장 승인 감시 → 자동 연장 처리 ===== */
let unsubExtendApproved = null
function watchMyExtendApprovals(){
  if (unsubExtendApproved){ try{unsubExtendApproved()}catch{}; unsubExtendApproved = null }
  const my = uid.value
  if (!my) return

  const qExt = query(
    collection(fbDb,'extendRequests'),
    where('ownerId','==', my),
    where('status','==', 'approved'),
    where('processed','==', false)
  )
  unsubExtendApproved = onSnapshot(qExt, async (snap)=>{
    for (const d of snap.docs){
      const er = { id:d.id, ...(d.data()||{}) }
      try{
        await applyExtension(er)
        await updateDoc(doc(fbDb,'extendRequests', er.id), {
          processed:true,
          processedAt: serverTimestamp(),
          result:'ok'
        })
      }catch(e){
        console.error('applyExtension error:', e)
        try{
          await updateDoc(doc(fbDb,'extendRequests', er.id), {
            processed:true,
            processedAt: serverTimestamp(),
            result:'fail',
            failReason: e?.message || String(e)
          })
        }catch{}
      }
    }
  }, (e)=>console.warn('extendRequests watch error:', e?.message||e))
}

/* 실제 연장 적용 로직 */
async function applyExtension(er){
  const days   = Math.max(1, Number(er.days||0))
  const addMs  = days * MS_DAY
  const now    = Date.now()

  if (er.targetType === 'store'){
    const ref = doc(fbDb,'stores', er.targetId)
    const cur = await getDoc(ref)
    if (!cur.exists()) throw new Error('대상 가게를 찾을 수 없어요.')
    const d = cur.data() || {}
    const start = toMs(d.adStart) || now
    const base  = Math.max(toMs(d.adEnd), now)
    const next  = base + addMs
    await updateDoc(ref, { adStart:start, adEnd: next, updatedAt: serverTimestamp() })
  }else{
    const ref = doc(fbDb,'partnerRequests', er.targetId)
    const cur = await getDoc(ref)
    if (!cur.exists()) throw new Error('대상 제휴신청을 찾을 수 없어요.')
    const d = cur.data() || {}
    const start = toMs(d.adStart) || now
    const base  = Math.max(toMs(d.adEnd), now)
    const next  = base + addMs
    await updateDoc(ref, { adStart:start, adEnd: next, updatedAt: serverTimestamp() })
  }
}

/* 표시 유틸 */
function fmt(d){
  const ms = toMs(d); if (!ms) return null
  const t = new Date(ms)
  const y = t.getFullYear()
  const m = String(t.getMonth()+1).padStart(2,'0')
  const day = String(t.getDate()).padStart(2,'0')
  return `${y}.${m}.${day}`
}
function formatPeriod(a,b){
  const s = fmt(a), e = fmt(b)
  if (!s && !e) return '—'
  if (s && !e)  return `${s} ~`
  if (!s && e)  return `~ ${e}`
  return `${s} ~ ${e}`
}
function formatDateTime(d){
  const ms = toMs(d); if (!ms) return '—'
  const t = new Date(ms)
  const y = t.getFullYear()
  const m = String(t.getMonth()+1).padStart(2,'0')
  const day = String(t.getDate()).padStart(2,'0')
  const hh = String(t.getHours()).padStart(2,'0')
  const mm = String(t.getMinutes()).padStart(2,'0')
  return `${y}.${m}.${day} ${hh}:${mm}`
}

/* ===== 시급/혼잡도 보조 ===== */
function hourlyOf(s){
  return s?.hourly ?? s?.wage ?? s?.payPerHour ?? s?.hourPay ?? s?.hourlyPay ?? s?.hourlyWage ?? 0
}
const formatWon = (n)=> (Number(n||0)).toLocaleString('ko-KR') + '원'

/* ===== 혼잡도 계산/색상 ===== */
const num = (v) => {
  const n = Number(v); if (Number.isFinite(n)) return n
  const m = String(v||'').match(/\d+/g)
  return m ? Number(m[m.length-1]) : 0
}
function computeStatus(s){
  const saved = String(s?.status || '')
  if (['여유','보통','혼잡'].includes(saved)) return saved

  const totalRooms = num(s?.totalRooms ?? s?.total ?? s?.rooms)
  const maxPersons = num(s?.maxPersons ?? s?.capacity ?? s?.max)
  const match      = num(s?.match)
  const persons    = num(s?.persons)

  const ratios = []
  if (totalRooms > 0) ratios.push(match / totalRooms)
  if (maxPersons > 0) ratios.push(persons / maxPersons)

  const availability = ratios.length ? Math.min(...ratios.map(r => Math.max(0, Math.min(1, r)))) : 1

  if (availability >= 0.60) return '여유'
  if (availability >= 0.30) return '보통'
  return '혼잡'
}
const wifiColor = (storeOrStatus)=>{
  const st = typeof storeOrStatus === 'string'
    ? storeOrStatus
    : computeStatus(storeOrStatus || {})
  if (st === '여유') return 'ok'
  if (st === '보통') return 'mid'
  return 'busy'
}

/* 이벤트 문구 추출 */
function eventOf(s){
  if (s?.eventMain) return String(s.eventMain)
  if (Array.isArray(s?.events) && s.events.length) return String(s.events[0])
  return ''
}

/* ===== 제휴 카드 액션 ===== */
function goFindPartner(p){
  router.push({ path:'/partners', query:{ q: p?.name || '' } })
}
function editPartner(p){
  router.push({ path:'/partner-apply', query:{ id: p.requestId } })
}
function infoPartner(){
  alert('제휴 등록은 신청서에서 진행됩니다.')
}
function removePartner(){
  alert('제휴 해지는 운영자에게 문의해 주세요.')
}

/* Auth & Admin 준비 */
let unsubAuth = null
onMounted(() => {
  // 🔹 현황판 순서(homeOrder)도 같이 구독
  subHomeOrder()

  if (fbAuth.currentUser) {
    watchAdminDoc()
    loadUnitPrice()
    mountRealtime()
  }
  unsubAuth = onAuthStateChanged(fbAuth, () => { watchAdminDoc(); loadUnitPrice(); mountRealtime() })
})
watch(isAdmin, () => { mountRealtime() })
onBeforeUnmount(() => {
  clearSubs()
  unsubAuth?.()
  unsubAdmin?.()
  unsubPartners?.()
  unsubExtendApproved?.()
  unsubBoardsOwner?.()
  unsubBoardsAuthor?.()
  unsubHomeOrder?.()
  if (unsubAdApps) { try{unsubAdApps()}catch{} }
})
</script>

<style scoped>
.page{ padding:12px 16px 120px; }

/* 헤더 */
.topbar{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:10px;
  margin-bottom:10px;
}
.ttl{ margin:0; font-size:20px; font-weight:900; white-space:nowrap; }
.rt{ margin-left:auto; display:flex; flex-direction:column; align-items:flex-end; gap:8px; }
.tabs{ display:flex; gap:6px; flex-wrap:nowrap }
.tab{
  height:30px; padding:0 12px;
  border:1px solid var(--line);
  background:var(--surface);
  color:var(--fg);
  border-radius:999px;
  font-weight:900; font-size:13px;
  white-space:nowrap;
}
.tab.on{ outline:2px solid var(--accent); background:color-mix(in oklab, var(--accent), white 92%) }
.rt-actions{ display:flex }
.reg-btn{ height:38px; padding:0 14px; border-radius:12px; font-weight:900; white-space:nowrap; }
.reg-btn-lg{ height:50px; padding:8px 16px; border-radius:14px; }

/* 공통 버튼 */
.btn{ border:1px solid var(--line); background:var(--surface); color:var(--fg); padding:8px 12px; border-radius:10px; font-weight:800; }
.btn.primary{ background:var(--accent); border-color:var(--accent); color:#fff }
.btn.ghost{ background:transparent }
.btn.warning{ border-color:#f3a000; color:#a46200; background:color-mix(in oklab, #f3a000, white 90%) }
.btn.danger{ border-color:#ff6a6a; color:#ff6a6a; background:color-mix(in oklab, #ff6a6a, white 92%) }
.btn.success{ border-color:#22c55e; color:#fff; background:#22c55e }
.btn.wide{ width:100% }
.empty{ text-align:center; color:var(--muted); padding:24px 0 }

.stack{ display:flex; flex-direction:column; gap:12px; margin-bottom:24px }
.sec-ttl{ margin:4px 0; font-size:18px; font-weight:900 }

.pro-card{
  position:relative;
  border:1px solid var(--line); border-radius:16px; background:var(--surface); color:var(--fg);
  padding:12px; box-shadow:0 8px 18px var(--shadow); display:flex; flex-direction:column; gap:10px;
}

.wifi-pin{
  position:absolute; top:10px; right:12px;
  width:28px; height:28px; border-radius:999px;
  display:flex; align-items:center; justify-content:center;
  background:var(--surface); border:1px solid var(--line);
  box-shadow:0 4px 10px var(--shadow);
  line-height:0;
}
.wifi-pin.ok{ color:#21c36b } .wifi-pin.mid{ color:#f2a100 } .wifi-pin.busy{ color:#ff6a6a }

.pro-top{ display:flex; gap:12px; align-items:stretch; }
.pro-thumb{
  width:150px; min-height:160px; border-radius:12px; flex:0 0 auto;
  background:#f3f4f6; background-size:cover; background-position:center;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.05); align-self:stretch;
}
@media (max-width:420px){ .pro-thumb{ width:130px; min-height:150px; } }
.pro-meta{ flex:1; min-width:0; display:flex; flex-direction:column; gap:6px }

.pro-head{ display:flex; align-items:center; gap:8px; min-width:0; }
.pro-name{ font-size:18px; font-weight:900; min-width:0; }

.pro-sub{ color:var(--muted); font-size:13px }

/* 소개/이벤트 블록 */
.one-line{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.pro-intro{
  border:1px solid var(--line);
  border-radius:10px;
  padding:7px 10px;
  font-weight:800;
  background:var(--surface);
  color:var(--fg);
}
.pro-ev{
  display:grid;
  grid-template-columns:auto 1fr;
  gap:8px;
  align-items:center;
}
.ev-lbl{
  font-size:12px; font-weight:900; color:var(--muted);
}
.ev-text{
  border:1px solid var(--line);
  border-radius:10px;
  padding:6px 10px;
  background:var(--surface);
  font-weight:800;
  color:var(--fg);
}

.pro-desc{ margin-top:2px; line-height:1.35 }
.wage-line{ margin-top:4px; font-weight:900; color:#ff2c8a; }

.pro-chips{ display:flex; gap:8px; flex-wrap:wrap; margin-top:6px }
.chip{ border:1px solid var(--line); border-radius:999px; padding:6px 10px; font-size:12px; font-weight:800; }
.chip.strong{ background:color-mix(in oklab, var(--accent), white 92%); border-color:color-mix(in oklab, var(--accent), white 40%); }

.apply{ display:flex; gap:6px; align-items:center; margin-top:2px }
.badge{ border:1px solid var(--line); border-radius:999px; padding:2px 8px; font-size:12px; font-weight:900 }
.badge.pending{ background:#fff7ed; border-color:#fed7aa; color:#a16207 }
.badge.approved{ background:#dcfce7; border-color:#bbf7d0; color:#166534 }
.badge.rejected{ background:#fee2e2; border-color:#fecaca; color:#b91c1c }
.claim{ margin-top:4px; font-size:12px; color:#f2a100 }

.pro-actions{ display:flex; gap:8px; flex-wrap:wrap; padding-top:4px; border-top:1px dashed var(--line); }
.spacer{ flex:1 }

.pro-period{ display:flex; justify-content:center; align-items:center; gap:8px; color:var(--muted); font-size:13px; padding-top:4px; }
.pro-period strong{ color:var(--fg); font-weight:900 }

.stack-cta{ margin-top:2px }
/* ✅ 내 배너광고: (가게찾기)/(제휴관) 라벨 */
.b-kind{
  margin-right:4px;
  font-size:13px;
  font-weight:900;
  color:var(--accent);
}
/* ===== 모달 ===== */
.modal-wrap{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.45);
  display:flex;
  justify-content:center;
  align-items:flex-start;
  padding:18px;
  z-index:9999;
  overflow-y:auto;
}

/* ✅ 모달 높이를 더 줄이고, 위로 조금 올리기 + 아래 여유 패딩 */
.modal{
  width:min(420px, 100%);
  background:var(--surface);
  color:var(--fg);
  border:1px solid var(--line);
  border-radius:16px;
  box-shadow:0 16px 40px var(--shadow);

  padding:12px 16px 28px;       /* 위/옆은 12~16, 아래는 28px로 조금 더 */
  display:flex;
  flex-direction:column;
  gap:10px;

  max-height: calc(100vh - 120px);  /* 🔽 상단·하단 120px 정도 여유 → 네비바보다 위에 위치 */
  overflow-y:auto;
  box-sizing:border-box;
  margin-top:24px;
}

.modal-ttl{ margin:0; font-size:18px; font-weight:900 }
/* ✅ 라벨 위아래 여백 살짝 줄이기 */
.form label{
  font-size:13px;
  color:var(--muted);
  margin:4px 0;          /* ← 기본 간격 줄이기 */
}

/* ✅ 인풋 세로 패딩도 살짝 줄여서 전체 높이 감소 */
.form input{
  width:100%;
  padding:8px 10px;      /* 10px → 8px, 12px → 10px */
  border-radius:12px;
  border:1px solid var(--line);
  background:var(--bg);
}

.sum{ display:flex; justify-content:space-between; align-items:center; }
.row{
  display:flex;
  gap:8px;
  justify-content:flex-end;
  margin-top:8px;      /* ⬅️ 살짝 위로 띄우기 */
}

.err{ color:#b91c1c; font-size:13px }
.muted{ color:var(--muted) }
.sm{ font-size:12px }

/* 라이트 모드 대비 */
@media (prefers-color-scheme: light){
  .tab, .btn, .btn.primary, .btn.danger, .chip { color:#111; }
}
/* 내 배너광고 위치 태그 */
.banner-place-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  color: #ff2c8a;
  background: color-mix(in oklab, #ff2c8a, white 90%);
}

/* 광고비 블록 / 계좌 안내 */
.bill{
  border:1px dashed var(--line);
  border-radius:10px;
  padding:8px 10px;
  background:color-mix(in oklab, var(--accent), white 96%);
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
  border-top:1px solid var(--line);
  margin-top:4px;
  padding-top:6px;
}
.bill .li-right{
  display:flex;
  flex-direction:column;
  align-items:flex-end;
}
.bill .amt{ font-weight:900; }

.account{
  margin-top:6px;
  padding:8px 10px;
  border-radius:10px;
  border:1px solid var(--line);
  background:var(--surface);
  display:flex;
  flex-direction:column;
  gap:2px;
}
.acc-bank{ font-weight:900; font-size:13px; }
.acc-owner{ font-size:12px; color:var(--muted); }

</style>
