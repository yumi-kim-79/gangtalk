<template>
  <form class="gt-search" role="search" @submit.prevent="$emit('search')">
    <input
      class="gt-search__input"
      type="search"
      :placeholder="placeholder"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      @keyup.enter="$emit('search')"
      autocomplete="off"
      spellcheck="false"
      aria-label="검색어"
    />
    <button class="gt-search__btn" type="submit" aria-label="검색">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="11" cy="11" r="7"/>
        <path d="M21 21l-4.3-4.3"/>
      </svg>
    </button>
  </form>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '업체명을 입력해 보세요' } // 통일 문구
})
defineEmits(['update:modelValue', 'search'])
</script>

<style scoped>
/* ■ 단일 규격: 여기만 고치면 전 화면 동일해짐 */
:host,
.gt-search { --h: 32px; --r: 14px; --padX: 6px; --btn: 24px; }

/* 컨테이너 */
.gt-search{
  position:relative;
  display:block;
  height:var(--h);
  border:1px solid var(--line);
  border-radius:var(--r);
  padding:2px var(--padX);
  background:var(--surface);
  box-shadow:0 4px 12px var(--shadow);
  box-sizing:border-box;
}

/* 입력 */
.gt-search__input{
  width:100%;
  height:calc(var(--h) - 4px);
  border:0; outline:0;
  background:transparent;
  color:var(--fg);
  font-size:14px; font-weight:800;
  padding:0 calc(var(--btn) + 8px) 0 8px;
  box-sizing:border-box;
}
.gt-search__input::placeholder{ color:var(--muted) }

/* 버튼 */
.gt-search__btn{
  position:absolute; right:6px; top:50%;
  width:var(--btn); height:var(--btn);
  transform:translateY(-50%);
  border-radius:999px;
  border:1px solid var(--line);
  background:var(--surface);
  color:var(--fg);
  display:grid; place-items:center;
  line-height:0;
}

/* 안전: 내부 박스 모델 고정 */
*, *::before, *::after{ box-sizing:border-box; }

/* 크기 옵션이 필요하면 host 클래스만 바꿔도 됨
:host(.lg){ --h: 36px; --btn: 26px; --r: 16px; }
*/
</style>
