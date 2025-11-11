<template>
  <button
    class="tool"
    :title="`내 주변 보기(${radiusKm}km)`"
    :aria-label="`내 주변 보기(${radiusKm}km)`"
    type="button"
    @click.stop.prevent="run"
    @touchstart.stop.prevent="run"
  >
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="10" r="3"></circle>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
      <path d="M7 10c0 5 5 12 5 12s5-7 5-12a5 5 0 1 0-10 0z"/>
    </svg>
  </button>
</template>

<script setup lang="ts">
import { useNearby } from '@/composables/useNearby'
import { useRouter } from 'vue-router'
import { toValue } from 'vue'

const props = defineProps<{
  radiusKm?: number
  // ref/computed/배열 모두 허용
  stores?: any
}>()

const router = useRouter()
const { openNearby } = useNearby()

async function run() {
  await openNearby({
    radiusKm: props.radiusKm ?? 10,
    stores: toValue(props.stores as any),
    router
  })
}
</script>

<style scoped>
.tool{
  width:32px; height:32px; border-radius:999px; border:1px solid var(--line); background:#fff;
  display:grid; place-items:center; box-shadow:0 4px 10px var(--shadow); color:#111;
}
</style>
