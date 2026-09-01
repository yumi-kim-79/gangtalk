<template>
  <!-- 전환 애니메이션(100ms scale/fade) 추가 -->
  <TransitionGroup
    tag="section"
    class="grid"
    :class="layout"
    name="sw"
  >
    <StatusCard
      v-for="s in stores"
      :key="s.id"
      :logo="s.logo"
      :name="s.name"
      :region="s.region"
      :type="s.type"
      :matchRooms="s.match"
      :persons="s.persons"
      :status="s.status"
      :compact="layout === 'two'"
      @click="$emit('open', s)"
    />
  </TransitionGroup>
</template>

<script setup>
import StatusCard from './StatusCard.vue'

defineProps({
  layout: { type: String, default: 'one' }, // 'one' | 'two'
  stores: { type: Array, default: () => [] },
})
defineEmits(['open'])
</script>

<style scoped>
.grid{
  display:grid;
  gap:12px;
  align-content:start;
}
.grid.one{ grid-template-columns: 1fr; }
.grid.two{ grid-template-columns: repeat(2, minmax(0, 1fr)); } /* ✅ 2열 */

/* 리스트/그리드 전환 애니메이션 (100ms) */
.sw-enter-active, .sw-leave-active { transition: opacity .1s ease, transform .1s ease; }
.sw-enter-from,  .sw-leave-to      { opacity:0; transform: scale(.98); }
.sw-move { transition: transform .1s ease; } /* 위치 변화 시 부드럽게 */
</style>
