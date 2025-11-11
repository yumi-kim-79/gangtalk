<template>
  <main class="page">
    <!-- ===== 헤더 ===== -->
    <header class="topbar">
      <h1 class="ttl">찜한 목록</h1>

      <div class="rt">
        <nav class="tabs">
          <button class="tab" :class="{ on: filter==='all' }" @click="filter='all'">전체</button>
          <button class="tab" :class="{ on: filter==='store' }" @click="filter='store'">업체</button>
          <button class="tab" :class="{ on: filter==='partner' }" @click="filter='partner'">제휴업체</button>
        </nav>

        <div class="search">
          <input
            v-model.trim="q"
            class="search-in"
            type="search"
            inputmode="search"
            placeholder="검색어를 입력해요"
          />
        </div>
      </div>
    </header>

    <!-- ===== 상태 ===== -->
    <section v-if="loading" class="empty">불러오는 중…</section>
    <section v-else-if="err" class="empty">
      <p>목록을 불러오지 못했어요.<br />{{ err }}</p>
      <button class="btn" @click="reload">다시 시도</button>
    </section>

    <!-- ===== 결과 ===== -->
    <section v-else class="stack">
      <div v-if="viewList.length===0" class="empty">
        <p>아직 찜한 항목이 없어요.</p>
        <p class="sm muted">가게/제휴관 카드의 하트를 눌러 추가해 보세요.</p>
        <div class="row">
          <button class="btn" @click="goFind">가게 찾기</button>
          <button class="btn" @click="goPartners">제휴관 보기</button>
        </div>
      </div>

      <article
        v-for="it in viewList"
        :key="it.favId + '_' + it.src"
        class="pro-card"
      >
        <!-- 좌측 썸네일 -->
        <div
          class="pro-thumb"
          :style="{ backgroundImage: 'url(' + (it.thumb || fallbackThumb(it.category || 'default')) + ')' }"
        />

        <!-- 본문 -->
        <div class="pro-meta">
          <div class="pro-head">
            <div class="pro-name ellip">
              {{ it.name || it.title || '(제목 없음)' }}
            </div>
            <span class="chip kind" :class="it.type">{{ it.type==='store' ? '업체' : '제휴' }}</span>
          </div>

          <div class="pro-sub ellip">
            <template v-if="it.type==='store'">
              {{ it.region || '-' }} · {{ mapCat[it.category] || it.category || '기타' }}
              <template v-if="it.manager"> · 담당: {{ it.manager }}</template>
            </template>
            <template v-else>
              {{ it.region || '-' }} · {{ partnerCatLabel(it.category) }}
            </template>
          </div>

          <!-- 소개 한 줄 -->
          <p v-if="it.desc" class="pro-desc one-line">{{ it.desc }}</p>

          <!-- 이벤트(있으면) -->
          <div v-if="it.eventMain" class="event-line">
            <span class="badge ev">이벤트</span>
            <span class="ev-txt ellip">{{ it.eventMain }}</span>
          </div>

          <!-- 통계 칩 -->
          <div class="pro-chips" v-if="it.type==='store'">
            <span class="chip strong"><b>{{ it.match || 0 }}</b> 맞출방</span>
            <span class="chip strong"><b>{{ it.persons || 0 }}</b> 맞출인원</span>
          </div>

          <!-- 기간/시간 -->
          <div class="pro-period" v-if="it.adStart || it.adEnd">
            <span>광고기간</span>
            <strong>{{ formatPeriod(it.adStart, it.adEnd) }}</strong>
          </div>

          <!-- 액션 -->
          <div class="pro-actions">
            <button class="btn" @click="open(it)">열기</button>
            <button class="btn danger" @click="unfav(it)" :disabled="doing===it.favId">
              {{ doing===it.favId ? '해제 중…' : '찜 해제' }}
            </button>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { fbAuth, fbDb } from '@/firebase.js'
import {
  collection, query, where, getDoc, doc, deleteDoc, onSnapshot, getDocs
} from 'firebase/firestore'

/** 카테고리 라벨(업체) */
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

/** 제휴 라벨 */
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

/** 기본 썸네일 */
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

const router = useRouter()
const loading = ref(true)
const err = ref('')
const q = ref('')
const filter = ref('all') // all | store | partner
const doing = ref('')

/**
 * rawFavs 항목 구조
 * {
 *   src: 'root' | 'user',      // 어디에서 읽었는지
 *   favId: string,             // 문서 id (root) 또는 storeId/partnerId (user)
 *   type: 'store' | 'partner',
 *   targetId: string,          // 참조 대상 id
 *   createdAt: any,
 *   ...표시용 병합 필드들
 * }
 */
const rawFavs = ref([])
let unsub = null

onMounted(async ()=>{
  const u = fbAuth.currentUser
  if (!u) { router.replace({ path:'/auth', query:{ next:'/favorites', mode:'login' } }); return }

  // 1) 우선 루트 /favorites 구독
  try {
    const qFav = query(collection(fbDb,'favorites'), where('ownerId','==', u.uid))
    unsub = onSnapshot(qFav,
      async (snap)=>{ await buildFromRoot(u.uid, snap) },
      async (e)=>{
        console.warn('root favorites denied → fallback to user subcollection', e)
        // 2) 권한 거절 시, 유저 서브컬렉션으로 폴백
        await subscribeUserSub(u.uid)
      }
    )
  } catch (e) {
    console.warn('root favorites error → fallback', e)
    await subscribeUserSub(u.uid)
  }
})

onUnmounted(()=>{ if (typeof unsub==='function') try{ unsub() }catch{} })

/* ---------- 루트 favorites 빌드 ---------- */
async function buildFromRoot(uid, snap){
  loading.value = true
  const base = []
  snap.forEach(d => {
    const r = d.data() || {}
    base.push({
      src:'root',
      favId:d.id,
      type:String(r.type||'store'),
      targetId:String(r.targetId||''),
      createdAt:r.createdAt||null
    })
  })
  rawFavs.value = await hydrateRefs(base)
  loading.value = false
}

/* ---------- 유저 서브컬렉션 폴백 ---------- */
async function subscribeUserSub(uid){
  if (unsub) { try{ unsub() }catch{}; unsub = null }
  const col = collection(fbDb,'users', uid, 'favorites')
  unsub = onSnapshot(col, async (snap)=>{
    loading.value = true
    const base = []
    snap.forEach(d=>{
      const r = d.data() || {}
      base.push({
        src:'user',
        favId:d.id,                         // = storeId(규칙상)
        type:'store',                       // 서브컬렉션은 구 스키마라 store만
        targetId:String(r.storeId || d.id),
        createdAt:r.createdAt || null,
        // 표시용 후보 값(병합 시 덮어씀)
        name: r.name || '',
        region: r.region || '',
        category: String(r.category||'default').toLowerCase(),
        thumb: r.thumb || ''
      })
    })
    rawFavs.value = await hydrateRefs(base)
    loading.value = false
  }, (e)=>{
    err.value = e?.message || '오류가 발생했습니다.'
    loading.value = false
  })
}

/* ---------- 참조 문서 병합 ---------- */
async function hydrateRefs(list){
  const out = []
  for (const f of list){
    try{
      if (f.type === 'store'){
        const s = await getDoc(doc(fbDb,'stores', f.targetId))
        if (s.exists()){
          const d = s.data() || {}
          out.push({
            ...f,
            id: s.id,
            name: d.name || d.title || '',
            title: d.title || '',
            region: d.region || '',
            category: String(d.category || 'default').toLowerCase(),
            desc: (d.desc || '').slice(0, 60),
            eventMain: (Array.isArray(d.events) && d.events[0]) ? String(d.events[0]) : (d.eventMain || ''),
            match: Number(d.match || 0),
            persons: Number(d.persons || 0),
            manager: d.manager || '',
            thumb: d.thumb || d.hero || '',
            adStart: d.adStart || null,
            adEnd: d.adEnd || null,
          })
        } else {
          // 참조 없으면 원본 필드라도 노출
          out.push({ ...f })
        }
      } else {
        // 제휴: partners/{id} 우선
        let merged = null
        const p = await getDoc(doc(fbDb,'partners', f.targetId))
        if (p.exists()){
          const d = p.data() || {}
          merged = {
            ...f,
            id: p.id,
            name: d.name || d.title || '',
            title: d.title || '',
            region: d.region || '',
            category: String(d.category || d.categoryRaw || 'etc').toLowerCase(),
            desc: (d.desc || d.intro || '').slice(0, 60),
            eventMain: '',
            thumb: d.thumb || d.image || '',
          }
        } else {
          // 보조: config/marketing.partnerCards 배열에서 찾아보기
          try{
            const mk = await getDoc(doc(fbDb,'config','marketing'))
            if (mk.exists()){
              const arr = Array.isArray(mk.data().partnerCards) ? mk.data().partnerCards : []
              const hit = arr.find(x => String(x.id||'') === String(f.targetId))
              if (hit){
                merged = {
                  ...f,
                  id: String(hit.id),
                  name: hit.name || hit.title || '',
                  title: hit.title || '',
                  region: hit.region || '',
                  category: String(hit.category || hit.categoryRaw || 'etc').toLowerCase(),
                  desc: (hit.desc || hit.intro || '').slice(0,60),
                  eventMain: '',
                  thumb: hit.thumb || hit.image || ''
                }
              }
            }
          }catch{}
        }
        out.push(merged || { ...f })
      }
    }catch{
      out.push({ ...f })
    }
  }
  return out
}

/* 필터/검색 뷰 */
const viewList = computed(()=>{
  const key = q.value.trim().toLowerCase()
  return rawFavs.value
    .filter(it => filter.value==='all' ? true : it.type === filter.value)
    .filter(it => key ? (it.name?.toLowerCase().includes(key) || it.region?.toLowerCase().includes(key) || it.desc?.toLowerCase().includes(key)) : true)
})

/* 액션 */
function goFind(){ router.push('/find') }
function goPartners(){ router.push('/partners') }
function open(it){
  if (it.type==='store'){
    // 상세 페이지가 없다면 찾기로 넘겨 검색
    router.push({ path:'/find', query:{ q: it.name || '' } })
  }else{
    // 제휴 상세 라우트가 있다면 연결하세요. (예: name:'partnerDetail')
    router.push({ name:'partnerDetail', params:{ id: it.id || it.targetId } })
  }
}
async function unfav(it){
  if (!confirm('이 항목을 찜에서 해제할까요?')) return
  try{
    doing.value = it.favId
    if (it.src === 'root'){
      await deleteDoc(doc(fbDb,'favorites', it.favId))
    }else{
      const u = fbAuth.currentUser
      if (u?.uid) await deleteDoc(doc(fbDb,'users', u.uid, 'favorites', it.favId))
    }
  }catch(e){
    alert('해제 중 오류가 발생했어요.')
  }finally{
    doing.value = ''
  }
}
async function reload(){ location.reload() }

/* 유틸 */
const toMs = (v) => {
  if (!v) return 0
  if (typeof v === 'number') return v
  if (typeof v.seconds === 'number') return v.seconds*1000 + Math.floor((v.nanoseconds||0)/1e6)
  if (v instanceof Date) return v.getTime()
  return 0
}
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
</script>

<style scoped>
.page{ padding:12px 16px 120px; }

.topbar{
  display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:10px;
}
.ttl{ margin:0; font-size:20px; font-weight:900; white-space:nowrap; }
.rt{ display:flex; flex-direction:column; gap:8px; align-items:flex-end; margin-left:auto; }

.tabs{ display:flex; gap:6px; }
.tab{
  height:30px; padding:0 12px; border:1px solid var(--line);
  background:var(--surface); color:var(--fg); border-radius:999px;
  font-weight:900; font-size:13px;
}
.tab.on{ outline:2px solid var(--accent); background:color-mix(in oklab, var(--accent), white 92%); }

.search{ display:flex; }
.search-in{
  height:34px; padding:0 12px; border:1px solid var(--line); border-radius:12px;
  background:var(--surface); color:var(--fg); min-width:220px; font-weight:700;
}

.stack{ display:flex; flex-direction:column; gap:12px; }
.empty{ text-align:center; color:var(--muted); padding:22px 0 }
.row{ display:flex; gap:8px; justify-content:center; }

.btn{ border:1px solid var(--line); background:var(--surface); color:var(--fg); padding:8px 12px; border-radius:10px; font-weight:800; }
.btn.danger{ color:#ff6a6a; border-color:#ff6a6a; background:color-mix(in oklab, #ff6a6a, white 92%) }

.pro-card{
  display:grid; grid-template-columns: 150px 1fr; gap:12px;
  border:1px solid var(--line); border-radius:16px; background:var(--surface); color:var(--fg);
  padding:12px; box-shadow:0 8px 18px var(--shadow);
}
@media (max-width:420px){ .pro-card{ grid-template-columns: 130px 1fr } }

.pro-thumb{
  width:100%; min-height:160px; border-radius:12px; background:#f3f4f6;
  background-size:cover; background-position:center; box-shadow:inset 0 0 0 1px rgba(0,0,0,.05);
}

.pro-meta{ display:flex; flex-direction:column; gap:6px; min-width:0; }
.pro-head{ display:flex; align-items:center; gap:8px; }
.pro-name{ font-size:18px; font-weight:900; min-width:0; }
.ellip{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.pro-sub{ color:var(--muted); font-size:13px; }
.pro-desc{ color:var(--fg); opacity:.95; }
.one-line{ display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.event-line{ display:flex; align-items:center; gap:6px; margin-top:2px; }
.badge.ev{ border:1px solid var(--line); border-radius:999px; padding:2px 8px; font-size:12px; font-weight:900; background:color-mix(in oklab, var(--accent), white 92%) }
.ev-txt{ font-weight:800; }

.pro-chips{ display:flex; gap:8px; flex-wrap:wrap; margin-top:6px }
.chip{ border:1px solid var(--line); border-radius:999px; padding:6px 10px; font-size:12px; font-weight:800; }
.chip.strong{ background:color-mix(in oklab, var(--accent), white 92%); border-color:color-mix(in oklab, var(--accent), white 40%); }
.chip.kind.store{ background:color-mix(in oklab, #22c55e, white 88%); border-color:#a7f3d0; }
.chip.kind.partner{ background:color-mix(in oklab, #3b82f6, white 88%); border-color:#bfdbfe; }

.pro-actions{ display:flex; gap:8px; flex-wrap:wrap; padding-top:4px; border-top:1px dashed var(--line); }
.pro-period{ display:flex; gap:8px; align-items:center; color:var(--muted); font-size:13px; }
.pro-period strong{ color:var(--fg); font-weight:900 }
</style>
