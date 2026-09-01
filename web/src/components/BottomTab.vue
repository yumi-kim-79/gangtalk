<template>
  <footer class="bottom-nav">
    <nav class="row nav">
      <!-- 메인 페이지( / )를 '현황판'으로 표시 -->
      <router-link to="/" class="tab" :class="{active:$route.path === '/'}">현황판</router-link>
      <router-link to="/chat" class="tab" :class="{active:$route.path.startsWith('/chat')}">강톡</router-link>
      <router-link to="/partners" class="tab" :class="{active:$route.path.startsWith('/partners')}">제휴관</router-link>
      <router-link to="/mypage" class="tab" :class="{active:$route.path.startsWith('/mypage')}">마이페이지</router-link>
    </nav>
  </footer>
</template>

<script setup></script>

<style scoped>
.bottom-nav{ position:fixed; left:0; right:0; bottom:0; z-index:50; background:transparent; }
.nav{
  justify-content:space-around; margin:0 10px 10px;
  border:1px solid var(--line); background:var(--surface);
  border-radius:16px; box-shadow:0 10px 24px var(--shadow);
}
.tab{ flex:1; text-align:center; padding:12px 0; font-weight:800; opacity:.85; }
.tab.active{ opacity:1; border-bottom:2px solid var(--fg); }
</style>
