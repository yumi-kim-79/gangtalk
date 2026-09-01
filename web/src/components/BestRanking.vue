<template>
  <section class="best">
    <header class="row">
      <h3>베스트글 TOP3</h3>
      <small class="muted">조회수 기준</small>
    </header>

    <ol class="rank">
      <li v-for="(p,i) in items" :key="p.id" class="card">
        <div class="medal">{{ medals[i] || (i+1) }}</div>
        <div class="cont">
          <div class="ttl ellip"><strong>{{ p.title }}</strong></div>
          <div class="sub muted ellip">{{ p.subtitle }}</div>
        </div>
        <div class="views">👁 {{ p.views }}</div>
      </li>
    </ol>
  </section>
</template>

<script setup>
defineProps({ items: { type:Array, default: () => [] }})
const medals = ['🥇','🥈','🥉']
</script>

<style scoped>
.best{ display:flex; flex-direction:column; gap:10px }
.row{ display:flex; align-items:center; justify-content:space-between }
.rank{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px }
.rank li{
  display:flex; align-items:center; gap:10px; padding:10px; border:1px solid var(--line);
  border-radius:14px; background:var(--surface); box-shadow:0 6px 18px var(--shadow);
}
.medal{ width:28px; text-align:center; font-size:20px }
.cont{ flex:1; min-width:0 }
.ttl{ font-size:15px }
.sub{ font-size:12px }
.views{ font-weight:800 }
.ellip{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
</style>
