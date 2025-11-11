<!-- src/pages/ChatPage.vue -->
<template>
  <main class="container" style="padding-bottom:120px;">
    <section class="card shadow">
      <header style="font-weight:900; margin-bottom:8px;">채팅</header>
      <ul class="list">
        <li
          v-for="c in chats"
          :key="c.id"
          class="row item"
          role="button"
          tabindex="0"
          @click="go(c)"
          @keydown.enter.prevent="go(c)"
          @keydown.space.prevent="go(c)"
        >
          <img :src="c.avatar" class="avatar" alt="" />
          <div style="flex:1">
            <div class="row" style="justify-content:space-between;">
              <strong>{{ c.name }}</strong>
              <small class="muted">{{ c.time }}</small>
            </div>
            <div class="muted ellip1">{{ c.last }}</div>
          </div>
          <span v-if="c.unread" class="badge">{{ c.unread }}</span>
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 데모 데이터(실사용 시 roomId 필드 매핑 추천)
const chats = ref([
  { id: 'room-violet', name:'바이올릿', last:'오늘 예약 가능한가요?', time:'오전 10:21', unread:2, avatar:'https://placehold.co/48x48' },
  { id: 'room-lounge-a', name:'라운지 A', last:'안녕하세요 😀', time:'어제', unread:0, avatar:'https://placehold.co/48x48' },
  { id: 'room-club-c', name:'클럽 C', last:'이벤트룸 문의드려요', time:'월', unread:1, avatar:'https://placehold.co/48x48' },
])

function go(c){
  const roomId = String(c.roomId || c.id || '').trim()
  if (!roomId) return
  // ✅ 네임드 라우트 사용: path와 params 동시 사용 금지
  router.push({
    name: 'chatRoom',
    params: { roomId },
    query: { from: 'inbox', title: c.name, auto: '1' }
  })
}
</script>

<style scoped>
.list{ list-style:none; padding:0; margin:0; }
.item{ align-items:center; padding:10px 0; border-top:1px solid var(--line); cursor:pointer; }
.item:first-child{ border-top:0; }
.avatar{ width:48px; height:48px; border-radius:12px; object-fit:cover; margin-right:10px; }
.badge{ display:inline-block; min-width:22px; text-align:center; padding:2px 6px; border-radius:12px; background:var(--accent); color:#fff; font-size:12px; }
.ellip1{ display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
</style>
