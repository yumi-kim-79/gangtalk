<!-- src/components/mypage/HeaderBar.vue -->
<template>
  <header class="mypage-header">
    <span class="member-pill" :data-type="type">{{ title }}</span>

    <div class="mh-actions">
      <button
        class="mh-icon-btn"
        type="button"
        title="프로필 수정"
        aria-label="프로필 수정"
        @click="$emit('edit')"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button class="mh-text-link" type="button" @click="$emit('logout')">로그아웃</button>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** 'user' | 'company' */
  type: { type: String, default: 'user' },
})
defineEmits(['edit', 'logout'])

const title = computed(() =>
  props.type === 'company' ? '기업회원' : '여성회원'
)
</script>

<style scoped>
.mypage-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:8px 4px 16px;
  width:100%;
}

/* 회원 유형 핑크 pill 뱃지 */
.member-pill{
  display:inline-flex;
  align-items:center;
  padding:6px 14px;
  border-radius:999px;
  background:linear-gradient(135deg, #ff6b9d, #ff4d8d);
  color:#fff;
  font-size:13px;
  font-weight:800;
  letter-spacing:-0.2px;
  box-shadow:0 2px 8px rgba(255,77,141,.25);
}
.member-pill[data-type="company"]{
  background:linear-gradient(135deg, #6c63ff, #4d6dff);
  box-shadow:0 2px 8px rgba(77,109,255,.25);
}

.mh-actions{
  display:flex;
  align-items:center;
  gap:8px;
}

/* 아이콘 버튼 (프로필 수정) */
.mh-icon-btn{
  width:36px; height:36px;
  border-radius:50%;
  border:1px solid #eee;
  background:#fff;
  display:grid; place-items:center;
  color:#666;
  cursor:pointer;
  transition:background .15s ease, color .15s ease, border-color .15s ease;
}
.mh-icon-btn:hover{
  background:#fff5f8;
  color:#ff4d8d;
  border-color:#ffd6e4;
}
.mh-icon-btn:active{ transform:scale(.96); }

/* 텍스트 링크 (로그아웃) */
.mh-text-link{
  background:transparent;
  border:none;
  padding:6px 4px;
  font-size:13px;
  font-weight:600;
  color:#999;
  cursor:pointer;
  text-decoration:none;
}
.mh-text-link:hover{
  color:#ff4d8d;
  text-decoration:underline;
}

/* 다크 보정 */
:root[data-theme="dark"] .mh-icon-btn,
:root[data-theme="black"] .mh-icon-btn{
  background:var(--surface, #1c1c1c);
  border-color:var(--line, #2a2a2a);
  color:#bbb;
}
</style>
