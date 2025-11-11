<template>
  <section class="card shadow">
    <h3>여성회원 메뉴</h3>

    <div class="grid">
      <button class="tile" @click="go('profile')">
        <span>프로필</span><small class="muted">사진/닉네임/설정</small>
      </button>
      <button class="tile" @click="go('booking')">
        <span>예약내역</span><small class="muted">지난/예정</small>
      </button>
      <button class="tile" @click="go('wish')">
        <span>찜 목록</span><small class="muted">관심 업소</small>
      </button>
      <button class="tile" @click="go('payments')">
        <span>결제내역</span><small class="muted">영수증</small>
      </button>
      <button class="tile" @click="go('my-posts')">
        <span>내 글/댓글</span><small class="muted">활동 기록</small>
      </button>
      <button class="tile" @click="go('settings')">
        <span>설정</span><small class="muted">알림/보안</small>
      </button>
    </div>

    <div class="benefit">
      <strong>추천 보상</strong>
      <p class="muted">친구가 회원가입 시 본인과 친구 모두 포인트가 적립됩니다. 베스트글 노출 가중치도 조금 올라가요.</p>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({ user: { type: Object, required: true } })
function go(where){ alert(`[여성회원] "${where}" 화면으로 이동 (연결 예정)`) }
</script>

<style scoped>
h3{ margin:0 0 10px 0 }
.grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px }
.tile{
  text-align:left; border:1px solid var(--line); background:var(--surface); border-radius:12px; padding:14px; font-weight:800;
}
.benefit{ margin-top:12px; padding:12px; background: color-mix(in oklab, var(--muted), transparent 90%); border-radius:12px; }
</style>
