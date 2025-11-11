<!-- src/components/mypage/UserSection.vue -->
<template>
  <section class="section user-section">
    <!-- 프로필 카드 -->
    <div class="card shadow profile-card">
      <div class="profile">
        <div class="avatar" :style="avatarStyle">
          <span v-if="!hasBg">{{ safeInitials }}</span>
        </div>
        <div class="info">
          <div class="nick">{{ displayNick || '회원' }}</div>
          <div class="email">{{ state?.profile?.email || state?.email || '-' }}</div>
        </div>
      </div>

      <ul class="rows">
        <li class="row">
          <span class="key">보유 포인트</span>
          <span class="val strong">{{ points.toLocaleString('ko-KR') }}P</span>
        </li>

        <!-- 회원 등급 (브랜드 배지 이미지) : 클릭 시 등급표 페이지 -->
        <li
          class="row row-clickable"
          role="button"
          tabindex="0"
          :title="'등급표 열기'"
          @click="handleTierClick"
          @keydown.enter.prevent="handleTierClick"
          @keydown.space.prevent="handleTierClick"
        >
          <span class="key">회원 등급</span>
          <span class="val gap">
            <span class="tier-badge" :data-tier="tier.key">
              <img class="tier-badge-img" :src="tierBadgeSrc" :alt="tier.label" />
              {{ tier.label }}
            </span>
          </span>
        </li>

        <!-- 진행 바 : 🔒 클릭/포커스 비활성 -->
        <li class="row tier-progress-wrap" aria-disabled="true">
          <div class="tier-progress">
            <div class="bar" aria-hidden="true">
              <div class="fill" :style="{ width: progressPct + '%' }"></div>
            </div>
            <div class="legend" aria-label="등급 진행 상황">
              <span class="cur">{{ tier.label }}</span>
              <span class="next" v-if="nextTier">
                {{ `다음: ${nextTier.label} (${fmtWon(pointToNext)} 남음)` }}
              </span>
              <span class="next" v-else>최고 등급 달성 🎉</span>
            </div>
          </div>
        </li>

        <li class="row">
          <span class="key">내 추천코드</span>
          <span class="val code">
            <b>{{ myCode || '-' }}</b>
            <button class="btn xs" type="button" @click="onCopyCode">복사</button>
            <button class="btn xs ghost" type="button" @click="onShareCode">공유</button>
          </span>
        </li>
      </ul>
    </div>

    <!-- 프로모션 -->
    <div class="promo card shadow">
      <div class="text">
        <b>추천 리워드</b> — 친구가 회원가입 시 서로 <u>20,000P</u>!
      </div>
      <button class="btn primary sm" type="button" @click="onShareCode">내 코드 공유하기</button>
    </div>

    <!-- ===== 내 글/댓글/대댓글 관리 패널 ===== -->
    <section class="mypanel card shadow" v-if="panel.open">
      <header class="mp-head">
        <strong>내 활동 관리</strong>
        <span class="spacer"></span>
        <div class="tabs" role="tablist" aria-label="내 활동 종류">
          <button class="tab" :class="{on: panel.tab==='posts'}" role="tab"
                  :aria-selected="panel.tab==='posts'" @click="panel.tab='posts'">글</button>
          <button class="tab" :class="{on: panel.tab==='comments'}" role="tab"
                  :aria-selected="panel.tab==='comments'" @click="panel.tab='comments'">댓글</button>
          <button class="tab" :class="{on: panel.tab==='replies'}" role="tab"
                  :aria-selected="panel.tab==='replies'" @click="panel.tab='replies'">대댓글</button>
        </div>
      </header>

      <!-- 글 -->
      <div v-show="panel.tab==='posts'">
        <div v-if="loading.posts" class="muted center">불러오는 중…</div>
        <ul v-else class="list">
          <li v-for="p in myPosts" :key="p.id" class="row">
            <div class="body" @click="goPost(p.id)">
              <b class="ttl ellip">{{ p.title || '(제목 없음)' }}</b>
              <small class="sub ellip">{{ firstLine(p.body || p.content || p.subtitle) }}</small>
              <div class="meta">
                <span>{{ ymd(p.updatedAt || p.createdAt) }}</span><span class="sep">/</span>
                <span>조회 {{ (p.views||0).toLocaleString() }}</span><span class="sep">/</span>
                <span class="red">추천 {{ (p.likes||0).toLocaleString() }}</span>
              </div>
            </div>
            <div class="actions" @click.stop>
              <button class="mini" @click="startEditPost(p)">수정</button>
              <button class="mini danger" @click="deletePost(p)">삭제</button>
            </div>
          </li>
          <li v-if="!myPosts.length" class="empty">작성한 글이 없습니다.</li>
        </ul>
      </div>

      <!-- 댓글 -->
      <div v-show="panel.tab==='comments'">
        <div v-if="loading.comments" class="muted center">불러오는 중…</div>
        <ul v-else class="list">
          <li v-for="c in myComments" :key="c.id" class="row">
            <div class="body" @click="goPost(c.postId)">
              <b class="ttl ellip">댓글 · {{ firstLine(c.body) }}</b>
              <small class="sub ellip">게시글: {{ c.postTitle || c.postId }}</small>
              <div class="meta"><span>{{ ymd(c.updatedAt || c.createdAt) }}</span></div>
            </div>
            <div class="actions" @click.stop>
              <button class="mini" @click="startEditComment(c)">수정</button>
              <button class="mini danger" @click="deleteComment(c)">삭제</button>
            </div>
          </li>
          <li v-if="!myComments.length" class="empty">작성한 댓글이 없습니다.</li>
        </ul>
      </div>

      <!-- 대댓글 -->
      <div v-show="panel.tab==='replies'">
        <div v-if="loading.replies" class="muted center">불러오는 중…</div>
        <ul v-else class="list">
          <li v-for="r in myReplies" :key="r.id" class="row">
            <div class="body" @click="goPost(r.postId)">
              <b class="ttl ellip">대댓글 · {{ firstLine(r.body) }}</b>
              <small class="sub ellip">게시글: {{ r.postTitle || r.postId }}</small>
              <div class="meta"><span>{{ ymd(r.updatedAt || r.createdAt) }}</span></div>
            </div>
            <div class="actions" @click.stop>
              <button class="mini" @click="startEditComment(r)">수정</button>
              <button class="mini danger" @click="deleteComment(r)">삭제</button>
            </div>
          </li>
          <li v-if="!myReplies.length" class="empty">작성한 대댓글이 없습니다.</li>
        </ul>
      </div>
    </section>

    <!-- 관리 패널 열기 버튼 -->
    <div class="grid two">
      <button class="tile on" type="button" @click="toggleMyPanel">
        <span class="title">내 글/댓글 관리</span>
        <span class="hint">{{ panel.open ? '접기' : '활동 기록 보기' }}</span>
      </button>
      <span></span>
    </div>

    <!-- ===== 수정 모달(글) ===== -->
    <div v-if="edit.open && edit.mode==='post'" class="sheet-backdrop" @click.self="closeEdit">
      <div class="sheet">
        <header class="sheet-head">
          <strong class="sheet-title">글 수정</strong>
          <button class="x" type="button" @click="closeEdit">✕</button>
        </header>
        <form @submit.prevent="savePost">
          <input class="field" type="text" v-model="edit.post.title" placeholder="제목" />
          <input class="field" type="text" v-model="edit.post.subtitle" placeholder="부제(선택)" />
          <textarea class="field ta" rows="8" v-model="edit.post.body" placeholder="내용"></textarea>
          <div class="row-right"><button class="btn" type="submit">저장</button></div>
        </form>
      </div>
    </div>

    <!-- ===== 수정 모달(댓글/대댓글) ===== -->
    <div v-if="edit.open && edit.mode!=='post'" class="sheet-backdrop" @click.self="closeEdit">
      <div class="sheet">
        <header class="sheet-head">
          <strong class="sheet-title">{{ edit.mode==='comment' ? '댓글 수정' : '대댓글 수정' }}</strong>
          <button class="x" type="button" @click="closeEdit">✕</button>
        </header>
        <form @submit.prevent="saveComment">
          <textarea class="field ta" rows="6" v-model="edit.comment.body" placeholder="내용"></textarea>
          <div class="row-right"><button class="btn" type="submit">저장</button></div>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db as fbDb } from '@/firebase'
import {
  collection, collectionGroup, query, where, getDocs,
  doc, updateDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore'

/* ===== Props ===== */
const props = defineProps({
  state: { type: Object, required: true },
  displayNick: { type: [String, Number], default: '' },
  myCode: { type: String, default: '' },
  hasAvatarImage: { type: Boolean, default: false },
  avatarStyle: { type: Object, default: () => ({}) },
  initials: { type: Function, default: (s) => String(s || '').slice(0, 2) },
  copy: { type: Function, default: (t) => navigator.clipboard?.writeText?.(t) },
  go: { type: Function, default: () => {} },
  userPoints: { type: Number, default: null },

  /* ✅ 추가: 등급/진행바 클릭 콜백 */
  onTierClick: { type: Function, default: null },
})

const router = useRouter()
const route  = useRoute()

/* ===== 등급 정의 ===== */
const TIERS = [
  { key:'daiso',       label:'다이소',       threshold: 10_000,        icon:'/tiers/daiso.svg' },
  { key:'newbalance',  label:'뉴발란스',     threshold: 100_000,       icon:'/tiers/newbalance.svg' },
  { key:'nike',        label:'나이키',       threshold: 300_000,       icon:'/tiers/nike.svg' },
  { key:'ck',          label:'CK',           threshold: 500_000,       icon:'/tiers/ck.svg' },
  { key:'ysl',         label:'생로랑',       threshold: 1_000_000,     icon:'/tiers/ysl.svg' },
  { key:'prada',       label:'프라다',       threshold: 5_000_000,     icon:'/tiers/prada.svg' },
  { key:'gucci',       label:'구찌',         threshold: 20_000_000,    icon:'/tiers/gucci.svg' },
  { key:'lv',          label:'루이비통',     threshold: 30_000_000,    icon:'/tiers/lv.svg' },
  { key:'chanel',      label:'샤넬',         threshold: 50_000_000,    icon:'/tiers/chanel.svg' },
  { key:'hermes',      label:'에르메스',     threshold: 100_000_000,   icon:'/tiers/hermes.svg' },
]

/* ===== 등급 계산 ===== */
const points = computed(() => Number(props.userPoints ?? props.state?.points ?? 0))

const tier = computed(() => {
  let hit = TIERS[0]
  for (const t of TIERS) {
    if (points.value >= t.threshold) hit = t
    else break
  }
  return hit
})

const nextTier = computed(() => {
  const idx = TIERS.findIndex(t => t.key === tier.value.key)
  return TIERS[idx + 1] || null
})

const progressPct = computed(() => {
  if (!nextTier.value) return 100
  const base = tier.value.threshold
  const span = nextTier.value.threshold - base
  const prog = Math.max(0, Math.min(1, (points.value - base) / span))
  return Math.round(prog * 100)
})

const pointToNext = computed(() => {
  if (!nextTier.value) return 0
  return Math.max(0, nextTier.value.threshold - points.value)
})

/* ===== 배지 이미지 경로 ===== */
const tierBadgeSrc = computed(() => `/tiers/badges/badge_${tier.value.key}.png`)

/* ===== Avatar/Text ===== */
const hasBg = computed(() => {
  const s = props.avatarStyle || {}
  const bg = (s.backgroundImage || s['background-image'] || '').toString()
  return !!bg
})
const safeInitials = computed(() => props.initials?.(props.displayNick || '회원') || '회원')

/* ===== 클릭 핸들러 ===== */
function handleTierClick(){
  if (typeof props.onTierClick === 'function') props.onTierClick()
}

/* ===== 추천코드 액션 ===== */
function fmtWon(n=0){ return Math.floor(n).toLocaleString('ko-KR') + 'P' }
async function onCopyCode(){
  if (!props.myCode) { alert('추천코드가 없습니다.'); return }
  try { await props.copy(props.myCode); alert('복사되었습니다.') }
  catch { try { await navigator.clipboard.writeText(props.myCode); alert('복사되었습니다.') }
  catch { alert('복사에 실패했어요. 길게 눌러 직접 복사해 주세요.') } }
}
async function onShareCode(){
  const code = props.myCode || ''
  const text = `강남톡방 추천코드: ${code} — 가입하면 서로 20,000P!`
  const url = location.origin || ''
  try { if (navigator.share) { await navigator.share({ title:'내 추천코드', text, url }) } else { await onCopyCode() } }
  catch {}
}

/* ===== 내 글/댓글 관리 ===== */
const panel = ref({ open:false, tab:'posts' })
const uid = ref('')
function toggleMyPanel(){ panel.value.open = !panel.value.open; if (panel.value.open) ensureAndLoad() }
function ensureAndLoad(){
  const auth = getAuth(); const u = auth.currentUser
  if (u){ uid.value = u.uid; loadAll() }
  else { onAuthStateChanged(auth, (nu)=>{ if(nu){ uid.value = nu.uid; loadAll() } }) }
}

const loading = ref({ posts:false, comments:false, replies:false })
const myPosts    = ref([])
const myComments = ref([])
const myReplies  = ref([])

async function loadPosts(){
  loading.value.posts = true
  try{
    const qRef = query(collection(fbDb, 'board_posts'), where('authorUid', '==', uid.value))
    const snap = await getDocs(qRef)
    myPosts.value = sortByUpdated(snap.docs.map(d => ({ id:d.id, ...d.data() })))
  }finally{ loading.value.posts = false }
}

async function loadCommentsAndReplies(){
  loading.value.comments = true; loading.value.replies = true
  try{
    const tryGroup = async () => {
      const qRef = query(collectionGroup(fbDb, 'comments'), where('authorUid','==', uid.value))
      const snap = await getDocs(qRef)
      return await mapCommentsSnapshot(snap)
    }
    let all = []
    try { all = await tryGroup() }
    catch {
      const postsSnap = await getDocs(collection(fbDb, 'board_posts'))
      const tasks = postsSnap.docs.map(async p => {
        const pid = p.id
        const cSnap = await getDocs(query(collection(fbDb, `board_posts/${pid}/comments`), where('authorUid','==', uid.value)))
        const mapped = await mapCommentsSnapshot(cSnap, pid, p.data()?.title || '')
        return mapped
      })
      all = (await Promise.all(tasks)).flat()
    }
    const cmts = all.filter(x => !x.parentId)
    const reps = all.filter(x => !!x.parentId)
    myComments.value = sortByUpdated(cmts)
    myReplies.value  = sortByUpdated(reps)
  }finally{
    loading.value.comments = false
    loading.value.replies  = false
  }
}

async function mapCommentsSnapshot(snap, forcedPostId = '', forcedPostTitle = ''){
  const result = []
  for (const d of snap.docs){
    const ref  = d.ref
    const data = d.data()
    let postId = forcedPostId
    let postTitle = forcedPostTitle
    if (!postId){
      const postRef = ref.parent.parent
      postId = postRef?.id || ''
    }
    if (!postTitle && postId){
      try {
        const ps = await getDocs(query(collection(fbDb,'board_posts'), where('__name__','==',postId)))
        postTitle = ps.docs[0]?.data()?.title || ''
      } catch {}
    }
    result.push({ id:d.id, _ref:ref, postId, postTitle, ...data })
  }
  return result
}

async function loadAll(){ await Promise.all([loadPosts(), loadCommentsAndReplies()]) }
function goPost(postId){ router.push({ name:'chat', query:{ ...route.query, postId, theme: route.query.theme || 'white' } }) }

/* 수정/삭제 */
const edit = ref({ open:false, mode:'post', post:{ id:'', title:'', subtitle:'', body:'' }, comment:{ _ref:null, body:'' } })
function startEditPost(p){
  edit.value.open = true
  edit.value.mode = 'post'
  edit.value.post = { id:p.id, title:p.title||'', subtitle:p.subtitle||'', body:p.body||p.content||'' }
}
function startEditComment(c){
  edit.value.open = true
  edit.value.mode = c.parentId ? 'reply' : 'comment'
  edit.value.comment = { _ref:c._ref, body:c.body || '' }
}
function closeEdit(){ edit.value.open=false }

async function savePost(){
  const p = edit.value.post; if (!p.id) return
  await updateDoc(doc(fbDb,'board_posts', String(p.id)), {
    title:(p.title||'').trim(), subtitle:(p.subtitle||'').trim(),
    body:(p.body||'').trim(), content:(p.body||'').trim(),
    updatedAt: serverTimestamp()
  })
  closeEdit(); await loadPosts()
}
async function saveComment(){
  const c = edit.value.comment; if (!c._ref) return
  await updateDoc(c._ref, { body:(c.body||'').trim(), updatedAt: serverTimestamp() })
  closeEdit(); await loadCommentsAndReplies()
}
async function deletePost(p){
  if (!confirm('이 글을 삭제할까요?')) return
  await deleteDoc(doc(fbDb,'board_posts', String(p.id)))
  await loadPosts()
}
async function deleteComment(c){
  if (!confirm('이 댓글을 삭제할까요? 대댓글이 있으면 함께 지워질 수 있어요.')) return
  await deleteDoc(c._ref)
  await loadCommentsAndReplies()
}

/* 유틸 */
function tsToMs(ts){
  if (!ts) return 0
  if (typeof ts === 'number') return ts
  if (ts?.toMillis) return ts.toMillis()
  if (ts?.seconds) return ts.seconds*1000 + (ts.nanoseconds||0)/1e6
  return 0
}
function sortByUpdated(arr){ return arr.slice().sort((a,b)=> tsToMs(b.updatedAt||b.createdAt) - tsToMs(a.updatedAt||a.createdAt)) }
function firstLine(t=''){ const s=String(t).replace(/\r\n|\r/g,'\n'); const line=s.split('\n').find(v=>v.trim())||''; return line.length>80?line.slice(0,80)+'…':line }
function ymd(ts){ const d=new Date(tsToMs(ts)||Date.now()); const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}` }
</script>

<style scoped>
.user-section{ padding-top: 6px; }

/* 프로필 카드 */
.profile-card { padding: 14px 14px 6px; border-radius: 16px; margin-top: 0; }
.profile { display:flex; gap:12px; align-items:center; padding: 6px 2px 2px; }
.avatar{
  width:56px; height:56px; border-radius:14px;
  background-color:#FFE8F1;
  background-size:cover; background-position:center;
  display:flex; align-items:center; justify-content:center;
  font-weight:900; color:#FF2C8A;
}
.info .nick{ font-size:16px; font-weight:900; }
.info .email{ font-size:12px; color:var(--muted); }

.rows{ list-style:none; padding:0; margin: 10px 0 2px 0; }
.row{ display:flex; align-items:center; justify-content:space-between; padding:10px 2px; border-top: 1px dashed var(--line); }
.row:first-of-type{ border-top: none; }
.row.row-clickable{ cursor:pointer; border-radius:10px; }
.row.row-clickable:active{ background: color-mix(in oklab, var(--bg), white 70%); }
.row.row-clickable:focus-visible{ outline:2px solid color-mix(in oklab, var(--accent), white 70%); }
.key{ color: var(--muted); white-space: nowrap; }
.val{ display:flex; align-items:center; gap:8px; min-height:24px; }
.val.gap{ gap:10px; }
.val.strong{ font-weight:900; }
.val.code b{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.btn.xs{ height:26px; padding: 0 10px; border-radius: 8px; border:1px solid var(--line); background: var(--surface); font-size:12px; }
.btn.xs.ghost{ background:transparent }

/* ===== Tier Badge (브랜드 배지) ===== */
.tier-badge{
  display:inline-flex; align-items:center; gap:8px;
  padding:4px 10px; border-radius:999px; font-size:12px; font-weight:900;
  border:1px solid var(--line); background:#fff;
}
.tier-badge-img{ width:20px; height:20px; object-fit:contain; display:block; }

/* 진행 바 */
.tier-progress-wrap{ flex-direction: column; align-items: stretch; gap:6px; }
/* 🔒 진행바 영역 전체의 포인터 이벤트 차단(보조) */
.tier-progress-wrap { pointer-events: none; }
.tier-progress-wrap * { pointer-events: none; }
.tier-progress .bar{ width:100%; height:10px; border-radius:999px; background:var(--surface); border:1px solid var(--line); overflow:hidden; }
.tier-progress .fill{ height:100%; width:0%; background:#ff2c8a; transition:width .35s ease; }
.tier-progress .legend{ margin-top:4px; display:flex; justify-content:space-between; font-size:12px; color:var(--muted); }

/* 프로모션 */
.promo{ margin-top:12px; padding:12px; border-radius:16px; display:flex; align-items:center; justify-content:space-between; gap:10px; }
.promo .text{ font-size:14px; }
.btn.primary.sm{ height:38px; padding:0 14px; border-radius:12px; font-weight:900; border:1px solid var(--accent); background: color-mix(in oklab, var(--accent), white 85%); }
html[data-theme="white"] :where(.btn.primary.sm){ background:#ff2c8a !important; border-color:#ff2c8a !important; color:#fff !important; }

/* 다크 모드 버튼색 보정 */
html[data-theme="black"] :where(.btn.primary.sm){ background:#555 !important; border-color:#666 !important; color:#fff !important; }

/* ===== 내 활동 패널 ===== */
.mypanel{ margin-top:12px; border-radius:14px; }
.mp-head{ display:flex; align-items:center; gap:10px; padding:10px 12px; border-bottom:1px solid color-mix(in oklab, var(--bg), white 12%); }
.tabs{ display:flex; gap:6px; }
.tab{ height:28px; padding:0 10px; border-radius:999px; border:1px solid var(--line); background:transparent; font-weight:900; }
.tab.on{ border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in oklab, var(--accent), white 80%); }

.list{ list-style:none; padding:8px 10px 12px; margin:0; display:flex; flex-direction:column; gap:8px }
.row{ display:grid; grid-template-columns:1fr auto; gap:8px; border:1px solid var(--line); border-radius:12px; padding:10px; background:var(--bg); }
.body{ min-width:0; cursor:pointer; }
.ttl{ display:block; font-size:14px; }
.sub{ display:block; color:var(--muted); margin-top:2px }
.meta{ color:var(--muted); font-size:12px; display:flex; align-items:center; gap:6px; margin-top:4px }
.meta .sep{ opacity:.6 }
.meta .red{ color:#d33 }
.actions{ display:flex; align-items:center; gap:6px }
.mini{ height:28px; padding:0 10px; border-radius:8px; border:1px solid var(--line); background:transparent; }
.mini.danger{ color:#d33; border-color: color-mix(in oklab, #d33, white 60%); }
.empty{ text-align:center; color:var(--muted); padding:8px 0 }

/* 화이트 모드에서 ‘수정(.mini)’ 텍스트 가독성 */
html[data-theme="white"] :where(.mypanel .actions .mini){ color:#111 !important; }

/* 수정 모달 */
.sheet-backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:flex-end; z-index:140; }
.sheet{ width:100%; background:var(--bg); border-radius:18px 18px 0 0; box-shadow:0 -10px 30px rgba(0,0,0,.25); padding:14px; padding-bottom:max(14px, env(safe-area-inset-bottom)); }
.sheet-head{ display:flex; justify-content:space-between; align-items:center; gap:8px }
.sheet-title{ font-size:17px }
.sheet-head .x{ width:32px; height:32px; border-radius:50%; border:1px solid var(--line); background:var(--surface); display:flex; align-items:center; justify-content:center; color:var(--fg); }
.field{ width:100%; box-sizing:border-box; border:1px solid var(--line); background:var(--surface); color:var(--fg); border-radius:10px; padding:10px 12px; font-size:14px; margin-top:8px; }
.ta{ resize:vertical }
.row-right{ display:flex; justify-content:flex-end; margin-top:10px }
.btn{ height:34px; padding:0 12px; border-radius:10px; border:1px solid var(--accent); background: color-mix(in oklab, var(--accent), white 85%); font-weight:900; color:#111; }

.ellip{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.center{ text-align:center }
.spacer{ flex:1 }
.grid.two{ display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top: 12px; }
.tile{ background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:12px; text-align:left; }
.tile.on{ outline:2px solid color-mix(in oklab, var(--accent), white 65%); }
.tile .title{ display:block; font-weight:900; margin-bottom:4px; }
.tile .hint{ color:var(--muted); font-size:12px; }
</style>
