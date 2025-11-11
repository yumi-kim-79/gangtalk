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
          <!-- 필요 시 관리자 신규 등록 버튼은 유지 -->
          <button v-if="activeTab==='stores' && isAdmin" class="btn primary reg-btn" @click="createNew">새 업체 등록</button>
          <button v-if="activeTab==='partners' && isAdmin" class="btn primary reg-btn reg-btn-lg" @click="goPartnerApply">제휴업체 등록신청</button>
        </div>
      </div>
    </header>

    <section v-if="loading" class="empty">불러오는 중…</section>

    <section v-else-if="error" class="empty">
      <p>불러오는 중 문제가 발생했어요.<br />{{ error }}</p>
      <button class="btn" @click="reload">다시 시도</button>
    </section>

    <!-- ===== 내가게찾기 (내 업체 목록) ===== -->
    <section v-show="!loading && !error && activeTab==='stores'" class="stack" ref="secStores">
      <div v-if="stores.length === 0" class="empty">
        <p>아직 등록된 내 업체가 없습니다.</p>
        <button v-if="isAdmin" class="btn primary" @click="createNew">새 업체 등록</button>
      </div>

      <article v-for="s in stores" :key="s.id" class="pro-card">
        <div class="wifi-pin" :class="wifiColor(s)" aria-label="혼잡도">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
            <path d="M8.5 16a6 6 0 0 1 7 0"/>
            <path d="M12 20h.01"/>
          </svg>
        </div>

        <div class="pro-top">
          <div class="pro-thumb" :style="{ backgroundImage:`url(${s.thumb || fallbackThumb(s.category)})` }"/>
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
            <div v-if="hourlyOf(s)" class="wage-line">시급 {{ formatWon(hourlyOf(s)) }}</div>

            <!-- 맞출방/필요인원 -->
            <div class="pro-chips">
              <span class="chip strong"><b>{{ s.match || 0 }}</b> 맞출방</span>
              <span class="chip strong"><b>{{ s.persons || 0 }}</b> 맞출인원</span>
            </div>

            <!-- ⛔ 관리자/기업 공통: 승인/검토 배지 비표시 -->
            <!-- (요청에 따라 완전히 제거) -->

            <div v-if="!s.ownerId" class="claim">소유권 연결 중…</div>
          </div>
        </div>

        <div class="pro-actions">
          <!-- ✅ 관리자/기업 공통: 편집, 삭제만 남김 -->
          <button class="btn primary" @click="openEdit(s.id)">편집</button>
          <span class="spacer"></span>
          <button class="btn danger" @click="remove(s.id)">삭제</button>
        </div>

        <div class="pro-period">
          <span>광고기간</span>
          <strong>{{ formatPeriod(s.adStart, s.adEnd) }}</strong>
        </div>
      </article>

      <div class="stack-cta">
        <button v-if="isAdmin" class="btn primary wide" @click="createNew">+ 새 업체 등록</button>
      </div>
    </section>

    <!-- ===== 내 배너광고 ===== -->
    <section v-show="!loading && !error && activeTab==='gangtalk'" class="stack" ref="secGangtalk" id="gangtalk">
      <h2 class="sec-ttl">내 배너광고</h2>

      <div v-if="boards.length === 0" class="empty">
        <p>신청한 배너 광고가 없어요.</p>
        <p class="sm muted">광고 신청 후 관리자가 등록해 드립니다.</p>
      </div>

      <article v-for="b in boards" :key="b.id" class="pro-card">
        <div class="wifi-pin ok" aria-label="게시판">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </div>

        <div class="pro-top">
          <div class="pro-thumb" :style="{ backgroundImage:`url(${b.thumb || fallbackThumb('default')})` }"/>
          <div class="pro-meta">
            <div class="pro-head">
              <div class="pro-name ellip">{{ b.title || b.storeName || '(제목 없음)' }}</div>
            </div>

            <div class="pro-sub ellip">
              {{ b.storeName ? ('업체: ' + b.storeName) : '배너 광고' }}
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

            <!-- 제휴 신청 상태는 관리자 니즈가 남아 있을 수 있으므로 유지 -->
            <div v-if="isAdmin" class="apply">
              <span class="badge"
                :class="{ approved:p.status==='approved', pending:p.status==='pending', rejected:p.status==='rejected' }">
                {{ statusLabel(p.status) }}
              </span>
              <small v-if="p.status==='rejected' && p.reason" class="muted">(사유: {{ p.reason }})</small>
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
import { Auth, Db } from '@/firebase.js'
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
const loading = ref(true)
const error   = ref('')
const stores  = ref([])

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

/* ====== 내 배너/보드 ====== */
const boards = ref([])
const boardsLoaded = ref(false)
const boardsCacheKey = computed(()=> `cache:boards:${uid.value || 'guest'}`)
let unsubBoardsOwner = null
let unsubBoardsAuthor = null
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
      if (ch.type === 'removed') mergeMap.delete(id)
      else {
        const d = ch.doc.data() || {}
        mergeMap.set(id, {
          id,
          title: d.title || d.name || '',
          storeId: d.storeId || '',
          storeName: d.storeName || '',
          region: d.region || '',
          desc: d.desc || d.summary || '',
          thumb: d.thumb || d.cover || '',
          posts: Number(d.posts || d.postCount || 0),
          comments: Number(d.comments || d.commentCount || 0),
          createdAt: d.createdAt || null,
          updatedAt: d.updatedAt || null
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
  const my = uid.value
  const list = Array.from(cache.values())
    .filter(s => isAdmin.value ? true : s.ownerId === my)
    .sort((a,b)=>{
      const tb = toMs(b.updatedAt) || toMs(b.createdAt)
      const ta = toMs(a.updatedAt) || toMs(a.createdAt)
      return tb - ta
    })
  stores.value = list
  window.dispatchEvent(new CustomEvent('stores:changed', { detail: { ids: list.map(x=>x.id) } }))
}

async function mountRealtime(){
  clearSubs()
  cache.clear()

  const my = uid.value
  if (!my){
    loading.value = false
    router.replace({ path:'/auth', query:{ next:'/my-stores', mode:'login', who:'biz' } })
    return
  }

  try{
    const baseQuery = isAdmin.value
      ? query(collection(fbDb, 'stores'))
      : query(collection(fbDb, 'stores'), where('ownerId','==', my))
    const unsubBase = onSnapshot(baseQuery, (snap)=>{
      snap.docChanges().forEach(ch => {
        const id = ch.doc.id
        if (ch.type === 'removed') cache.delete(id)
        else cache.set(id, { id, ...ch.doc.data() })
      })
      applyList()
      loading.value = false
    }, (e)=>{ console.warn('stores onSnapshot err:', e); loading.value=false })
    unsubs.push(unsubBase)

    loadPartnersCache()
    watchMyPartners()
    watchMyExtendApprovals()
    watchMyBoards()

    if (isAdmin.value){
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
    }
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
function statusLabel(s){ return s==='pending'?'검토중':s==='approved'?'승인됨':s==='rejected'?'거절됨':s }

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
    alert('연장신청이 접수되었습니다. 운영자 승인 후 자동으로 연장됩니다.')
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

/* ===== 모달 ===== */
.modal-wrap{
  position:fixed; inset:0; background:rgba(0,0,0,.45);
  display:flex; align-items:center; justify-content:center; padding:18px; z-index:9999;
}
.modal{
  width:min(420px, 100%); background:var(--surface); color:var(--fg);
  border:1px solid var(--line); border-radius:16px; box-shadow:0 16px 40px var(--shadow);
  padding:16px; display:flex; flex-direction:column; gap:12px;
}
.modal-ttl{ margin:0; font-size:18px; font-weight:900 }
.form label{ font-size:13px; color:var(--muted) }
.form input{ width:100%; padding:10px 12px; border-radius:12px; border:1px solid var(--line); background:var(--bg) }
.sum{ display:flex; justify-content:space-between; align-items:center; }
.row{ display:flex; gap:8px; justify-content:flex-end }
.err{ color:#b91c1c; font-size:13px }
.muted{ color:var(--muted) }
.sm{ font-size:12px }

/* 라이트 모드 대비 */
@media (prefers-color-scheme: light){
  .tab, .btn, .btn.primary, .btn.danger, .chip { color:#111; }
}
</style>
