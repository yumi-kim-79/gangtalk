<!-- 예: src/components/common/BellButton.vue -->
<template>
  <button class="icon-btn" @click="goInbox" title="관리자 알림">
    <svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6V11a6 6 0 0 0-5-5.91V4a1 1 0 1 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1Z"/></svg>
    <span v-if="count>0" class="badge">N</span>
  </button>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { watchAdminBadge } from '@/lib/adminInbox'

const router = useRouter()
const count = ref(0)
let unsub = null

onMounted(() => {
  // 관리자 계정에서만 표시하고 싶다면, 상위에서 v-if="isAdmin" 로 감싸주세요.
  unsub = watchAdminBadge(n => { count.value = Number(n || 0) })
})
onBeforeUnmount(() => { try { unsub?.() } catch {} })

function goInbox() {
  // 마이페이지 신청목록으로 이동 + 앵커/쿼리
  router.push({ path: '/mypage', query: { tab: 'apps' } })
}
</script>

<style scoped>
.icon-btn{ position:relative; border:1px solid var(--line); background:var(--surface); border-radius:50%; width:36px; height:36px; display:grid; place-items:center; }
.badge{
  position:absolute; right:-4px; top:-4px;
  width:18px; height:18px; border-radius:999px;
  background:#ff2c8a; color:#fff; font-weight:900; font-size:11px;
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 0 0 2px var(--surface);
}
</style>
