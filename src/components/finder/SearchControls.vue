<template>
  <section class="search-wrap">
    <!-- 검색창 (높이 축소) -->
    <form class="search-box" @submit.prevent="emitSearch">
      <input
        v-model="model"
        class="q"
        type="search"
        :placeholder="placeholder"
        autocomplete="off"
      />
      <button class="glass" type="submit" aria-label="검색">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="11" cy="11" r="7"></circle>
          <path d="M21 21l-4.3-4.3"></path>
        </svg>
      </button>
    </form>

    <!-- HOT Top3 (배경 진한 핑크) -->
    <div class="hot3" v-if="hotRankTop3 && hotRankTop3.length">
      <button
        v-for="s in hotRankTop3"
        :key="s.id"
        class="pill"
        type="button"
        @click="$emit('apply-rank', s.name)"
      >
        {{ s.name }}
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  q:          { type: String, default: '' }, // v-model:q
  placeholder:{ type: String, default: '가게명을 입력해 보세요' },
  hotRankTop3:{ type: Array,  default: () => [] }
})
const emit = defineEmits(['update:q', 'search', 'apply-rank'])

const model = computed({
  get: () => props.q ?? props.modelValue,
  set: (v) => emit('update:q', v)
})
const emitSearch = () => emit('search')
</script>

<style scoped>
.search-wrap{ display:flex; flex-direction:column; gap:8px; margin:2px 0 8px }

/* ✅ 검색창 높이 축소 */
.search-box{
  position:relative; display:flex; align-items:center;
  border:1px solid var(--line); border-radius:14px; background:var(--surface);
  box-shadow:0 2px 8px var(--shadow); padding:0 10px;
  height:42px;               /* ← 기존보다 낮게 */
}
.q{
  flex:1; height:100%; border:0; background:transparent; color:var(--fg);
  font-size:14px; outline:none;
}
.glass{
  width:32px; height:32px; border-radius:999px; border:1px solid var(--line);
  background:var(--surface); display:grid; place-items:center; margin-left:6px;
}

/* ✅ HOT3: 진한 핑크 배경 */
.hot3{
  display:flex; gap:6px; flex-wrap:wrap; padding:8px; border-radius:12px;
  background:#ff2c8a;      /* Deep Pink */
  box-shadow:0 4px 12px rgba(255,44,138,.28);
}
.pill{
  height:28px; padding:0 10px; border-radius:999px; border:0;
  background:rgba(255,255,255,.95); color:#111; font-weight:900; font-size:12px;
}
</style>
