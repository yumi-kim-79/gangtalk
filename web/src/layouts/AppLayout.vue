<template>
  <div class="app-layout">
    <slot name="header" />
    <router-view />
    <LeftConsultRibbon />
    <slot name="tabbar" />
  </div>
</template>

<script setup lang="ts">
import LeftConsultRibbon from '@/components/LeftConsultRibbon.vue'
</script>

<style scoped>
.app-layout {
  position: relative;
  min-height: 100dvh;
  background: #fff;
}
</style>
