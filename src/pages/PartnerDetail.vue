<!-- src/pages/PartnerDetail.vue -->
<template>
  <main class="detail" v-if="!loading">
    <!-- 상단 히어로: 원본 이미지 크기 그대로(가로 100%) -->
    <section class="hero">
      <img class="hero-img" :src="hero" :alt="item.name || '업체 이미지'" />
    </section>

    <!-- ✅ 이미지 바로 ‘아래’ 한 줄 바 -->
    <section class="hero-bar">
      <div class="hero-left">
        <h1 class="hero-title ellip">{{ item.name || '업체명' }}</h1>
        <p class="hero-meta ellip">{{ item.region || '지역' }} · {{ mapCat[item.category] || '기타' }}</p>
      </div>

      <div class="hero-actions">
        <!-- ⭐ 숫자 라벨: 평균 + (찜 수) -->
        <div class="scoreline">
          ⭐️ <b>{{ ratingText }}</b>
          <span class="muted">({{ likesCount }})</span>
        </div>

        <!-- 별점 주기 -->
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
            @click="ratePartner(n)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
          </button>
        </div>

        <!-- 오른쪽 아이콘 세트: 하트 위, 공유 아래 -->
        <div class="rhs">
          <button
            class="wish-btn"
            :class="{ on: myWished }"
            type="button"
            @click="toggleWish"
            :aria-pressed="myWished ? 'true' : 'false'"
            :title="myWished ? '찜 해제' : '찜하기'"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21c-.28 0-.55-.09-.78-.26-2.08-1.55-7.68-5.92-9.06-9.17C1.3 9.33 1.8 6.99 3.37 5.47 4.94 3.95 7.3 3.72 9 4.8c.9.57 1.67 1.43 2.2 2.4.53-.97 1.3-1.83 2.2-2.4 1.7-1.08 4.06-.85 5.63.67 1.57 1.52 2.07 3.86 1.21 6.1-1.37 3.25-6.98 7.62-9.06 9.17-.23.17-.5.26-.78.26Z"/>
            </svg>
          </button>

          <button class="share-btn" type="button" @click="doShare" aria-label="공유하기" title="공유하기">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3zM5 5h5V3H5c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-5h-2v5H5V5z"/>
            </svg>
          </button>
        </div>
      </div>
    </section>

    <!-- 본문 -->
    <section class="content">
      <h3>적립 혜택</h3>
      <ul class="bul" v-if="item.benefits">
        <li>{{ item.benefits }}</li>
      </ul>
      <ul class="bul" v-else>
        <li>예약/상담 시 최대 2% 페이백 포인트 적립</li>
        <li>후기 작성 시 추가 포인트 지급</li>
      </ul>

      <div class="info-box" v-if="item.desc">
        <strong>업체 소개</strong>
        <p class="muted" style="white-space:pre-line">{{ item.desc }}</p>
      </div>

      <div class="info-box">
        <strong>대표 서비스</strong>
        <div class="chips">
          <span v-for="t in (item.tags||[])" :key="t" class="chip">{{ t }}</span>
          <span v-if="!(item.tags && item.tags.length)" class="muted">등록된 서비스가 없어요</span>
        </div>
      </div>

      <div class="info-box">
        <strong>매장 안내</strong>
        <p class="muted">
          {{ item.hours || '운영시간 10:00~21:00' }}<template v-if="item.holiday"> · 휴일 {{ item.holiday }}</template>
        </p>
      </div>

      <!-- 위치 섹션 -->
      <div class="info-box">
        <strong>위치</strong>
        <p class="muted">주소: {{ hasAddress ? item.address : '미등록' }}</p>
        <div v-if="hasAddress" class="map-wrap" :aria-label="`지도: ${item.address}`">
          <iframe
            class="map-iframe"
            :src="mapEmbedUrl"
            allowfullscreen
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>
    </section>

    <!-- 하단 고정 CTA -->
    <footer class="cta">
      <button class="ghost" @click="openInfo">업체정보</button>
      <button class="primary" @click="consult">{{ item.link ? '상담/예약하기' : '채팅 상담' }}</button>
    </footer>
  </main>

  <!-- 로딩 -->
  <section v-else class="loading">
    불러오는 중…
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase'
import {
  doc, getDoc, setDoc, deleteDoc, getDoc as readDoc,
  updateDoc, runTransaction, serverTimestamp, increment
} from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

const route = useRoute()
const router = useRouter()

/* ---------- 상태 ---------- */
const loading = ref(true)
const item = ref({
  id: '', name: '', region: '', category: 'etc',
  tags: [], thumb: '', image: '', link: '',
  address: '', hours: '', holiday: '', benefits: '', desc: '',
  rating: 0, ratingSum: 0, ratingCount: 0, likes: 0
})

/* 숫자 유틸(0 기준, 음수/문자 방지) */
const clamp0 = (n) => Math.max(0, Number(n || 0))
const toPosInt = (x) => {
  const s = String(x ?? '').match(/\d+/g)?.join('') ?? ''
  const n = Number(s)
  return Math.max(0, Number.isFinite(n) ? n : 0)
}

/* 로그인 상태 */
const auth = getAuth()
const authUid = ref(null)
let stopAuth = null
onMounted(() => {
  authUid.value = auth.currentUser?.uid || null
  stopAuth = onAuthStateChanged(auth, (u)=> {
    authUid.value = u?.uid || null
    fetchMyDocs()
  })
})
watch(() => route.params.id, fetchMyDocs)
watch(() => item.value.id, fetchMyDocs)

/* ───── 내 문서(찜/별점) 로드 ───── */
const myWished = ref(false)
const myRating = ref(0)
const favDocId = computed(() =>
  (authUid.value && item.value.id) ? `${authUid.value}__partner__${item.value.id}` : null
)
async function ensureWishState(){
  if (!favDocId.value){ myWished.value = false; return }
  try{
    const snap = await readDoc(doc(fbDb,'favorites', favDocId.value))
    myWished.value = snap.exists()
  }catch{ myWished.value = false }
}
async function ensureMyRating(){
  const uid = authUid.value
  const id  = item.value.id
  if (!uid || !id){ myRating.value = 0; return }
  try{
    const r = await readDoc(doc(fbDb,'partners', String(id), 'ratings', String(uid)))
    myRating.value = r.exists() ? Number(r.data()?.score || 0) : 0
  }catch{ myRating.value = 0 }
}
async function fetchMyDocs(){ await Promise.all([ensureWishState(), ensureMyRating()]) }

/* ───── 표시용 숫자 ───── */
const ratingText = computed(() => clamp0(item.value?.rating).toFixed(1))
const likesCount = computed(() => toPosInt(item.value?.likes))

/* 찜 토글: favorites 생성/삭제 + partners.likes 증감(0 기준) */
async function toggleWish(){
  if (!authUid.value){
    router.push({ path:'/auth', query:{ next: route.fullPath, mode:'login' } })
    return
  }
  if (!favDocId.value) return

  const was = myWished.value
  myWished.value = !was

  // 낙관적 업데이트
  const oldLikes = toPosInt(item.value.likes)
  item.value.likes = Math.max(0, oldLikes + (was ? -1 : 1))

  try{
    if (was){
      await deleteDoc(doc(fbDb,'favorites', favDocId.value))
      await updateDoc(doc(fbDb,'partners', String(item.value.id)), {
        likes: increment(-1), updatedAt: serverTimestamp()
      })
    }else{
      await setDoc(doc(fbDb,'favorites', favDocId.value), {
        ownerId : authUid.value,
        type    : 'partner',
        targetId: item.value.id,
        createdAt: serverTimestamp()
      }, { merge:true })
      await updateDoc(doc(fbDb,'partners', String(item.value.id)), {
        likes: increment(1), updatedAt: serverTimestamp()
      })
    }
    // 목록(PartnersPage) 즉시 반영
    window.dispatchEvent(new CustomEvent('favorite-changed', {
      detail:{ type:'partner', id:item.value.id, wished: !was }
    }))
  }catch(e){
    console.error(e)
    // 롤백
    myWished.value   = was
    item.value.likes = oldLikes
  }
}

/* 별점: 서버 집계(ratingSum/ratingCount/rating) 갱신 */
async function ratePartner(score){
  if (!authUid.value){
    router.push({ path:'/auth', query:{ next: route.fullPath, mode:'login' } })
    return
  }
  const s = Math.max(0, Math.min(5, Number(score||0)))
  const partnerRef = doc(fbDb, 'partners', String(item.value.id))
  const myRef      = doc(fbDb, 'partners', String(item.value.id), 'ratings', String(authUid.value))

  const prevMy = myRating.value
  myRating.value = s

  try{
    await runTransaction(fbDb, async (tx)=>{
      const [pSnap, rSnap] = await Promise.all([tx.get(partnerRef), tx.get(myRef)])
      const base = pSnap.exists() ? (pSnap.data() || {}) : {}

      const was  = rSnap.exists() ? Number(rSnap.data()?.score || 0) : 0
      if (was === s) return

      const baseSum   = clamp0(base.ratingSum == null
        ? (Number(base.rating||0) * Number(base.ratingCount||0))
        : Number(base.ratingSum||0))
      const baseCount = clamp0(base.ratingCount)

      const minus = (was > 0) ? was : 0
      const plus  = (s   > 0) ? s   : 0

      let nextSum   = baseSum - minus + plus
      let nextCount = baseCount - (was > 0 ? 1 : 0) + (s > 0 ? 1 : 0)

      nextSum   = Math.max(0, Number(nextSum || 0))
      nextCount = Math.max(0, Number(nextCount || 0))
      const nextAvg = nextCount > 0 ? +(nextSum / nextCount).toFixed(2) : 0

      if (s > 0) tx.set(myRef, { score:s, updatedAt: serverTimestamp() })
      else if (rSnap.exists()) tx.delete(myRef)

      tx.update(partnerRef, {
        ratingSum: nextSum,
        ratingCount: nextCount,
        rating: nextAvg,
        updatedAt: serverTimestamp()
      })
    })

    // 목록에 실시간 반영
    window.dispatchEvent(new CustomEvent('partner-rating', {
      detail:{ id: item.value.id, rating: Number(item.value.rating) }
    }))
  }catch(e){
    console.error(e)
    myRating.value = prevMy
  }
}

/* ---------- 카테고리 라벨 ---------- */
const mapCat = {
  salon:'미용실', nail:'네일', ps:'성형외과', real:'부동산',
  rental:'렌탈샵', fit:'피트니스', cafe:'카페', etc:'기타'
}

/* 히어로 이미지 선택(없으면 placeholder) */
const hero = computed(()=> item.value.image || item.value.thumb || 'https://placehold.co/1200x800?text=GangTalk')

/* ---------- 카테고리 정규화 ---------- */
function normCat(raw = '') {
  const v = String(raw).trim().toLowerCase()
  if (!v) return 'etc'
  const hit = (arr)=> arr.some(w=>v.includes(w))
  if (['salon','hair'].includes(v) || hit(['미용','헤어','살롱'])) return 'salon'
  if (['nail'].includes(v) || hit(['네일'])) return 'nail'
  if (['ps','plastic'].includes(v) || hit(['성형'])) return 'ps'
  if (['real','estate'].includes(v) || hit(['부동산'])) return 'real'
  if (['rental'].includes(v) || hit(['렌탈'])) return 'rental'
  if (['fit','fitness','pt','gym'].includes(v) || hit(['피트니스','헬스','pt'])) return 'fit'
  if (['cafe','coffee'].includes(v) || hit(['카페','커피'])) return 'cafe'
  return 'etc'
}

/* ---------- 데이터 로드 ---------- */
async function load() {
  loading.value = true
  const id = String(route.params.id || '')
  try {
    let data = null

    // 1) /partners/{id}
    if (id) {
      const snap = await getDoc(doc(fbDb, 'partners', id))
      if (snap.exists()) data = { id: snap.id, ...snap.data() }
    }

    // 2) fallback: config/marketing.partnerCards 에서 id 매칭
    if (!data) {
      const mk = await getDoc(doc(fbDb, 'config', 'marketing'))
      if (mk.exists()) {
        const arr = Array.isArray(mk.data().partnerCards) ? mk.data().partnerCards : []
        data = arr.find(p => p.id === id) || null
      }
    }

    if (!data) {
      alert('해당 제휴업체를 찾을 수 없습니다.')
      safeBack()
      return
    }

    item.value = {
      id: data.id || id,
      name: data.name || '업체명',
      region: data.region || '',
      category: normCat(data.category || data.categoryRaw || 'etc'),
      tags: Array.isArray(data.tags) ? data.tags : [],
      thumb: data.thumb || data.image || '',
      image: data.image || data.thumb || '',
      link: data.link || '',
      address: data.address || '',
      hours: data.hours || '',
      holiday: data.holiday || '',
      benefits: data.benefits || '',
      desc: data.desc || '',
      // ✅ 집계 필드(없으면 0)
      rating: clamp0(data.rating),
      ratingSum: clamp0(data.ratingSum),
      ratingCount: clamp0(data.ratingCount),
      likes: toPosInt(data.likes ?? data.favs ?? data.hearts ?? 0),
    }
  } catch (e) {
    console.warn('partner detail load error:', e)
    alert('데이터를 불러오는 중 오류가 발생했습니다.')
  } finally {
    loading.value = false
    fetchMyDocs()
  }
}
onMounted(load)
watch(() => route.params.id, load)

/* ---------- 위치(지도) ---------- */
const hasAddress = computed(() => String(item.value.address || '').trim().length > 0)
const mapEmbedUrl = computed(() => {
  if (!hasAddress.value) return ''
  const q = encodeURIComponent(String(item.value.address).trim())
  return `https://www.google.com/maps?q=${q}&output=embed`
})

/* ---------- 액션들 ---------- */
function safeBack() {
  if (window.history.length > 1) router.back()
  else router.push({ name: 'partners' })
}
async function doShare() {
  const url = window.location.href
  const data = {
    title: item.value.name,
    text: `${item.value.region || ''} · ${mapCat[item.value.category] || '제휴업체'}`,
    url
  }
  try {
    if (navigator.share) await navigator.share(data)
    else {
      await navigator.clipboard?.writeText(url)
      alert('페이지 링크가 복사되었습니다.')
    }
  } catch {}
}
function consult() {
  const url = String(item.value.link || '').trim()
  if (url) window.open(url, '_blank', 'noopener')
  else router.push('/chat')
}
function openInfo() {
  alert('업체 세부정보 페이지를 준비 중입니다.')
}
</script>

<style scoped>
.detail{ padding-bottom:96px }
.loading{ padding:32px; text-align:center; color:var(--muted) }

/* ───────── Hero ───────── */
.hero{
  position:relative;
  background:transparent;
  margin:0;
  line-height:0;
}
.hero-img{
  display:block;
  width:100%;
  height:auto;
  object-fit:unset;
  background:transparent;
  margin:0;
}

/* ✅ 이미지 바로 아래 바 */
.hero-bar{
  display:flex; align-items:center; justify-content:space-between;
  gap:10px; padding:6px 12px 8px; margin-top:0;
}
.hero-left{ flex:1 1 auto; min-width:0; }
.hero-title{
  margin:0 0 2px;
  font-size:18px; font-weight:900; line-height:1.15;
}
.hero-meta{
  margin:0; font-size:13px; color:var(--muted);
}

/* 오른쪽 액션 */
.hero-actions{
  display:flex; align-items:center; gap:10px;
  flex:0 0 auto;
}
.scoreline{ font-size:13px; font-weight:900; color:var(--fg); }
.scoreline .muted{ color:var(--muted); font-weight:700; }

.stars{ display:flex; align-items:center; gap:4px; }
.star-btn{
  width:28px; height:28px; border-radius:8px; border:1px solid var(--line);
  background: var(--surface); display:grid; place-items:center;
  padding:0; color: var(--muted); cursor:pointer;
}
.star-btn.on{ color:#ffd84d; }
.star-btn svg{ width:16px; height:16px; fill: currentColor; display:block }

/* 하트 + 공유를 세로 정렬 */
.rhs{ display:flex; flex-direction:column; gap:6px; align-items:center; }

/* 공통 아이콘 버튼 스타일 */
.wish-btn,
.share-btn{
  display:flex; align-items:center; justify-content:center;
  width:34px; height:34px; border-radius:999px;
  border:1px solid var(--line); background:var(--surface);
  cursor:pointer;
}
.wish-btn{ color:#ff6a6a; }
.wish-btn svg{ width:20px; height:20px; display:block }
.wish-btn path{ transition: fill .15s ease, stroke .15s ease }
.wish-btn:not(.on) path{ fill:none; stroke:currentColor; stroke-width:2px; stroke-linecap:round; stroke-linejoin:round; }
.wish-btn.on path{ fill:currentColor; stroke:none; }

.share-btn{ color:var(--fg); }
.share-btn svg{ width:18px; height:18px; fill:currentColor; display:block }

/* ───────── Content ───────── */
.content{ padding:14px }
.title-block{ margin:10px 2px 6px }
.title{ margin:0 0 2px; font-size:20px; font-weight:900 }
.meta{ margin:0; }

/* 공통 */
.bul{ padding-left:18px }
.info-box{ border:1px solid var(--line); border-radius:12px; padding:12px; margin:10px 0 }
.chips{ display:flex; gap:6px; flex-wrap:wrap; margin-top:6px }
.chip{ border:1px solid var(--line); border-radius:999px; padding:6px 10px }

/* 지도 프레임 */
.map-wrap{
  margin-top:8px; border:1px solid var(--line); border-radius:10px; overflow:hidden; box-shadow:0 2px 8px var(--shadow);
}
.map-iframe{ width:100%; height:220px; border:0; display:block }

/* 하단 CTA */
.cta{
  position:fixed; left:0; right:0; bottom:0; border-top:1px solid var(--line);
  background:var(--surface); display:flex; gap:8px; padding:10px 12px;
}
.cta button{ flex:1; height:48px; border-radius:12px; font-weight:900; border:1px solid var(--line) }
.primary{ background:var(--accent); color:#fff; border-color:var(--accent) }
.ghost{ background:transparent }
</style>
