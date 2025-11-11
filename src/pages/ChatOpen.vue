<!-- src/pages/ChatOpen.vue -->
<template>
  <section class="chat-page">
    <header class="cat-head">
      <button class="back-btn" @click="$router.back()">←</button>
      <b>오픈 채팅방</b>
      <span class="spacer"></span>
      <small class="muted">누구나 참여 · 익명</small>
    </header>

    <div class="msg-box" ref="msgBox">
      <div v-if="!storeId">잘못된 접근입니다. (storeId 없음)</div>
      <div v-else v-for="m in messages" :key="m._id" class="msg" :class="{me:m.me}">
        <div class="bubble">{{ m.text }}</div>
        <div class="time">{{ m.time }}</div>
      </div>
    </div>

    <form class="composer" @submit.prevent="send">
      <input v-model="draft" placeholder="메시지를 입력..." />
      <button type="submit">전송</button>
    </form>
  </section>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import { db as fbDb } from '@/firebase'
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import {
  collection, doc, getDoc, setDoc, addDoc, onSnapshot,
  serverTimestamp, orderBy, query
} from 'firebase/firestore'

const route = useRoute()
const storeId = computed(() => String(route.params.storeId || '').trim())
const msgBox = ref(null)
const messages = ref([])
const draft = ref('')
const auth = getAuth()
const me = ref(null)

const clock = (ms)=>{
  const d=new Date(ms); const h=String(d.getHours()).padStart(2,'0'); const m=String(d.getMinutes()).padStart(2,'0')
  return `${h}:${m}`
}
const norm = (id,x)=>({
  _id:id,
  text: x.text || '',
  me: (x.authorUid && me.value && x.authorUid===me.value.uid) || false,
  time: clock(x.createdAt?.toMillis?.()||Date.now())
})

function scrollBottom(){
  nextTick(()=>{
    const el=msgBox.value
    if(el) el.scrollTop = el.scrollHeight
  })
}

async function ensureRoom(rid){
  const roomRef = doc(fbDb, 'rooms_open', rid)
  const s = await getDoc(roomRef)
  if (!s.exists()) {
    await setDoc(roomRef, {
      createdAt: serverTimestamp(),
      type: 'open',
      storeId: rid
    }, { merge:true })
  }
}

async function send(){
  const t = draft.value.trim()
  const rid = storeId.value
  if(!t || !rid) return
  try{
    await addDoc(collection(fbDb, 'rooms_open', rid, 'messages'), {
      text: t,
      authorUid: me.value?.uid || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    draft.value=''
    scrollBottom()
  }catch(e){
    console.error('메시지 전송 실패:', e)
    alert('전송 권한이 없습니다. 관리자에게 문의해주세요.')
  }
}

let unsubs = []
onMounted(async ()=>{
  // 1) 익명 로그인 (규칙이 request.auth 요구 시)
  try{
    if(!auth.currentUser) await signInAnonymously(auth)
  }catch(e){
    console.warn('익명 로그인 실패(규칙이 public read/write이면 무시 가능):', e)
  }

  // 2) 현재 사용자 캐시
  unsubs.push(onAuthStateChanged(auth, (u)=>{ me.value = u || null }))

  // 3) storeId 가드
  const rid = storeId.value
  if(!rid){
    console.warn('[ChatOpen] route.params.storeId 없음')
    return
  }

  // 4) 방 보장
  await ensureRoom(rid)

  // 5) 구독 (정상 경로에서만)
  const qRef = query(
    collection(fbDb, 'rooms_open', rid, 'messages'),
    orderBy('createdAt','asc')
  )
  unsubs.push(onSnapshot(qRef, (qs)=>{
    messages.value = qs.docs.map(d=>norm(d.id, d.data()))
    scrollBottom()
  }, (err)=>{
    console.error('구독 실패:', err)
  }))
})

onBeforeUnmount(()=> unsubs.forEach(u=>typeof u==='function' && u()))
</script>

<style scoped>
.chat-page{ display:flex; flex-direction:column; height:100vh; }
.cat-head{ display:flex; align-items:center; gap:8px; padding:10px; border-bottom:1px solid #eee; }
.spacer{ flex:1 }
.msg-box{ flex:1; overflow:auto; padding:10px; display:flex; flex-direction:column; gap:8px }
.msg{ max-width:78%; }
.msg.me{ align-self:flex-end; text-align:right }
.bubble{ display:inline-block; padding:8px 10px; border:1px solid #ddd; border-radius:10px; background:#fff }
.time{ font-size:11px; opacity:.6; margin-top:2px }
.composer{ display:flex; gap:6px; padding:8px; border-top:1px solid #eee }
.composer input{ flex:1; padding:10px; border:1px solid #ddd; border-radius:8px }
</style>
