<!--
  StorePost.vue
  -------------------------------------------------------
  ✅ 무엇을 고쳤나?
   1) 댓글 규칙 충족:
      - Firestore Rules: /stores/{id}/posts/{postId}/comments
        -> create: signedIn && request.resource.data.authorUid == request.auth.uid
                   && (text || body)
      - 그래서 addDoc 시 authorUid, text(또는 body) 반드시 포함
   2) 권한 오류 원인 제거:
      - 부모 글 문서(commentCount 증가)는 규칙상 허용 키가 아니라
        update 시 "Missing or insufficient permissions"가 발생.
      - 해당 증가 코드를 삭제하여 실패 원인 제거.
   3) 본문/작성자 표시 보완:
      - 본문: post.content || post.body
      - 댓글 작성자: c.author || c.authorName

  나머지 UI/동작/스타일은 기존 그대로 유지
  -------------------------------------------------------
-->

<template>
  <main class="page">
    <header class="topbar">
      <button class="back" type="button" @click="$router.back()">←</button>
      <strong class="ttl">{{ storeName || '업체 게시판' }}</strong>
      <span class="spacer"></span>
    </header>

    <article class="card">
      <h2 class="p-title">{{ post?.title || '제목 없음' }}</h2>
      <div class="meta">
        <span class="author">{{ post?.authorName || '익명' }}</span>
        <span class="dot">·</span>
        <span class="time">{{ timeAgo(post?.createdAt) }}</span>
      </div>
      <!-- 본문은 content가 없을 수 있어 body로 폴백 -->
      <pre class="content">{{ post?.content || post?.body || '' }}</pre>
    </article>

    <!-- 댓글 작성 -->
    <section class="comment-editor card">
      <textarea v-model.trim="comment" rows="3" placeholder="댓글을 입력하세요"></textarea>
      <div class="actions">
        <button class="btn" :disabled="saving || !comment.length" @click="submitComment">
          {{ saving ? '작성 중…' : '댓글 등록' }}
        </button>
      </div>
    </section>

    <!-- 댓글 목록 -->
    <section class="comment-list">
      <div v-for="c in comments" :key="c.id" class="comment card">
        <div class="c-head">
          <!-- 저장 필드는 author(표시용), 규칙 필드는 authorUid -->
          <b class="name">{{ c.author || c.authorName || '익명' }}</b>
          <span class="time">{{ timeAgo(c.createdAt) }}</span>
        </div>
        <p class="c-body">{{ c.text || c.body }}</p>
      </div>
      <div v-if="!comments.length" class="empty">첫 댓글을 남겨보세요.</div>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { db } from '@/firebase'
import {
  collection, doc, onSnapshot, orderBy, query,
  addDoc, serverTimestamp, getDoc, limit
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const route = useRoute()
const auth = getAuth()

const storeId = String(route.params.id || '')
const postId  = String(route.params.postId || '')

/* 상단 가게명 */
const storeName = ref('')
async function loadStoreName(){
  try{
    const s = await getDoc(doc(db, 'stores', storeId))
    storeName.value = s.exists() ? (s.data().name || '') : ''
  }catch{}
}

/* 게시글 */
const post = ref(null)
let unsubPost = null
function subPost(){
  unsubPost = onSnapshot(doc(db, 'stores', storeId, 'posts', postId), snap=>{
    post.value = snap.exists() ? ({ id:snap.id, ...snap.data() }) : null
  })
}

/* 댓글 작성 */
const comment = ref('')
const saving = ref(false)
async function submitComment(){
  if (!comment.value.length || saving.value) return

  const u = auth.currentUser
  if (!u) {
    alert('로그인이 필요합니다.')
    return
  }

  saving.value = true
  try{
    // ✅ 규칙 충족: authorUid == auth.uid && (text || body)
    await addDoc(collection(db, 'stores', storeId, 'posts', postId, 'comments'), {
      text: comment.value,                 // 본문
      authorUid: u.uid,                    // 규칙 필수
      author: u.displayName || (u.email || '익명'), // 표시용(선택)
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    // ⛔ 규칙 불가: 부모 문서 commentCount 증가는 허용된 키가 아님
    // await updateDoc(doc(db, 'stores', storeId, 'posts', postId), { ... })

    comment.value = ''
  }catch(e){
    alert('댓글 등록 중 오류가 발생했어요.')
    console.warn(e)
  }finally{
    saving.value = false
  }
}

/* 댓글 목록 */
const comments = ref([])
let unsubC = null
function subComments(){
  const qRef = query(
    collection(db, 'stores', storeId, 'posts', postId, 'comments'),
    orderBy('createdAt','asc'),
    limit(200)
  )
  unsubC = onSnapshot(qRef, snap=>{
    comments.value = snap.docs.map(d => ({ id:d.id, ...d.data() }))
  })
}

onMounted(()=>{ loadStoreName(); subPost(); subComments() })
onUnmounted(()=>{ if (unsubPost) unsubPost(); if (unsubC) unsubC() })

/* 상대 시간 */
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
.page{ padding:10px; padding-bottom:calc(92px + env(safe-area-inset-bottom)) }
.topbar{ display:flex; align-items:center; gap:8px; margin-bottom:10px }
.back{ width:34px; height:34px; border-radius:10px; border:1px solid var(--line); background:var(--surface) }
.ttl{ font-size:16px; font-weight:900 }
.spacer{ flex:1 }
.card{ border:1px solid var(--line); border-radius:14px; background:var(--surface); padding:10px; box-shadow:0 4px 12px var(--shadow) }

.p-title{ margin:0 0 6px; font-size:16px; font-weight:900 }
.meta{ font-size:12px; color:var(--muted); display:flex; gap:6px; align-items:center }
.content{ white-space:pre-wrap; font-size:14px; margin:6px 0 0 }

.comment-editor{ margin-top:12px }
.comment-editor textarea{ width:100%; border:1px solid var(--line); border-radius:10px; padding:8px; resize:vertical }
.comment-editor .actions{ display:flex; justify-content:flex-end; margin-top:6px }
.btn{ min-width:100px; height:36px; border-radius:10px; border:1px solid var(--accent); background: color-mix(in oklab, var(--accent), white 85%); font-weight:900 }

.comment-list{ display:flex; flex-direction:column; gap:8px; margin-top:12px }
.comment .c-head{ display:flex; justify-content:space-between; align-items:center; color:var(--muted); font-size:12px }
.comment .name{ font-weight:900; color:var(--fg) }
.comment .c-body{ margin:6px 0 0; white-space:pre-wrap; font-size:14px }
.empty{ text-align:center; color:var(--muted); padding:20px 0 }
.dot{ opacity:.6 }
</style>
