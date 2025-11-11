<template>
<section class="card shadow">
<div class="grid">
<article v-for="t in tiles" :key="t.label" class="tile" @click="go(t)">
<div class="label">{{ t.label }}</div>
<div class="sub" v-if="t.sub">{{ t.sub }}</div>
</article>
</div>
</section>
</template>
<script setup>
const tiles=[
{ label:'단독', sub:'프라이빗' },
{ label:'12번', sub:'맞춤형' },
{ label:'19번', sub:'맞춤형' },
{ label:'속 좋은', sub:'리뷰 TOP' },
{ label:'족톡의', sub:'추천' },
{ label:'당당상', sub:'인기' },
{ label:'채팅' },
{ label:'이벤트/할인' },
]
const go=(t)=>alert(`${t.label} 준비중`)
</script>
<style scoped>
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.tile{border:1px dashed var(--line);border-radius:16px;padding:16px;text-align:center;background:var(--surface)}
.label{font-weight:900}
.sub{font-size:12px;color:var(--muted)}
@media (max-width:720px){.grid{grid-template-columns:repeat(2,1fr)}}
</style>