<template>
  <div class="sheet">
    <div class="sheet-body">
      <header class="row" style="justify-content:space-between;align-items:center;">
        <h3 class="ttl">{{ headerTitle }}</h3>
        <button class="x" @click="$emit('close')">✕</button>
      </header>

      <div class="field">
        <label>채팅방 이름</label>
        <input v-model="title" type="text" placeholder="예) 금요일 번개" />
      </div>

      <!-- 투표게시판일 때 A/B 항목 -->
      <template v-if="isVote">
        <div class="field">
          <label>항목 A</label>
          <input v-model="a" type="text" placeholder="예) 클럽" />
        </div>
        <div class="field">
          <label>항목 B</label>
          <input v-model="b" type="text" placeholder="예) 라운지" />
        </div>
      </template>

      <!-- 일반 부제 -->
      <div class="field" v-else>
        <label>부제 / 설명</label>
        <input v-model="subtitle" type="text" placeholder="간단한 설명" />
      </div>

      <footer class="row" style="gap:8px; justify-content:flex-end;">
        <button class="btn ghost" @click="$emit('close')">취소</button>
        <button class="btn primary" @click="save">저장</button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  category: { type: String, default: '' }, // '다양한게시판' | '익명게시판' | '투표게시판'
})

const isVote = computed(() => props.category.includes('투표'))

const title = ref('')
const subtitle = ref('')
const a = ref('')
const b = ref('')

const headerTitle = computed(() => `${props.category} 생성`)

const emit = defineEmits(['close','create'])

const save = () => {
  if (!title.value.trim()) {
    alert('채팅방 이름을 입력해 주세요.')
    return
  }
  if (isVote.value) {
    if (!a.value.trim() || !b.value.trim()) {
      alert('투표 항목 A/B를 입력해 주세요.')
      return
    }
    emit('create', { title: title.value.trim(), a: a.value.trim(), b: b.value.trim() })
  } else {
    emit('create', { title: title.value.trim(), subtitle: subtitle.value.trim() })
  }
}
</script>

<style scoped>
.sheet{
  position:fixed; left:0; right:0; bottom:0; top:0;
  background:color-mix(in oklab, var(--bg), transparent 30%);
  display:flex; align-items:flex-end; z-index:50;
}
.sheet-body{
  width:100%;
  background:var(--surface);
  border-top-left-radius:18px; border-top-right-radius:18px;
  /* 모달 내부 스크롤 + 하단 네비/안전영역 만큼 여백 확보 */
  max-height:calc(100vh - 12px);
  overflow:auto;
  padding:16px 16px calc(16px + var(--bottom-nav-h,80px) + env(safe-area-inset-bottom));
  box-shadow:0 -12px 24px rgba(0,0,0,.18);
}

/* 닫기 버튼 */
.x{ width:36px; height:36px; border-radius:10px; border:1px solid var(--line); background:var(--surface); }
.ttl{ margin:0 }

/* 입력 필드 */
.field{ display:flex; flex-direction:column; gap:6px; margin:10px 0 }
.field input{
  border:1px solid var(--line); background:var(--surface); color:var(--fg);
  border-radius:12px; padding:12px;
}

/* 하단 버튼 영역을 Sticky 로 고정 */
.sheet-body footer{
  position:sticky;
  bottom:0;
  padding-top:12px;
  margin-top:12px;
  background:
    linear-gradient(180deg,
      color-mix(in oklab, var(--surface), transparent 40%) 0%,
      var(--surface) 40%);
  /* 상단 그림자 살짝 */
  box-shadow:0 -6px 12px var(--shadow);
}

.btn{ height:42px; border-radius:12px; padding:0 16px; border:1px solid var(--line) }
.btn.ghost{ background:var(--surface) }
.btn.primary{ background:var(--accent); color:#fff; border-color:transparent }
</style>

