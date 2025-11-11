<template>
  <teleport to="body">
    <div class="modal" @keydown.esc="$emit('close')" tabindex="-1">
      <div class="dim" @click="$emit('close')"></div>

      <section class="sheet" role="dialog" aria-modal="true">
        <header class="sheet-head">
          <h3>업체게시판 생성</h3>
          <button class="icon close" @click="$emit('close')" aria-label="닫기">×</button>
        </header>

        <div class="sheet-body">
          <!-- 로고 -->
          <div class="field">
            <label>업체 로고
              <small>권장 96×96 PNG(라운드 스퀘어)</small>
            </label>
            <div class="logo-row">
              <div class="preview" :class="{empty: !form.logo}">
                <img v-if="form.logo" :src="form.logo" alt="미리보기" />
                <span v-else>Λ</span>
              </div>
              <div class="col">
                <input type="file" accept="image/*" @change="onFile" />
                <input v-model.trim="form.logo" placeholder="또는 이미지 URL 붙여넣기" />
              </div>
            </div>
          </div>

          <div class="field">
            <label>업체명</label>
            <input v-model.trim="form.name" placeholder="예) 바이올릿" />
          </div>

          <div class="grid">
            <div class="field">
              <label>지역</label>
              <select v-model="form.region">
                <option disabled value="">선택…</option>
                <option>강남</option>
                <option>서초</option>
                <option>홍대</option>
                <option>건대</option>
              </select>
            </div>
            <div class="field">
              <label>유형</label>
              <select v-model="form.type">
                <option disabled value="">선택…</option>
                <option>라운지</option>
                <option>클럽</option>
                <option>펍</option>
                <option>가라오케</option>
                <option>노래방</option>
                <option>바</option>
              </select>
            </div>
          </div>

          <div class="field">
            <label>업체 소개</label>
            <textarea v-model.trim="form.about" rows="3" placeholder="업체 특장점, 영업시간 등"></textarea>
          </div>

          <div class="field">
            <label>담당자 소개</label>
            <input v-model.trim="form.manager" placeholder="담당자 이름/연락 등" />
          </div>
        </div>

        <footer class="sheet-foot">
          <button class="btn" @click="$emit('close')">취소</button>
          <button class="btn primary" @click="save">저장</button>
        </footer>
      </section>
    </div>
  </teleport>
</template>

<script setup>
import { reactive } from 'vue'

const emit = defineEmits(['close', 'create'])

const form = reactive({
  logo: '',
  name: '',
  region: '',
  type: '',
  about: '',
  manager: '',
})

function onFile(e) {
  const f = e.target.files?.[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => (form.logo = String(reader.result))
  reader.readAsDataURL(f)
}

function save() {
  if (!form.name || !form.region || !form.type) {
    alert('업체명/지역/유형을 입력해 주세요.')
    return
  }
  emit('create', { ...form })
}
</script>

<style scoped>
/* 오버레이 전체 고정 + 최상단 */
.modal { position: fixed; inset: 0; z-index: 9999; }
.dim   { position: absolute; inset: 0; background: rgba(0,0,0,.45); backdrop-filter: blur(1px); }

/* 바텀시트 */
.sheet{
  position: absolute; left: 0; right: 0; bottom: 0;
  background: var(--bg, #fff);
  border-top-left-radius: 16px; border-top-right-radius: 16px;
  box-shadow: 0 -10px 30px rgba(0,0,0,.25);
  max-height: calc(100vh - 20px);
  display: flex; flex-direction: column;
  animation: rise .2s ease-out;
}
@keyframes rise { from { transform: translateY(10%); opacity: .8 } to { transform: translateY(0); opacity: 1 } }

.sheet-head{
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--line);
}
.sheet-head h3{ margin: 0; font-size: 18px; }

.icon.close{
  width: 32px; height: 32px; border-radius: 50%;
  border: 1px solid var(--line); background: var(--surface);
  font-size: 20px; line-height: 1;
}

.sheet-body{
  padding: 12px 16px;
  overflow: auto; /* 긴 폼 스크롤 */
}

/* 하단 버튼바: 항상 보이도록 sticky */
.sheet-foot{
  position: sticky; bottom: 0;
  display: flex; gap: 8px; justify-content: flex-end;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: var(--surface);
  border-top: 1px solid var(--line);
}

.btn{ border: 1px solid var(--line); background: var(--surface); border-radius: 12px; padding: 10px 14px; font-weight: 800; }
.btn.primary{ background: var(--accent); color: #fff; border-color: var(--accent); }

.field{ display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.field label{ font-weight: 800; color: var(--muted); }
.grid{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

input, select, textarea{
  border: 1px solid var(--line); background: var(--surface);
  border-radius: 12px; padding: 12px; font-size: 15px; outline: none;
}

.logo-row{ display: flex; gap: 12px; align-items: center; }
.preview{
  width: 64px; height: 64px; flex: 0 0 64px;
  border-radius: 14px; overflow: hidden;
  background: color-mix(in oklab, var(--muted), transparent 80%);
  display: flex; align-items: center; justify-content: center;
  font-weight: 900; color: #fff;
}
.preview img{ width: 100%; height: 100%; object-fit: cover; }
.preview.empty span{ opacity: .7; }
.col{ display: flex; flex-direction: column; gap: 6px; flex: 1; }
</style>
