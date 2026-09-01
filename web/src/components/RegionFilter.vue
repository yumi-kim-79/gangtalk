<template>
  <section class="rf">
    <!-- 지역 선택 -->
    <div class="row head">
      <strong class="ttl">지역</strong>
      <div class="select-wrap">
        <select v-model="selectedRegion" aria-label="지역 선택">
          <option v-for="r in regions" :key="r" :value="r">{{ r }}</option>
        </select>
        <span class="chev">▾</span>
      </div>
    </div>

    <!-- 1열 칩 -->
    <div class="chips">
      <button
        v-for="c in row1"
        :key="'r1-'+c"
        class="chip"
        :class="{ active: isActiveRow1(c) }"
        @click="toggleRow1(c)"
      >{{ c }}</button>
    </div>

    <!-- 2열 칩 (필요시 확장) -->
    <div v-if="row2.length" class="chips">
      <button
        v-for="k in row2"
        :key="'r2-'+k"
        class="chip"
        :class="{ active: isActiveRow2(k) }"
        @click="toggleRow2(k)"
      >{{ k }}</button>
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'

/* 지역 드롭다운 */
const regions = ['전체', '강남', '서초', '송파', '인천', '경기']
const selectedRegion = ref('전체')

/* 윗줄 칩 */
const row1 = ['전체', '하퍼', '쩜오', '텐카페', '1%' , '노래방', '가라오케', '바', '라운지']
const active1 = ref([])

/* 아랫줄 칩(종류) — 필요시 추가 */
const row2 = []
const active2 = ref([])

/* 전체 토글 공통 */
const toggleAll = (rowArr, activeArr) => {
  if (activeArr.value.length === rowArr.length - 1) activeArr.value = []
  else activeArr.value = rowArr.filter(x => x !== '전체')
}

/* 토글 */
const toggleRow1 = (label) => {
  if (label === '전체') return toggleAll(row1, active1)
  const i = active1.value.indexOf(label)
  if (i > -1) active1.value.splice(i, 1)
  else active1.value.push(label)
}
const toggleRow2 = (label) => {
  if (label === '전체') return toggleAll(row2, active2)
  const i = active2.value.indexOf(label)
  if (i > -1) active2.value.splice(i, 1)
  else active2.value.push(label)
}

/* '전체' 활성화 계산 */
const isActiveRow1 = (label) =>
  label === '전체'
    ? active1.value.length === row1.length - 1
    : active1.value.includes(label)
const isActiveRow2 = (label) =>
  label === '전체'
    ? active2.value.length === row2.length - 1
    : active2.value.includes(label)

/* 부모로 상태 알림(옵션) */
const emit = defineEmits(['update'])
watch([selectedRegion, active1, active2], () => {
  emit('update', {
    region: selectedRegion.value,
    tags1: [...active1.value],
    kinds: [...active2.value],
    allRow1: active1.value.length === row1.length - 1,
    allRow2: active2.value.length === row2.length - 1
  })
}, { deep: true })
</script>

<style scoped>
.rf{ padding: 8px 0; border-bottom:1px solid var(--line) }

/* 헤더 */
.head{ align-items:center; justify-content:flex-start; gap:12px }
.ttl{ font-size: var(--fs-lg); }

/* 커스텀 셀렉트 */
.select-wrap{
  position:relative;
  display:inline-flex;
  align-items:center;
}
select{
  appearance: none;
  border:1px solid var(--chip-border);
  background: var(--surface);
  color: var(--fg);
  border-radius: var(--rounded-sm);
  padding:8px 28px 8px 10px;
  font-size: var(--fs-md);
}
select:focus-visible{ outline: none; box-shadow: var(--ring-accent) }
.chev{
  position:absolute; right:8px; pointer-events:none; color:var(--muted);
}

/* 칩 */
.chips{
  display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;
}
.chip{
  color: var(--chip-fg);
  background: var(--chip-bg);
  border: 1px solid var(--chip-border);
  border-radius: var(--rounded-pill);
  padding: 8px 12px;
  font-weight: 700;
  font-size: var(--fs-md);
  transition: background-color .15s ease, border-color .15s ease, color .15s ease, transform .06s ease;
}
.chip:hover{ border-color: color-mix(in oklab, var(--fg), transparent 65%); }
.chip:active{ transform: scale(.98); }
.chip:focus-visible{ outline:none; box-shadow: var(--ring-accent); }

.chip.active{
  background: var(--chip-active-bg);
  color: var(--chip-active-fg);
  border-color: transparent;
}
</style>
