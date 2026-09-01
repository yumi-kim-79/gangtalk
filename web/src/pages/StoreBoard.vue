<template>
  <main class="page-v2">
    <!-- 헤더 -->
    <header class="v2-head">
      <button class="v2-back" type="button" @click="goBack">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <strong class="v2-head-title">{{ storeName || '우리가게 게시판' }}</strong>
      <span class="spacer"></span>
      <button class="v2-write-btn" type="button" @click="openCompose">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        글쓰기
      </button>
    </header>

    <!-- 게시글 카드 리스트 -->
    <ul class="v2-post-list">
      <li v-for="p in posts" :key="p.id" class="v2-post-card" @click="openPost(p)">
        <div class="v2-pc-main">
          <div class="v2-pc-top">
            <span class="v2-cat-badge">📋 게시판</span>
            <span class="v2-pc-nick">{{ p.authorName || '익명' }}</span>
          </div>
          <div class="v2-pc-title ellip">{{ p.title }}</div>
          <div class="v2-pc-snippet ellip2">{{ p.content }}</div>
          <div class="v2-pc-footer">
            <span>{{ timeAgo(p.createdAt) }}</span>
            <span>💬 {{ p.commentCount || 0 }}</span>
          </div>
        </div>
      </li>
      <li v-if="!posts.length" class="v2-empty">첫 글을 남겨보세요.</li>
    </ul>

    <!-- ===== 글쓰기: 바텀시트 모달 (v2 감성) ===== -->
    <div v-if="showCompose" class="sheet-backdrop" @click.self="closeCompose">
      <section class="sheet v2-compose" role="dialog" aria-modal="true">
        <div class="v2-handle"></div>
        <header class="v2-compose-head">
          <strong class="v2-compose-title">새 글 작성</strong>
          <button class="v2-close" type="button" @click="closeCompose">✕</button>
        </header>

        <form @submit.prevent="submitPost" class="v2-compose-form">
          <input class="v2-title-input" type="text" ref="titleEl" v-model.trim="title" placeholder="제목을 입력하세요" />
          <div class="v2-divider"></div>
          <textarea class="v2-body-input" rows="8" v-model.trim="content" placeholder="내용을 입력하세요..."></textarea>

          <div class="v2-compose-toolbar">
            <button type="button" class="v2-tool-btn" @click="onFuture">📷</button>
            <span class="spacer"></span>
            <span class="v2-char-count" v-if="content">{{ content.length }}자</span>
            <button class="v2-submit-btn" type="submit" :disabled="saving || !canPost">
              {{ saving ? '작성 중…' : '등록' }}
            </button>
          </div>
        </form>
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

async function loadStoreName(){
  try{
    const s = await getDoc(doc(db, 'stores', storeId))
    storeName.value = s.exists() ? (s.data().name || '') : ''
  }catch{}
}

const showCompose = ref(false)
const title = ref('')
const content = ref('')
const titleEl = ref(null)
const saving = ref(false)
const canPost = computed(() => title.value.length > 0 && content.value.length > 0)

function resetDraft(){ title.value = ''; content.value = '' }
function openCompose(){ resetDraft(); showCompose.value = true; nextTick(()=> titleEl.value?.focus()) }
function closeCompose(){ showCompose.value = false; resetDraft() }
function onFuture(){ alert('첨부는 추후 연결 예정입니다.') }

async function submitPost(){
  if (!canPost.value || saving.value) return
  const u = auth.currentUser
  if (!u) { alert('로그인이 필요합니다.'); return }
  saving.value = true
  try{
    await addDoc(collection(db, 'stores', storeId, 'posts'), {
      title: title.value,
      content: content.value,
      body: content.value,
      author: u.displayName || (u.email || '익명'),
      authorUid: u.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      commentCount: 0, views: 0, likes: 0,
    })
    closeCompose()
    alert('등록되었습니다.')
  }catch(e){ alert('등록 중 오류가 발생했어요.'); console.warn(e) }
  finally{ saving.value = false }
}

const posts = ref([])
let unsub = null
function subPosts(){
  const qRef = query(collection(db, 'stores', storeId, 'posts'), orderBy('createdAt','desc'), limit(100))
  unsub = onSnapshot(qRef, snap=>{
    posts.value = snap.docs.map(d => {
      const x = d.data()
      return {
        id: d.id, title: String(x.title || ''),
        content: String(x.content || x.body || ''),
        authorName: String(x.author || x.authorName || ''),
        createdAt: x.createdAt || null,
        commentCount: Number(x.cmtCount ?? x.commentCount ?? 0),
      }
    })
  })
}
onMounted(()=>{ loadStoreName(); subPosts() })
onUnmounted(()=>{ if (typeof unsub==='function') unsub() })

function openPost(p){ router.push({ name:'storePost', params:{ id: storeId, postId: p.id } }) }
function goBack(){ if (history.length > 1) router.back(); else router.push({ name:'dashboard' }) }

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
.page-v2{
  padding:0 0 calc(92px + env(safe-area-inset-bottom));
  background:var(--bg);
  color:var(--fg);
  min-height:100vh;
}

/* v2 공통 헤더 */
.v2-head{
  display:flex; align-items:center; gap:8px;
  padding:12px 16px; background:var(--bg);
  border-bottom:1px solid var(--line);
  position:sticky; top:0; z-index:2;
}
.v2-back{
  width:36px; height:36px; border-radius:50%; border:none;
  background:var(--surface); color:var(--fg);
  display:flex; align-items:center; justify-content:center; cursor:pointer;
}
.v2-head-title{ font-size:17px; font-weight:800; color:var(--fg); }
.spacer{ flex:1; }
.v2-write-btn{
  display:inline-flex; align-items:center; gap:4px;
  height:34px; padding:0 14px; border-radius:999px; border:none;
  background:linear-gradient(135deg,#FF4D8D,#E91E8C); color:#fff;
  font-size:13px; font-weight:700; cursor:pointer;
}

/* v2 게시글 카드 리스트 */
.v2-post-list{ list-style:none; padding:0 16px; margin:0; }
.v2-post-card{
  display:flex; gap:12px; padding:16px 0;
  border-bottom:1px solid var(--line); cursor:pointer;
}
.v2-post-card:last-child{ border-bottom:none; }
.v2-pc-main{ flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; }
.v2-pc-top{ display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.v2-cat-badge{
  display:inline-flex; align-items:center; gap:3px;
  padding:2px 8px; border-radius:999px;
  background:var(--accent-weak, #FFE4EF); color:var(--accent);
  font-size:11px; font-weight:700;
}
.v2-pc-nick{ font-size:11.5px; color:var(--muted); }
.v2-pc-title{ font-size:14.5px; font-weight:800; color:var(--fg); line-height:1.35; }
.v2-pc-snippet{ font-size:12.5px; color:var(--muted); line-height:1.4; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.v2-pc-footer{ display:flex; gap:10px; font-size:11px; color:var(--muted); margin-top:4px; }
.v2-empty{ padding:40px 0; text-align:center; color:var(--muted); font-size:13px; list-style:none; }

.ellip{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ellip2{ display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }

/* v2 글쓰기 모달 */
.sheet-backdrop{
  position:fixed; inset:0; background:rgba(0,0,0,.35);
  display:flex; align-items:flex-end; z-index:10020;
}
.sheet{
  width:100%; background:var(--bg); border-radius:20px 20px 0 0;
  box-shadow:0 -10px 30px rgba(0,0,0,.25);
  padding:14px; padding-bottom:max(14px, env(safe-area-inset-bottom));
}
.v2-compose{
  max-height:calc(100vh - 60px); overflow:auto;
  padding-bottom:max(16px, env(safe-area-inset-bottom));
  background:var(--bg);
}
.v2-handle{ width:40px; height:4px; border-radius:2px; background:var(--line); margin:10px auto 6px; }
.v2-compose-head{ display:flex; align-items:center; justify-content:space-between; padding:8px 16px 12px; }
.v2-compose-title{ font-size:18px; font-weight:900; color:var(--fg); }
.v2-close{
  width:32px; height:32px; border-radius:50%; border:none;
  background:var(--surface); font-size:16px; color:var(--muted); cursor:pointer;
  display:flex; align-items:center; justify-content:center;
}
.v2-compose-form{ padding:0 16px; }
.v2-title-input{
  width:100%; border:none; background:none; padding:8px 0;
  font-size:17px; font-weight:800; color:var(--fg);
}
.v2-title-input::placeholder{ color:var(--muted); font-weight:400; }
.v2-divider{ height:1px; background:var(--line); margin:4px 0 8px; }
.v2-body-input{
  width:100%; border:none; background:none; padding:8px 0;
  font-size:14.5px; line-height:1.7; color:var(--fg); resize:none;
}
.v2-body-input::placeholder{ color:var(--muted); }
.v2-compose-toolbar{
  display:flex; align-items:center; gap:8px; padding:12px 0 8px;
  border-top:1px solid var(--line); margin-top:8px;
}
.v2-tool-btn{ border:none; background:none; font-size:14px; color:var(--muted); cursor:pointer; padding:4px 6px; }
.v2-char-count{ font-size:12px; color:var(--muted); }
.v2-submit-btn{
  height:34px; padding:0 20px; border-radius:999px; border:none;
  background:linear-gradient(135deg,#FF4D8D,#E91E8C); color:#fff;
  font-size:13.5px; font-weight:700; cursor:pointer;
}
.v2-submit-btn:disabled{ opacity:.5; cursor:default; }
</style>
