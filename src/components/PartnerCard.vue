<template>
  <article class="card" @click="$emit('open', item)">
    <div class="left">
      <div class="thumb" :style="{backgroundImage:`url(${item.thumb})`}"></div>
    </div>
    <div class="right">
      <h4 class="name ellip">{{ item.name }}</h4>
      <div class="sub muted">{{ item.region }} · {{ mapCat[item.category] }}</div>
      <div class="tags">
        <span v-for="t in (item.tags || []).slice(0,3)" :key="t" class="tag">{{ t }}</span>
      </div>
    </div>
  </article>
</template>

<script setup>
const props = defineProps({
  item: { type:Object, required:true }
})
const mapCat = {
  salon:'미용실', nail:'네일', ps:'성형외과', real:'부동산',
  rental:'렌탈샵', fit:'피트니스', cafe:'카페', etc:'기타'
}
</script>

<style scoped>
.card{
  display:flex; gap:10px;
  border:1px solid var(--line); border-radius:16px; background:var(--surface);
  padding:10px; box-shadow:0 6px 18px var(--shadow);
}
.left{ width:100px; flex:0 0 100px }
.thumb{ width:100%; padding-top:75%; background-size:cover; background-position:center; border-radius:12px }
.right{ flex:1; min-width:0 }
.name{ margin:0 0 2px; font-size:16px }
.sub{ margin:0 0 6px }
.tags{ display:flex; gap:6px; flex-wrap:wrap }
.tag{ border:1px solid var(--line); border-radius:999px; padding:4px 8px; font-size:12px }
.ellip{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
</style>
