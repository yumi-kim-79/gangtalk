<template>
  <div class="admin-bell" v-if="isAdmin && ready">
    <button class="btn-bell" type="button" title="관리자 알림" @click="goToInbox">
      <!-- 종 아이콘 -->
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      <!-- 빨간 N 배지 -->
      <span v-if="unreadCount>0" class="badge">N</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { auth as fbAuth, db as fbDb } from '@/firebase'
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp, limit, orderBy } from 'firebase/firestore'

const router = useRouter()

const isAdmin = ref(false)
const ready   = ref(false)
const unreadCount = ref(0)

let unsubAdmin = null
let unsubInbox = null

function watchAdmin(){
  if (unsubAdmin){ try{unsubAdmin()}catch{}; unsubAdmin=null }
  const u = fbAuth.currentUser?.uid
  if (!u){ isAdmin.value=false; ready.value=true; return }
  const ref = doc(fbDb,'admins',String(u))
  unsubAdmin = onSnapshot(ref, (snap)=>{
    isAdmin.value = snap.exists()
    ready.value = true
    if (isAdmin.value) watchInbox()
    else { unreadCount.value=0; if (unsubInbox){ try{unsubInbox()}catch{}; unsubInbox=null } }
  }, ()=>{ isAdmin.value=false; ready.value=true })
}

function watchInbox(){
  if (unsubInbox){ try{unsubInbox()}catch{}; unsubInbox=null }
  const qInbox = query(
    collection(fbDb,'adminInbox'),
    where('unread','==', true),
    orderBy('createdAt','desc'),
    limit(50)
  )
  unsubInbox = onSnapshot(qInbox, (snap)=>{ unreadCount.value = snap.size }, ()=>{ unreadCount.value = 0 })
}

async function markAllRead(){
  try{
    const qUnread = query(collection(fbDb,'adminInbox'), where('unread','==', true), limit(25))
    // onSnapshot 없이 1회성 – 최신 25건만 읽음 처리(더 필요하면 반복 처리 가능)
    const { getDocs } = await import('firebase/firestore')
    const s = await getDocs(qUnread)
    const ps = []
    s.forEach(d => ps.push(updateDoc(doc(fbDb,'adminInbox', d.id), { unread:false, readAt: serverTimestamp() })))
    await Promise.allSettled(ps)
  }catch(e){ /* 읽음 처리 실패는 무시 */ }
}

async function goToInbox(){
  await markAllRead()
  router.push({ path:'/mypage', query:{ view:'apps' } })
}

onMounted(()=>{ watchAdmin() })
onBeforeUnmount(()=>{ try{unsubAdmin?.()}catch{}; try{unsubInbox?.()}catch{} })
</script>

<style scoped>
.admin-bell{ position:relative; display:inline-flex; align-items:center; }
.btn-bell{
  position:relative;
  display:inline-flex; align-items:center; justify-content:center;
  width:36px; height:36px; border-radius:50%;
  border:1px solid var(--line); background:var(--surface); color:var(--fg);
}
.badge{
  position:absolute; top:-4px; right:-4px;
  display:inline-grid; place-items:center;
  width:18px; height:18px; border-radius:999px;
  background:#ff375f; color:#fff; font-weight:900; font-size:11px;
  box-shadow:0 0 0 2px var(--surface);
}
</style>
