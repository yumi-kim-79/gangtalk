<template>
  <div class="toolbar" role="group" aria-label="보기 전환 및 새로고침">
    <button
      class="btn"
      :class="{ active: modelValue==='one' }"
      aria-label="한줄보기"
      title="한줄보기"
      @click="$emit('update:modelValue','one')"
    >
      <!-- — 아이콘 -->
      <svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 7h16M4 12h10M4 17h13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
    </button>

    <button
      class="btn"
      :class="{ active: modelValue==='two' }"
      aria-label="두칸보기"
      title="두칸보기"
      @click="$emit('update:modelValue','two')"
    >
      <!-- 4칸 그리드 -->
      <svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="currentColor"/></svg>
    </button>

    <button class="btn" aria-label="새로고침" title="새로고침" @click="$emit('refresh')">
      <!-- ⟲ -->
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v6h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
defineProps({ modelValue: { type:String, default:'one' } })
defineEmits(['update:modelValue','refresh'])
</script>

<style scoped>
.toolbar{ display:flex; gap:8px }
.btn{
  width:44px; height:44px;
  border-radius: 999px;
  border:1px solid var(--line);
  background: var(--surface);
  color: var(--fg);
  box-shadow: 0 8px 20px var(--shadow);
  display:flex; align-items:center; justify-content:center;
  transition: border-color .15s ease, background-color .15s ease, transform .06s ease;
}
.btn:hover{ border-color: color-mix(in oklab, var(--fg), transparent 70%); }
.btn:active{ transform: scale(.97) }
.btn.active{
  border-color: transparent;
  background: var(--accent);
  color:#fff;
}
</style>
