<!--
  src/AdminApp.vue
  gangtalk815.com (관리자 전용 빌드) 최상위 셸.
  라우터가 /admin/* → AdminLayout (children) 으로 매칭하고,
  로그인 화면(/login) 만 별도로 RouterView 에 직접 렌더링된다.
-->
<template>
  <RouterView />
</template>

<script setup>
import { RouterView } from 'vue-router'
</script>

<style>
/* 관리자 빌드 전역 보정: 배경/폰트 톤을 통일 */
html, body, #app {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #222;
  font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Pretendard',
    'Malgun Gothic', sans-serif;
  -webkit-font-smoothing: antialiased;
}
:root[data-theme='dark'] html,
:root[data-theme='dark'] body,
:root[data-theme='black'] html,
:root[data-theme='black'] body{
  background:#111;
  color:#eee;
}
</style>
