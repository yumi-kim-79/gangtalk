<template>
<main class="container" style="padding-bottom:84px;">
<section class="card shadow">
<h2 style="margin:0 0 10px">현황판</h2>
<div class="row" style="justify-content:space-between;">
<div class="kpi"><div class="num">3</div><div class="lab">신규 제휴</div></div>
<div class="kpi"><div class="num">120</div><div class="lab">활성 사용자</div></div>
<div class="kpi"><div class="num">45</div><div class="lab">채팅방</div></div>
</div>
<ul style="list-style:none;padding-left:0;margin-top:12px;">
<li v-for="(t,i) in feed" :key="i" style="padding:6px 0;border-top:1px solid var(--line)">{{ t }}</li>
</ul>
</section>
</main>
</template>
<script setup>
const feed=['오늘 생일인 회원 21명 🎂','금일 신규 제휴 3건 등록','활성 채팅방 45개 운영 중']
</script>
<style scoped>
.kpi{text-align:center;flex:1}.num{font-weight:900;font-size:26px}.lab{font-size:12px;color:var(--muted)}
</style>