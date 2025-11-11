<template>
  <main class="container">
    <section class="maincol">
      <!-- 검색 -->
      <SearchBar @search="onSearch" />
      <!-- 필터(지역 + 칩) -->
      <RegionFilter />
    </section>
  </main>
</template>

<script setup>
import SearchBar from '../components/SearchBar.vue'
import RegionFilter from '../components/RegionFilter.vue'
import StatusCard from '@/components/StatusCard.vue'

const onSearch = (q)=>alert(`검색: ${q||''}`)
</script>

<style scoped>
.maincol{ display:flex; flex-direction:column; gap:12px; }
</style>
