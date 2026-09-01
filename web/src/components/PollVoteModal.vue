<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="sheet">
      <header class="row" style="justify-content:space-between;align-items:center;">
        <strong>투표하기</strong>
        <button class="icon" @click="$emit('close')">✕</button>
      </header>

      <div class="body">
        <h3 class="title">{{ item.title }}</h3>
        <p class="muted" style="margin-top:-4px">{{ item.subtitle }}</p>

        <div class="voteBox">
          <button class="voteBtn" @click="$emit('vote', 0)">
            {{ item.poll.options[0].text }} · {{ item.poll.options[0].votes }}
          </button>
          <button class="voteBtn" @click="$emit('vote', 1)">
            {{ item.poll.options[1].text }} · {{ item.poll.options[1].votes }}
          </button>
        </div>

        <small class="muted">총 {{ totalVotes }}표</small>
      </div>

      <footer class="row" style="justify-content:flex-end;">
        <button class="btn" @click="$emit('close')">닫기</button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  item: { type: Object, required: true },
})
const totalVotes = computed(() =>
  (props.item?.poll?.options || []).reduce((a, b) => a + (b.votes || 0), 0),
)
</script>

<style scoped>
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:flex-end;z-index:70}
.sheet{width:100%;background:var(--bg);border-radius:18px 18px 0 0;padding:16px}
.title{margin:0 0 6px 0}
.voteBox{display:flex;gap:8px;margin:12px 0}
.voteBtn{flex:1;border:1px solid var(--line);background:var(--surface);border-radius:12px;padding:14px;font-weight:900}
.btn{border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:10px 16px;font-weight:800}
.icon{width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--surface)}
.row{display:flex}
.muted{color:var(--muted)}
</style>
