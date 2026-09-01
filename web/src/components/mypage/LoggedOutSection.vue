<!-- src/components/mypage/LoggedOutSection.vue -->
<template>
  <section class="section center">
    <h2 class="title">마이페이지</h2>
    <p class="muted">로그인이 필요합니다.</p>
    <button class="btn primary" @click="$emit('auth')">로그인 / 회원가입</button>
  </section>
</template>

<script setup>
// emits: auth
</script>

<style scoped>
/* 화이트 테마에서 로그인 버튼(제출 버튼 역할) 색 고정 */
:root[data-theme="white"] .btn.primary {
  /* 진한 핑크 */
  background: #ff2c8a !important;
  border-color: #ff2c8a !important;
  color: #fff !important;
}

/* 비활성이어도 흐려지지 않게(필요 시) */
:root[data-theme="white"] .btn.primary[disabled]{
  opacity: 1 !important;
  filter: none !important;
}

/* 버튼 안 아이콘이 있다면 색 동기화 */
:root[data-theme="white"] .btn.primary svg{
  fill: currentColor !important;
  stroke: currentColor !important;
}
</style>
