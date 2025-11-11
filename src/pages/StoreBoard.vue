<template>
  <main class="page">
    <!-- 상단 헤더 -->
    <header class="sb-header">
      <!-- 🔙 뒤로가기 -->
      <button class="sb-nav sb-back" type="button" aria-label="뒤로가기" @click="goBack">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"></path>
        </svg>
      </button>

      <h1 class="sb-title">{{ storeName || '업체 게시판' }}</h1>

      <!-- ✏️ 글쓰기 -->
      <button class="sb-nav sb-write" type="button" @click="openCompose">글쓰기</button>
    </header>

    <!-- 목록 -->
    <section class="list">
      <article v-for="p in posts" :key="p.id" class="post card" @click="openPost(p)">
        <h3 class="p-title ellip">{{ p.title }}</h3>
        <p class="p-preview ellip2">{{ p.content }}</p>
        <div class="meta">
          <span class="author">{{ p.authorName || '익명' }}</span>
          <span class="dot">·</span>
          <span class="time">{{ timeAgo(p.createdAt) }}</span>
          <span class="dot">·</span>
          <span class="cmt">댓글 {{ p.commentCount || 0 }}</span>
        </div>
      </article>

      <div v-if="!posts.length" class="empty">첫 글을 남겨보세요.</div>
    </section>

    <!-- ===== 글쓰기: 바텀시트 모달 ===== -->
    <div v-if="showCompose" class="sheet-backdrop" @click.self="closeCompose">
      <section class="sheet write-sheet" role="dialog" aria-modal="true">
        <header class="sheet-head">
          <strong class="sheet-title">글쓰기</strong>
          <button class="x" type="button" aria-label="닫기" @click="closeCompose">✕</button>
        </header>

        <div class="sheet-body">
          <div class="compose-row">
            <label class="label">제목</label>
            <input
              ref="titleEl"
              v-model.trim="title"
              class="field"
              placeholder="제목을 입력하세요"
            />
          </div>

          <div class="compose-row">
            <label class="label">내용</label>
            <textarea
              v-model.trim="content"
              class="field ta"
              rows="6"
              placeholder="내용을 입력하세요"
            />
          </div>
        </div>

        <footer class="compose-bottom">
          <button class="compose-plus" type="button" aria-label="첨부" @click="onFuture">+</button>
          <button class="compose-create" type="button" :disabled="saving || !canPost" @click="submitPost">
            {{ saving ? '작성 중…' : '등록' }}
          </button>
        </footer>
      </section>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase'
import {
  collection, doc, onSnapshot, orderBy, query,
  addDoc, serverTimestamp, getDoc, limit
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const route = useRoute()
const router = useRouter()
const auth = getAuth()

const storeId = String(route.params.id || '')
const storeName = ref('')

/* 상단 제목용: stores/{id}.name */
async function loadStoreName(){
  try{
    const s = await getDoc(doc(db, 'stores', storeId))
    storeName.value = s.exists() ? (s.data().name || '') : ''
  }catch{}
}

/* ===== 글쓰기 모달 상태 ===== */
const showCompose = ref(false)
const title = ref('')
const content = ref('')
const titleEl = ref(null)
const saving = ref(false)
const canPost = computed(() => title.value.length > 0 && content.value.length > 0)

function resetDraft(){
  title.value = ''
  content.value = ''
}
function openCompose(){
  resetDraft()
  showCompose.value = true
  nextTick(()=> titleEl.value?.focus())
}
function closeCompose(){
  showCompose.value = false
  resetDraft()
}
function onFuture(){ alert('첨부는 추후 연결 예정입니다.') }

async function submitPost(){
  if (!canPost.value || saving.value) return
  const u = auth.currentUser
  if (!u) { alert('로그인이 필요합니다.'); return }

  saving.value = true
  try{
    // 규칙 요건 충족: authorUid == auth.uid, title 필수, content 또는 body 중 하나 존재
    await addDoc(collection(db, 'stores', storeId, 'posts'), {
      title: title.value,
      content: content.value,            // 읽기용
      body: content.value,               // 규칙 만족(둘 중 하나면 되지만 호환 위해 같이 저장)
      author: u.displayName || (u.email || '익명'),
      authorUid: u.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      commentCount: 0,
      views: 0,
      likes: 0,
    })
    closeCompose()
    alert('등록되었습니다.')
  }catch(e){
    alert('등록 중 오류가 발생했어요.')
    console.warn(e)
  }finally{
    saving.value = false
  }
}

/* ===== 목록 구독 ===== */
const posts = ref([])
let unsub = null
function subPosts(){
  const qRef = query(
    collection(db, 'stores', storeId, 'posts'),
    orderBy('createdAt','desc'),
    limit(100)
  )
  unsub = onSnapshot(qRef, snap=>{
    posts.value = snap.docs.map(d => {
      const x = d.data()
      return {
        id: d.id,
        title: String(x.title || ''),
        content: String(x.content || x.body || ''), // body로만 저장된 기존 글 대비
        authorName: String(x.author || x.authorName || ''),
        createdAt: x.createdAt || null,
        commentCount: Number(x.cmtCount ?? x.commentCount ?? 0),
      }
    })
  })
}
onMounted(()=>{ loadStoreName(); subPosts() })
onUnmounted(()=>{ if (typeof unsub==='function') unsub() })

/* 네비게이션 */
function openPost(p){
  router.push({ name:'storePost', params:{ id: storeId, postId: p.id } })
}
function goBack(){
  if (history.length > 1) router.back()
  else router.push({ name:'dashboard' })
}

/* 시간 포맷(간단) */
function timeAgo(ts){
  try{
    const t = ts?.toDate ? ts.toDate().getTime() : Number(ts) || Date.now()
    const diff = Math.max(1, Math.floor((Date.now() - t)/1000))
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff/60)}m`
    if (diff < 86400) return `${Math.floor(diff/3600)}h`
    return `${Math.floor(diff/86400)}d`
  }catch{ return '' }
}
</script>

<style scoped>
.page{
  padding:10px;
  padding-bottom:calc(92px + env(safe-area-inset-bottom));
}

/* 상단 헤더 */
.sb-header{
  position: sticky; top: 0; z-index: 5;
  display:flex; align-items:center; justify-content:space-between;
  gap:8px; padding:8px 10px; background:var(--bg);
  border-bottom:1px solid var(--line);
}
.sb-title{ font-size:16px; font-weight:900; }
.sb-nav{
  height:34px; min-width:34px; padding:0 10px;
  border-radius:999px; border:1px solid var(--line);
  background:var(--surface); display:grid; place-items:center;
  font-weight:800;
}
.sb-write{ min-width:auto; }

/* 카드 공통 */
.card{
  border:1px solid var(--line);
  border-radius:14px;
  background:var(--surface);
  padding:10px;
  box-shadow:0 4px 12px var(--shadow);
}

/* 목록 */
.list{ display:flex; flex-direction:column; gap:8px; margin-top:12px }
.post{ cursor:pointer }
.p-title{ margin:0 0 4px; font-size:14px; font-weight:900 }
.p-preview{ margin:0 0 6px; color:var(--muted); font-size:12px }
.meta{ font-size:11.5px; color:var(--muted); display:flex; gap:6px; align-items:center }
.dot{ opacity:.6 }
.empty{ text-align:center; color:var(--muted); padding:24px 0 }

/* 줄바꿈 제어 */
.ellip{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.ellip2{ display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden }

/* ===== 글쓰기 모달 ===== */
.sheet-backdrop{
  position:fixed; inset:0; background:rgba(0,0,0,.35);
  display:flex; align-items:flex-end;
  z-index:10020;
}
.sheet{
  width:100%; background:var(--bg); border-radius:18px 18px 0 0;
  box-shadow:0 -10px 30px rgba(0,0,0,.25);
  padding:14px; padding-bottom:max(14px, env(safe-area-inset-bottom));
  max-height:92dvh; display:flex; flex-direction:column;
}
.sheet-head{ display:flex; justify-content:space-between; align-items:center; gap:8px }
.sheet-title{ font-size:17px; font-weight:900 }
.sheet-head .x{
  width:32px; height:32px; border-radius:50%; border:1px solid var(--line);
  background:var(--surface); display:flex; align-items:center; justify-content:center;
}
.sheet-body{ overflow:auto; padding-bottom:88px }
.compose-row{ display:flex; flex-direction:column; gap:6px; margin-top:8px }
.compose-row .label{ font-size:12px; color:var(--muted) }
.field{
  height:40px; border-radius:12px; border:1px solid var(--line);
  padding:0 12px; background:transparent;
}
.field.ta{ height:auto; padding:10px 12px; resize:vertical; min-height:120px }

/* 하단 고정 바 */
.compose-bottom{
  position:sticky; bottom:0; left:0; right:0;
  display:flex; gap:8px; padding:10px 0;
  padding-bottom:calc(10px + env(safe-area-inset-bottom));
  margin-top:auto;
  background:linear-gradient(180deg, transparent, color-mix(in oklab, var(--bg), white 30%));
  border-top:1px solid var(--line);
  z-index:5;
}
.compose-plus{
  width:44px; height:44px; border-radius:12px; border:1px solid var(--line);
  background:var(--surface); font-size:22px; font-weight:900; line-height:0;
}
.compose-create{
  flex:1; height:44px; border-radius:12px; border:1px solid var(--accent);
  background: color-mix(in oklab, var(--accent), white 85%);
  font-weight:900;
}

/* ===== 화이트 모드 가독성 보정 ===== */
:root[data-theme="white"] .sb-back,
:root[data-theme="white"] .sb-write,
:root[data-theme="white"] .sheet-head .x{
  color:#111 !important;
  background:#fff !important;
  border-color:#bbb !important;
}
:root[data-theme="white"] .sb-back svg path,
:root[data-theme="white"] .sheet-head .x svg path{
  stroke:#111 !important;
}
:root[data-theme="white"] .sb-title{ color:#111 !important }
:root[data-theme="white"] .compose-create{ color:#111 !important }
</style>
