<template>
<aside class="rail">
<div class="card shadow banner" v-for="b in banners" :key="b.id" @click="go(b.link)">
<img :src="b.image" alt="banner"/>
</div>
<section class="card shadow">
<h4 style="margin:0 0 8px">추천 키워드</h4>
<div class="row wrap">
<a v-for="k in keywords" :key="k" href="#" class="chip" @click.prevent="search(k)">{{ k }}</a>
</div>
</section>
</aside>
</template>
<script setup>
import { ref } from 'vue'
const banners=ref([
{ id:'b1', image:'https://placehold.co/280x120?text=banner1', link:'#' },
{ id:'b2', image:'https://placehold.co/280x120?text=banner2', link:'#' },
{ id:'b3', image:'https://placehold.co/280x120?text=banner3', link:'#' },
])
const keywords=['친목술','칵테일','라운지','단체석','감성','데이트','프라이빗','생일파티']
const go=(url)=>{ if(url) window.open(url,'_blank') }
const search=(k)=>alert(`${k} 검색`)
</script>
<style scoped>
.rail{display:flex;flex-direction:column;gap:12px}
.banner img{width:100%;height:auto;border-radius:12px}
.wrap{flex-wrap:wrap}
</style>