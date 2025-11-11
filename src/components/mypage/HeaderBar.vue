<template>
  <header class="mypage-header">
    <div class="left">
      <!-- ✅ 전달받은 type만 신뢰 -->
      <h2>{{ title }}</h2>
    </div>
    <div class="right">
      <button class="btn" type="button" @click="$emit('edit')">프로필 수정</button>
      <button class="btn" type="button" @click="$emit('logout')">로그아웃</button>
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

const title = computed(() => (props.type === 'company' ? '기업회원' : '여성회원'))
</script>

<style scoped>
.mypage-header{
  display:flex; justify-content:space-between; align-items:center;
  padding:8px 4px;
}
h2{ font-size:18px; font-weight:800; }
.btn{
  height:36px; padding:0 12px; border-radius:10px;
  border:1px solid var(--line); background:var(--surface);
}
.btn + .btn{ margin-left:8px }
</style>
