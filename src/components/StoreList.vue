<template>
<section class="card shadow">
<header class="row" style="align-items:center;justify-content:space-between;margin-bottom:8px;">
<h3 style="margin:0">추천 매장</h3>
<a href="#" @click.prevent="more">더보기 ›</a>
</header>
<article v-for="s in stores" :key="s.id" class="row item">
<img :src="s.image" class="thumb" />
<div style="flex:1">
<div class="row" style="align-items:center;justify-content:space-between;">
<strong>{{ s.name }}</strong>
<span class="badge">★ {{ s.rating.toFixed(1) }}</span>
</div>
<div class="muted">{{ s.tags.join(' · ') }}</div>
</div>
<button class="btn">상세</button>
</article>
</section>
</template>
<script setup>
import { ref } from 'vue'
const stores=ref([
{ id:'1', name:'강남 라운지 A', rating:4.7, tags:['칵테일','단독룸','예약'], image:'https://placehold.co/84x84' },
{ id:'2', name:'역삼 바 B', rating:4.5, tags:['와인','감성','주차'], image:'https://placehold.co/84x84' },
{ id:'3', name:'논현 클럽 C', rating:4.3, tags:['댄스','단체'], image:'https://placehold.co/84x84' },
])
const more=()=>alert('추천 매장 목록 페이지로 이동')
</script>
<style scoped>
.item{align-items:center;padding:8px 0;border-top:1px solid var(--line)}
.item:first-of-type{border-top:0}
.thumb{width:64px;height:64px;border-radius:12px;object-fit:cover}
</style>