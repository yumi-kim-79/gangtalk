<template>
<section class="card shadow">
<div class="grid">
<article v-for="t in tiles" :key="t.label" class="tile" @click="go(t)">
<div class="icon">{{ t.icon }}</div>
<div class="label">{{ t.label }}</div>
<div class="sub" v-if="t.sub">{{ t.sub }}</div>
</article>
</div>
</section>
</template>
<script setup>
const tiles=[
{ icon:'🍱', label:'유메뉴', sub:'오늘의 추천' },
{ icon:'🎯', label:'1차 맞춤형' },
{ icon:'👥', label:'20명 단체' },
{ icon:'🎉', label:'이벤트룸' },
]
const go=(t)=>alert(`${t.label} 준비중`)
</script>
<style scoped>
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.tile{border:1px solid var(--line);border-radius:16px;padding:14px;text-align:center;background:var(--surface)}
.icon{font-size:22px}
.label{font-weight:800;margin-top:6px}
.sub{font-size:12px;color:var(--muted)}
@media (max-width:720px){.grid{grid-template-columns:repeat(2,1fr)}}
</style>