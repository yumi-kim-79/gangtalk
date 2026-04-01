<!-- src/pages/StoreDetail.vue -->
<template>
  <main class="detail">
    <!-- ===== 상단: 좌우 분할(왼 사진 / 오른 정보) ===== -->
    <section class="top container">
      <div class="split">
        <!-- 왼쪽: 사진 -->
        <div class="hero-card" :style="heroStyle" aria-label="업체 대표 이미지"></div>

        <!-- 오른쪽: 핵심 정보 -->
        <div class="right-card">
          <div class="right-top">
            <h1 class="right-name ellip">{{ store.name || '가게' }}</h1>
            <p class="right-meta ellip">
              <span class="loc">{{ store.region || '-' }}</span>
              <span class="dot">·</span>
              <span class="cat">{{ catLabel }}</span>
            </p>

            <!-- 목록용 짧은 소개 (StoreEditPage의 16자 소개) -->
            <p v-if="listIntro" class="right-intro ellip">
              {{ listIntro }}
            </p>

            <!-- 담당자 정보는 상세 상단에서는 노출하지 않음 (안심문자/안심전화용 데이터만 내부 사용) -->

            <!-- 평점 + 별점 입력 + 찜 -->
            <div class="rate-row">
              <p class="rate-line">
                ⭐️ <b>{{ ratingText }}</b>
                <!-- ✅ 평가수 대신 찜(좋아요) 수 표기 -->
                <span class="muted">({{ likesCount }})</span>
              </p>

              <!-- 별점 -->
              <div class="stars" role="radiogroup" aria-label="별점 주기">
                <button
                  v-for="n in 5"
                  :key="n"
                  class="star-btn"
                  :class="{ on: (myRating || 0) >= n }"
                  type="button"
                  role="radio"
                  :aria-checked="(myRating || 0) === n"
                  :aria-label="`${n}점 주기`"
                  @click.stop="rate(n)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                </button>
                <button
                  class="star-clear"
                  type="button"
                  title="내 별점 지우기"
                  v-if="myRating"
                  @click.stop="rate(0)"
                >지우기</button>
              </div>

              <!-- 찜 (아이콘만) -->
              <button
                class="wish-btn"
                :class="{ on: myWished }"
                type="button"
                @click.stop="toggleWish"
                :aria-pressed="myWished ? 'true' : 'false'"
                :title="myWished ? '찜 해제' : '찜하기'"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.1 21.35 10 19.28C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 18 4 20 6 20 8.5c0 3.78-3.4 6.86-8 10.78l-1.9 2.07z"/>
                </svg>
              </button>
            </div>
            <!-- ✅ 선택된 담당자 인라인 표시 (찜 왼쪽 아래) -->
            <div v-if="activeManager" class="mgr-inline-bar">
              <!-- 1줄째: 이름만 -->
              <div class="mgr-inline-row mgr-inline-row-name">
                <span class="mgr-inline-name">
                  {{ activeManager.name || '담당자' }}
                </span>
              </div>

              <!-- 2줄째: 번호 + 연결 버튼 -->
              <div class="mgr-inline-row mgr-inline-row-phone">
                <span v-if="activeManager.phone" class="mgr-inline-phone-num">
                  {{ activeManager.phone }}
                </span>

                <button
                  v-if="activeManager.phone"
                  type="button"
                  class="mgr-inline-phone-btn"
                  @click="dialInlineManager"
                >
                  연결
                </button>

                <span v-else class="mgr-inline-phone muted">연락처 미등록</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 본문: 소개 / 이벤트 / 시급 / 영업정보 / 위치 ===== -->
    <section class="container">
      <!-- ▼ 연락 버튼 (소개 위) ▼ -->
      <div class="contact-bar">
        <button class="cbtn" type="button" @click="sendSafeSMS" :disabled="!hasSafePhone">안심문자</button>
        <button class="cbtn" type="button" @click="callSafeNumber" :disabled="!hasSafePhone">안심전화</button>
        <button class="cbtn" type="button" @click="openKakaoChat" :disabled="!canOpenChat">오픈카톡</button>
      </div>
      <!-- ▲ 연락 버튼 ▲ -->

      <!-- 소개 + 편집 버튼 -->
      <div class="sec-row">
        <h2 class="sec">소개</h2>
        <button
          v-if="isBiz"
          class="sec-edit"
          type="button"
          @click="goEditSection('intro')"
        >
          편집
        </button>
      </div>
      <p class="para" v-if="fullDesc">{{ fullDesc }}</p>
      <p class="para muted" v-else>소개가 아직 등록되지 않았어요.</p>

      <!-- 이벤트 -->
      <template v-if="hasAnyEvent">
        <div class="sec-row">
          <h2 class="sec">이벤트</h2>
          <button
            v-if="isBiz"
            class="sec-edit"
            type="button"
            @click="goEditSection('event')"
          >
            편집
          </button>
        </div>
        <div class="card">
          <div v-if="store.eventMain" class="ev-main">• {{ store.eventMain }}</div>
          <ul v-if="(store.events||[]).length" class="ev-list">
            <li v-for="(ev,i) in store.events" :key="i" class="ev-li">• {{ ev }}</li>
          </ul>
          <p v-if="!store.eventMain && !(store.events||[]).length" class="muted tiny">등록된 이벤트가 없어요.</p>
        </div>
      </template>

      <!-- 시급 -->
      <div class="sec-row">
        <h2 class="sec">시급</h2>
        <button
          v-if="isBiz"
          class="sec-edit"
          type="button"
          @click="goEditSection('pay')"
        >
          편집
        </button>
      </div>
      <div class="card pay-card">
        <div class="pay-line">
          <span class="k">시급</span>
          <span class="v pay-amt" :class="{ empty: !hasPay }">{{ hasPay ? payText : '문의' }}</span>
          <button class="linkbtn" type="button" @click="openBizChat">문의</button>
        </div>
        <p v-if="store.payNote" class="muted tiny mt4">{{ store.payNote }}</p>
      </div>

      <!-- 영업 정보 -->
      <div class="sec-row">
        <h2 class="sec">영업 정보</h2>
        <button
          v-if="isBiz"
          class="sec-edit"
          type="button"
          @click="goEditSection('biz')"
        >
          편집
        </button>
      </div>
      <div class="card">
        <div class="row"><span class="k">운영시간</span><span class="v">{{ biz.hours || '미등록' }}</span></div>
        <div class="row"><span class="k">휴무</span><span class="v">{{ biz.closed || '미등록' }}</span></div>
      </div>

      <!-- 위치 -->
      <div class="sec-row">
        <h2 class="sec">위치</h2>
        <button
          v-if="isBiz"
          class="sec-edit"
          type="button"
          @click="goEditSection('location')"
        >
          편집
        </button>
      </div>
      <div class="card">
        <div class="row">
          <span class="k">주소</span>
          <span class="v">{{ biz.address || '미등록' }}</span>
        </div>

        <div v-if="hasAddress" class="map-wrap" :aria-label="`지도: ${biz.address}`">
          <iframe
            class="map-iframe"
            :src="mapEmbedUrl"
            allowfullscreen
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>

      <div class="manage">
        <button v-if="isBiz" class="btn-edit" @click="goEdit">정보 전체 수정</button>
        <div v-else class="muted tiny">
          * 이 정보는 <strong>기업회원</strong> 또는 매장 소유자만 수정할 수 있어요.
          <a href="/mypage?upgrade=biz" @click.prevent="toMy">기업회원 전환</a>
        </div>
      </div>
    </section>

    <!-- ===== 담당자/바텀시트(유지) ===== -->
    <teleport to="body">
      <div v-if="mgrOpen" class="mgr-portal" @keydown.esc="mgrOpen=false" tabindex="-1">
        <div class="mgr-backdrop" @click="mgrOpen=false"></div>
        <div class="mgr-pop" :style="mgrMenuStyle">
          <template v-if="managers.length">
            <button
              v-for="(m, i) in managers"
              :key="m.name + i"
              class="mgr-item"
              type="button"
              @click="openManagerSheet(m)"
            >
              <div class="mgr-name">{{ m.name }}</div>
              <div class="mgr-sub">{{ m.phone || '번호 미등록' }}</div>
            </button>
          </template>
          <div v-else class="mgr-empty">등록된 담당자가 없어요.</div>
        </div>
      </div>
    </teleport>

    <div v-if="sheet.open" class="action-mask" @click.self="closeSheet">
      <section class="action-sheet" role="dialog" aria-modal="true">
        <header class="as-header">
          <strong>{{ sheet.title }}</strong>
          <button class="as-close" aria-label="닫기" @click="closeSheet" type="button">✕</button>
        </header>

        <div v-if="sheet.type==='manager'" class="as-body">
          <h4 class="as-title">담당자</h4>

          <div class="kv">
            <span class="k">이름</span>
            <span class="v">{{ currentMgr?.name || '미지정' }}</span>
          </div>

          <div class="kv">
            <span class="k">연락처</span>
            <span class="v v-row">
              <a v-if="currentMgr?.phone" :href="`tel:${normalizeTel(currentMgr.phone)}`">{{ currentMgr.phone }}</a>
              <span v-else>미등록</span>
              <button v-if="currentMgr?.phone" class="linkbtn" type="button" @click="dialPhone">연결</button>
            </span>
          </div>

          <div class="kv" v-if="currentMgr?.talkId">
            <span class="k">연결톡</span>
            <span class="v v-row">
              <span>@{{ currentMgr.talkId }}</span>
              <button class="linkbtn" type="button" @click="openConnectTalk">연결</button>
            </span>
          </div>

          <div class="as-actions">
            <button class="btn" @click="dialPhone" type="button">전화걸기</button>
            <button class="btn" @click="copyPhone" type="button">번호복사</button>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, reactive, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase'
import {
  doc, onSnapshot, getDoc,
  runTransaction, serverTimestamp
} from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { me as user } from '@/store/user.js'

const route = useRoute()
const router = useRouter()

/* ===== Auth ===== */
const auth = getAuth()
const authUid = ref(null)
let stopAuth = null

onMounted(() => {
  authUid.value = auth.currentUser?.uid || null
  stopAuth = onAuthStateChanged(auth, (u) => {
    authUid.value = u?.uid || null
    fetchMyDocs()
  })
})
onUnmounted(() => { if (typeof stopAuth === 'function') stopAuth() })

const uid = computed(() =>
  authUid.value ||
  user?.auth?.uid || user?.auth?.value?.uid || user?.auth?.user?.uid || null
)

/** 로그인 유저 이메일(소문자) – ownerEmail 비교용 */
const userEmail = computed(() =>
  (auth.currentUser?.email ||
   user?.auth?.email ||
   user?.auth?.value?.email ||
   user?.profile?.email ||
   ''
  ).toLowerCase()
)

/* ───── 공통 유틸 ───── */
const clamp0 = (n) => Math.max(0, Number(n || 0))
const toPosInt = (x) => {
  const s = String(x ?? '').match(/\d+/g)?.join('') ?? ''
  const n = Number(s)
  return Math.max(0, Number.isFinite(n) ? n : 0)
}

/* ───── 실시간 매장 구독 ───── */
const emptyStore = {
  id:'', name:'가게', region:'강남', category:'lounge',
  thumb:'', hero:'',
  managers:[], manager:'', phone:'', talkId:'',
  desc:'', hours:'', closed:'', address:'',
  wage:null, pay:null, tc:null, hourly:null, payNote:'',
  events:[], eventMain:'',
  rating: 0, ratingCount: 0, ratingSum: 0,
  likes: 0, // ← 찜 수(표준, 0 기준)
  ownerId: null, // 🔹 소유자 UID (stores 문서 ownerId)
  ownerEmail: '', // 🔹 소유자 이메일(관리자가 넣어둔 값)
}

const store = reactive({ ...emptyStore })

let unsub = null
function sub(id){
  if (unsub) { try{ unsub() }catch{}; unsub=null }
  if (!id) return
  unsub = onSnapshot(doc(db,'stores', String(id)), (snap)=>{
    if (snap.exists()){
      const raw = snap.data() || {}
      // 숫자 필드 안전 정규화 + 과거 호환(wishCount/likes 등)
      const data = {
        ...raw,
        rating:      clamp0(raw.rating),
        ratingSum:   clamp0(raw.ratingSum ?? (Number(raw.rating||0) * Number(raw.ratingCount||0))),
        ratingCount: clamp0(raw.ratingCount),
        // ✅ likes만 쓰되, 과거 wishCount/likes 문자열(- 등)도 흡수해서 0 이상
        likes:       toPosInt(raw.likes ?? raw.wishCount ?? raw.favs ?? 0),
      }
      Object.assign(store, emptyStore, { id: snap.id }, data)
      try{ sessionStorage.setItem('lastStore', JSON.stringify(store)) }catch{}
      fetchMyDocs()
    }
  })
}
onMounted(() => sub(route.params.id))
watch(() => route.params.id, (nv)=> sub(nv))
onUnmounted(() => { if (typeof unsub==='function') unsub() })

/* ───── 표시/계산 값 ───── */
const CAT_MAP = { hopper:'하퍼', point5:'쩜오', ten:'텐카페', tenpro:'텐프로', onep:'1%', nrb:'노래방', kara:'가라오케', bar:'바', lounge:'라운지' }
const catLabel = computed(() => CAT_MAP[store.category] ?? store.category)
/* 목록용 짧은 소개 (16자 intro, 한 줄) */
const listIntro = computed(() => (store.desc || '').trim())

/* 상세페이지용 전체 소개
   - detailDesc/longDesc/fullDesc 필드가 있으면 우선 사용
   - 없으면 기존 desc 를 fallback 으로 사용 */
const fullDesc = computed(() =>
  (store.detailDesc || store.longDesc || store.fullDesc || store.desc || '').trim()
)
const heroStyle = computed(() => {
  const img = store.hero || store.thumb || 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?q=80&w=1600&auto=format&fit=crop'
  return { backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.18),rgba(0,0,0,.38)), url(${img})` }
})

/* ===== 평점 표시(평균만) ===== */
const ratingNum   = computed(() => clamp0(store.rating))
const ratingText  = computed(() => ratingNum.value.toFixed(1))

/* 찜 수(괄호에 표시) */
const likesCount = computed(() => toPosInt(store.likes))

/* 이벤트 존재 여부 */
const hasAnyEvent = computed(() =>
  !!(String(store.eventMain||'').trim() || (Array.isArray(store.events) && store.events.length))
)

/* 시급 표시 */
const rawPay = computed(() => store.wage ?? store.pay ?? store.tc ?? store.hourly ?? '')
const hasPay = computed(() => String(rawPay.value ?? '').trim() !== '')
const payText = computed(() => {
  const v = rawPay.value
  if (!hasPay.value) return '문의'
  const s = String(v).trim()
  if (/\d/.test(s) && !/원/.test(s)) {
    const n = Number(s.replace(/[^\d]/g,''))
    if (Number.isFinite(n)) return `${n.toLocaleString()}원`
  }
  return s
})

/* 담당자 표시 */
const managers = computed(() => {
  const arr = Array.isArray(store.managers) ? store.managers : []
  if (arr.length) return arr
  const legacy = (store.manager || store.phone || store.talkId)
    ? [{ name: store.manager || '담당', phone: store.phone || '', talkId: store.talkId || '' }]
    : []
  return legacy
})
const dispMgr = computed(() => {
  const m = managers.value[0]
  return m ? { name: m.name || '담당', phone: m.phone || '' } : null
})

/* ✅ 메인 현황판에서 넘어온 담당자 인덱스 (?mgr=0,1,2...) */
const managerIndex = computed(() => {
  const v = route.query.mgr
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : null
})

/* ✅ 선택된 담당자 (없으면 null) */
const activeManager = computed(() => {
  const list = managers.value || []
  const idx = managerIndex.value
  if (idx == null || idx >= list.length) return null
  return list[idx]
})

/* ===== 내 별점/찜 로드 ===== */
const myRating = ref(0)
const myWished = ref(false)
const favDocId = computed(() => uid.value && store.id ? `${uid.value}__store__${store.id}` : null)

async function fetchMyDocs(){
  const id = store.id
  if (!id || !uid.value) { myRating.value = 0; myWished.value = false; return }

  try{
    const rDoc = await getDoc(doc(db,'stores', id, 'ratings', uid.value))
    myRating.value = rDoc.exists() ? Number(rDoc.data()?.score || 0) : 0
  }catch{ myRating.value = 0 }

  try{
    if (!favDocId.value) { myWished.value = false; return }
    const fDoc = await getDoc(doc(db,'favorites', favDocId.value))
    myWished.value = fDoc.exists()
  }catch{ myWished.value = false }
}
watch(uid, fetchMyDocs)

/* ===== 별점: 전계정 합산(트랜잭션 집계 유지) ===== */
async function rate(score){
  if (!uid.value){
    return router.push({ path:'/auth', query:{ next: route.fullPath, mode:'login' } })
  }
  const s = Math.max(0, Math.min(5, Number(score||0)))

  const storeRef = doc(db,'stores', store.id)
  const myRef    = doc(db,'stores', store.id, 'ratings', uid.value)

  // 낙관적: 내 별 표시만 즉시 변경
  const prevMy = myRating.value
  myRating.value = s

  try{
    await runTransaction(db, async (tx)=>{
      const [storeSnap, mySnap] = await Promise.all([tx.get(storeRef), tx.get(myRef)])

      const was = mySnap.exists() ? Number(mySnap.data()?.score || 0) : 0
      if (s === was) return

      const d = storeSnap.data() || {}

      // 안전 숫자화
      const baseSum   = clamp0(d.ratingSum == null
        ? (Number(d.rating || 0) * Number(d.ratingCount || 0))
        : Number(d.ratingSum || 0))
      const baseCount = clamp0(d.ratingCount)

      const minus = (was > 0) ? was : 0
      const plus  = (s   > 0) ? s   : 0

      let nextSum   = baseSum - minus + plus
      let nextCount = baseCount - (was > 0 ? 1 : 0) + (s > 0 ? 1 : 0)

      nextSum   = Math.max(0, Number(nextSum || 0))
      nextCount = Math.max(0, Number(nextCount || 0))

      const nextAvg = nextCount > 0 ? +(nextSum / nextCount).toFixed(2) : 0

      // 내 기록
      if (s > 0) {
        tx.set(myRef, { score:s, updatedAt: serverTimestamp() })
      } else if (mySnap.exists()) {
        tx.delete(myRef)
      }

      // ★ rating 관련 필드만 갱신
      tx.update(storeRef, {
        ratingSum: nextSum,
        ratingCount: nextCount,
        rating: nextAvg,
        updatedAt: serverTimestamp()
      })
    })
  }catch(e){
    myRating.value = prevMy
    console.error(e)
  }
}

/* ===== 찜 토글: 전계정 합산 + 0 아래로 절대 안 내려가도록 트랜잭션 ===== */
async function toggleWish(){
  if (!uid.value){
    return router.push({ path:'/auth', query:{ next: route.fullPath, mode:'login' } })
  }
  if (!favDocId.value) return

  const favRef   = doc(db,'favorites', favDocId.value)
  const storeRef = doc(db,'stores', store.id)

  const prev = myWished.value
  // 낙관적 UI: 0 기준으로만 반영
  const currentLikes = likesCount.value
  myWished.value = !prev
  store.likes = Math.max(0, currentLikes + (prev ? -1 : 1))

  try{
    await runTransaction(db, async (tx)=>{
      const storeSnap = await tx.get(storeRef)
      const cur = toPosInt(storeSnap.data()?.likes ?? 0)
      const next = prev ? Math.max(0, cur - 1) : cur + 1

      if (prev){
        tx.delete(favRef)
      }else{
        tx.set(favRef, {
          ownerId: uid.value,
          type: 'store',
          targetId: store.id,
          createdAt: serverTimestamp()
        }, { merge: true })
      }
      tx.update(storeRef, { likes: next, updatedAt: serverTimestamp() })
    })
    // onSnapshot으로 서버값 재동기화
  }catch(e){
    // 롤백
    myWished.value = prev
    store.likes = currentLikes
    console.error(e)
  }
}

/* 바텀시트/드롭다운 (유지) */
const mgrBtn = ref(null)
const mgrOpen = ref(false)
const mgrMenuStyle = ref({ top:'0px', left:'0px', width:'220px' })
const currentMgr = ref(null)
function updateMgrPos(){
  const el = mgrBtn.value
  if(!el) return
  const r = el.getBoundingClientRect()
  mgrMenuStyle.value = { top: `${r.bottom + 6}px`, left: `${r.left}px`, width: `${Math.max(180, r.width)}px` }
}
function openManagerSheet(m){
  currentMgr.value = m || managers.value[0] || null
  mgrOpen.value = false
  showSheet('manager')
}
const sheet = ref({ open:false, type:'', title:'' })
function showSheet(type){ sheet.value = { open:true, type, title: '담당자' } }
function closeSheet(){ sheet.value.open = false }

/* 내비/전화 등 */
function openBizChat(){ router.push({ path:'/chat', query:{ room:`store-${store.id}`, title:store.name } }) }

/* 전화 */
const normalizeTel = (raw) => String(raw).replace(/[^\d+]/g,'')
function dialPhone(){
  const phone = normalizeTel(currentMgr.value?.phone || '')
  if (phone) window.location.href = `tel:${phone}`
}
async function copyPhone(){
  const phone = currentMgr.value?.phone || ''
  if(!phone) return
  try{ await navigator.clipboard.writeText(phone) } catch {}
}

/* ✅ 상단 인라인 담당자 연결 버튼용 */
function dialInlineManager(){
  const m = activeManager.value
  if (!m?.phone) return
  const phone = normalizeTel(m.phone)
  if (phone) window.location.href = `tel:${phone}`
}

/* ───── 하단 연락바(안심문자/안심전화/오픈카톡) ───── */
/* 안심번호: 우선순위
   1) store.safePhone / store.safe / store.phoneSafe
   2) 선택된 담당자(activeManager.phone)
   3) 기본 담당자(dispMgr.phone) */
const safePhone = computed(() => {
  const candidate =
    store.safePhone ||
    store.safe ||
    store.phoneSafe ||
    activeManager.value?.phone ||
    dispMgr.value?.phone ||
    ''
  return normalizeTel(candidate)
})
const hasSafePhone = computed(() => !!safePhone.value)

/* 오픈채팅: 우선순위 (store.openChatUrl → store.kakaoOpenChat → store.kakao) */
const openChatUrl = computed(() =>
  String(store.openChatUrl || store.kakaoOpenChat || store.kakao || '').trim()
)
// 외부 URL 유효 여부만 판단
const hasOpenChat = computed(() => /^https?:\/\//i.test(openChatUrl.value))
// 내부 방으로라도 열 수 있으면 버튼 활성
const canOpenChat = computed(() => hasOpenChat.value || !!store.id)

function sendSafeSMS(){
  if (!hasSafePhone.value) return
  router.push({
    name: 'safeContact',
    params: { mode: 'sms', storeId: store.id },
    query: { phone: safePhone.value, name: store.name }
  })
}
function callSafeNumber(){
  if (!hasSafePhone.value) return
  router.push({
    name: 'safeContact',
    params: { mode: 'call', storeId: store.id },
    query: { phone: safePhone.value, name: store.name }
  })
}
function openKakaoChat(){
  // 1) 외부 카카오 오픈채팅 URL이 있으면 그걸로 이동
  if (hasOpenChat.value) {
    window.open(openChatUrl.value, '_blank')
    return
  }
  // 2) URL이 없으면 내부 오픈채팅 페이지로 라우팅
  if (store.id) {
    router.push({ name: 'chat-open', params: { storeId: store.id } })
  } else {
    alert('잘못된 접근입니다. (업체 ID 없음)')
  }
}

/* 권한 */
/**
 * - 가게찾기용: company + accountKind === 'storeOwner' 만 가게 수정 가능
 * - store.ownerId / ownerEmail 이 현재 로그인 계정과 매칭될 때만 true
 * - 기존 데이터에서 ownerId/ownerEmail 이 비어 있으면 (noOwnerBound) 일단 허용
 */
const authDoc = computed(() => (user?.auth?.value || user?.auth || {}))

const isBiz = computed(() => {
  const u = uid.value

  // 1) 이 매장의 ownerId 가 내 uid 인가?
  const ownedById =
    u &&
    store.ownerId &&
    String(store.ownerId) === String(u)

  // 2) 이 매장의 ownerEmail 이 내 이메일과 같은가?
  const storeEmailRaw =
    store.ownerEmail ||
    store.email ||
    ''
  const ownedByEmail =
    userEmail.value &&
    String(storeEmailRaw || '').toLowerCase() === userEmail.value

  // 3) 내 계정이 "가게찾기용 사장님 계정"인지 (company + storeOwner)
  const auth = authDoc.value || {}
  const type = String(auth.type || '').toLowerCase()
  const kind = String(auth.accountKind || '').toLowerCase()
  const isStoreOwnerAccount =
    type === 'company' && kind === 'storeowner'

  // 4) 아직 ownerId / ownerEmail 이 안 묶인 예전 가게 데이터
  const noOwnerBound =
    !store.ownerId && !store.ownerEmail

  // ▶ 최종: 가게찾기용 사장님 계정이면서,
  //   ① 이 매장이 내 소유이거나(UID/이메일 매칭)
  //   ② 과거 데이터라 아직 소유자 정보가 비어 있는 경우
  return isStoreOwnerAccount && (noOwnerBound || ownedById || ownedByEmail)
})

/* 상세정보 */
const biz = computed(() => ({
  desc: store.desc || '',
  hours: store.hours || '',
  closed: store.closed || '',
  address: store.address || ''
}))

/* 지도 */
const hasAddress = computed(() => String(biz.value.address).trim().length > 0)
const mapEmbedUrl = computed(() => {
  if (!hasAddress.value) return ''
  const q = encodeURIComponent(biz.value.address.trim())
  return `https://www.google.com/maps?q=${q}&output=embed`
})

/* 수정/마이 */
/** 전체 수정 버튼 */
const goEdit = () => goEditSection('all')
/** 섹션별 수정: StoreEdit 로 이동하면서 ?section= 값 전달 */
function goEditSection(section){
  if (!store.id) return
  const query = section ? { section } : {}
  router.push({ name:'storeEdit', params:{ id: store.id }, query })
}

const toMy = () => router.push('/mypage')

/* 쿼리로 담당자 자동 오픈(유지) */
const autoOpenedOnce = ref(false)
function tryOpenMgrFromQuery(){
  if (autoOpenedOnce.value) return
  const q = route.query || {}
  const want = q.sheet === 'manager' || q.open === 'manager'
  if (!want) return
  const list = managers.value
  if (!list.length) return
  let idx = Number(q.mi ?? q.mid ?? 0)
  if (!Number.isFinite(idx)) idx = 0
  idx = Math.max(0, Math.min(idx, list.length - 1))
  currentMgr.value = list[idx] || list[0] || null
  showSheet('manager')
  autoOpenedOnce.value = true
}
watch(managers, () => tryOpenMgrFromQuery(), { immediate:true })
watch(() => route.query, () => tryOpenMgrFromQuery(), { deep:true })
</script>

<style scoped>
.detail{
  /* 🔻 상단 고정 TopBar(강남톡방 로고) 높이만큼 아래로 내리기 */
  padding-top: calc(var(--appbar-height, 56px) + env(safe-area-inset-top));

  /* 🔻 하단 탭바(92px) + 안전영역만큼 여유 */
  padding-bottom: calc(92px + env(safe-area-inset-bottom));

  color:var(--fg);
}

.container{ padding: 10px 14px }
.muted{ color:var(--muted) }
.tiny{ font-size:12px }
.mt4{ margin-top:4px }
.ellip{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap }

/* ===== 상단 분할 ===== */
.top .split{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:10px;
  align-items:stretch;
}

/* 사진 카드 */
.hero-card{
  position:relative;
  width:100%;
  aspect-ratio:1/1;
  border-radius:12px;
  background-size:cover;
  background-position:center;
  box-shadow:0 4px 12px var(--shadow);
  border:1px solid var(--line);
  overflow:hidden;
}

/* 오른쪽 정보 패널 */
.right-card{
  height:100%;
  border:1px solid var(--line);
  border-radius:12px;
  background:var(--surface);
  box-shadow:0 4px 12px var(--shadow);
  padding:12px;
  display:flex;
  flex-direction:column;
  justify-content:flex-start;
  gap:6px;
}
.right-top{ min-height:0 }
.right-name{ margin:0 0 2px; font-size:18px; font-weight:900; line-height:1.15 }
.right-meta{ margin:0; font-size:12.5px; color:var(--muted) }
.right-meta .dot{ margin:0 4px }

/* 목록용 짧은 소개 한 줄 */
.right-intro{
  margin:3px 0 0;
  font-size:13px;
  font-weight:800;
}

/* 평점/별점/찜 */
.rate-row{
  margin-top:4px;
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}
.rate-line{ margin:0; font-size:13px }
.stars{ display:flex; align-items:center; gap:4px }
.star-btn{
  width:30px; height:30px; border-radius:8px; border:1px solid var(--line);
  background: var(--surface); display:grid; place-items:center;
  padding:0; box-shadow:0 2px 6px var(--shadow);
  color: var(--muted); cursor:pointer;
}
.star-btn.on{ color: #ffd84d; }
.star-btn svg{ width:18px; height:18px; fill: currentColor; display:block }
.star-clear{
  margin-left:6px; border:1px dashed var(--line); background:transparent; color:var(--muted);
  border-radius:8px; padding:4px 8px; font-size:12px; cursor:pointer;
}

/* 하트 */
.wish-btn{
  margin-left:auto;
  display:flex; align-items:center; justify-content:center;
  width:36px; height:36px;
  border:1px solid var(--line); border-radius:999px;
  background:var(--surface); box-shadow:0 2px 6px var(--shadow);
  color: var(--accent); cursor:pointer;
}
.wish-btn svg{ width:20px; height:20px; display:block }
.wish-btn path{ transition: fill .15s ease, stroke .15s ease }
.wish-btn:not(.on) path{
  fill: none;
  stroke: currentColor;
  stroke-width: 2px;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.wish-btn.on path{
  fill: currentColor;
  stroke: none;
}

/* ===== 섹션 헤더 + 편집 버튼 ===== */
.sec-row{
  margin:12px 0 6px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
}
.sec{
  margin:0;
  font-size:14px;
  font-weight:900;
}
.sec-edit{
  padding:4px 8px;
  border-radius:999px;
  border:0;
  font-size:12px;
  font-weight:800;
  color:var(--accent);
  background:color-mix(in oklab, var(--accent), white 92%);
  cursor:pointer;
}
.sec-edit:hover{
  background:color-mix(in oklab, var(--accent), white 88%);
}

.para{ line-height:1.45; font-size:13px }

.card{
  border:1px solid var(--line); border-radius:10px; padding:8px 10px;
  background:var(--surface); box-shadow:0 4px 10px var(--shadow);
}
.row{ display:flex; align-items:center; justify-content:space-between; padding:6px 0; gap:10px; font-size:12.5px }
.row + .row{ border-top:1px dashed var(--line) }
.k{ color:var(--muted) }
.v{ font-weight:700 }

/* 이벤트 */
.ev-main{ font-weight:900; margin:2px 0 4px }
.ev-list{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:4px }

/* 시급 카드 */
.pay-card{ margin-bottom:6px }
.pay-line{ display:flex; align-items:center; gap:10px; font-size:13px }
.pay-amt{ font-weight:900; color:var(--accent); margin-left:auto }
.pay-amt.empty{ color:var(--muted); font-weight:700 }

/* 지도 임베드 */
.map-wrap{
  margin-top:8px;
  border:1px solid var(--line);
  border-radius:10px;
  overflow:hidden;
  box-shadow:0 2px 8px var(--shadow);
}
.map-iframe{
  width:100%;
  height:220px;
  border:0;
  display:block;
}
@media(min-width: 480px){
  .map-iframe{ height:260px; }
}
@media(min-width: 960px){
  .map-iframe{ height:320px; }
}

/* 관리 */
.manage{ margin:12px 0 2px; display:flex; align-items:center; justify-content:space-between }
.btn-edit{
  border:1px solid var(--accent); color:#fff; background:var(--accent);
  padding:9px 12px; border-radius:10px; font-weight:900; font-size:12.5px;
}

/* 담당자 드롭다운(유지) */
.mgr-portal{ position:fixed; inset:0; z-index:10000; outline:none; }
.mgr-backdrop{ position:absolute; inset:0; background:transparent; }
.mgr-pop{
  position:absolute; min-width:180px;
  background:var(--surface); border:1px solid var(--line); border-radius:12px;
  box-shadow:0 12px 28px var(--shadow); padding:6px;
}
.mgr-item{
  display:block; width:100%; text-align:left; border:0; background:transparent; color:var(--fg);
  padding:9px 10px; border-radius:10px; font-size:13px; cursor:pointer;
}
.mgr-item:hover{ background: color-mix(in oklab, var(--accent), white 90%) }
.mgr-name{ font-weight:900 }
.mgr-sub{ font-size:12px; color:var(--muted) }
.mgr-empty{ padding:10px; color:var(--muted) }

/* 바텀시트(담당자만) */
.action-mask{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:grid; place-items:end center; z-index:9999; }
.action-sheet{
  width:100%; max-width:680px; background:var(--surface); color:var(--fg);
  border-top-left-radius:16px; border-top-right-radius:16px;
  box-shadow:0 -10px 30px rgba(0,0,0,.25); padding:12px 14px 14px;
  animation:slideUp .16s ease-out;
}
@keyframes slideUp{ from{ transform:translateY(16px); opacity:.7 } to{ transform:none; opacity:1 } }
.as-header{ display:flex; justify-content:space-between; align-items:center; padding:4px 2px 8px; border-bottom:1px solid var(--line) }
.as-close{ width:30px; height:30px; border-radius:999px; border:1px solid var(--line); background:var(--surface) }
.as-body{ padding:10px 2px 2px }
.kv{ display:flex; justify-content:space-between; gap:10px; padding:7px 0; border-bottom:1px dashed var(--line); font-size:13px }
.kv .k{ color:var(--muted) }
.kv .v{ font-weight:700 }
.v-row{ display:flex; align-items:center; gap:8px; }
.linkbtn{
  border:1px solid var(--accent);
  background: color-mix(in oklab, var(--accent), white 88%);
  color:var(--fg); border-radius:10px; padding:4px 10px; font-weight:800; font-size:12px; cursor:pointer;
}
.as-actions{ display:flex; gap:8px; flex-wrap:wrap; padding:6px 0 2px }
.btn{ flex:1; min-width:120px; height:40px; border-radius:12px; border:1px solid var(--line); background:var(--surface); font-weight:800; font-size:13px; cursor:pointer }

/* 초소형 화면 보완 */
@media (max-width: 360px){
  .right-name{ font-size:17px }
}

/* ───── 소개 위 연락 버튼(중립 톤) ───── */
.contact-bar{
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 6px 0 10px;
}
.cbtn{
  height: 42px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--fg);
  font-weight: 900;
  font-size: 13.5px;
  cursor: pointer;
}
.cbtn:disabled{
  opacity: .45;
  cursor: not-allowed;
}
/* ===== 상단 담당자 인라인 배지 ===== */
.mgr-inline-bar{
  margin-top:4px;
  display:flex;
  align-items:center;
  gap:8px;
  font-size:12px;
}

.mgr-inline-name{
  font-weight:800;
}

.mgr-inline-phone{
  border:0;
  background:transparent;
  font-size:12px;
  font-weight:800;
  color:var(--accent);
  cursor:pointer;
  padding:0;
}
/* ===== 상단 담당자 인라인 배지 ===== */
.mgr-inline-bar{
  margin-top:6px;
  display:flex;
  flex-direction:column;   /* ← 세로로 두 줄 */
  align-items:flex-start;
  gap:2px;
  font-size:12px;
}

.mgr-inline-row{
  display:flex;
  align-items:center;
  gap:6px;
}

.mgr-inline-name{
  font-weight:800;
}

.mgr-inline-phone-num{
  font-weight:800;
  color:var(--accent);
}

/* "연결" 버튼을 진짜 버튼처럼 보이게 */
.mgr-inline-phone-btn{
  border:1px solid var(--accent);
  background: color-mix(in oklab, var(--accent), white 88%);
  color:#111;
  font-size:12px;
  font-weight:800;
  padding:3px 10px;
  border-radius:999px;
  cursor:pointer;
}
.mgr-inline-phone-btn:active{
  transform:translateY(1px);
}

</style>
