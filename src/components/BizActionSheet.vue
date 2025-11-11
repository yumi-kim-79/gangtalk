<!-- src/components/BizActionSheet.vue -->
<template>
  <div v-if="sheet.open" class="action-mask" @click.self="closeSheet">
    <section class="action-sheet" role="dialog" aria-modal="true">
      <header class="as-header">
        <strong>{{ sheet.store?.name }}</strong>
        <button class="as-close" aria-label="닫기" @click="closeSheet">✕</button>
      </header>

      <!-- 초톡 -->
      <div v-if="sheet.type==='invite'" class="as-body">
        <h4 class="as-title">초대톡 보기</h4>
        <ul class="list">
          <li v-for="(msg,i) in sheet.store?.invites || []" :key="i" class="li">
            <span class="dot">•</span><span>{{ msg }}</span>
          </li>
        </ul>
        <div class="as-actions">
          <button class="btn primary" @click="openBizChat(sheet.store)">초톡 열기</button>
          <button class="btn" @click="closeSheet">닫기</button>
        </div>
      </div>

      <!-- 담당 -->
      <div v-else-if="sheet.type==='manager'" class="as-body">
        <h4 class="as-title">담당자 연결</h4>
        <div class="kv"><span class="k">담당자</span><span class="v">{{ sheet.store?.manager || '미지정' }}</span></div>
        <div class="kv"><span class="k">연락처</span><span class="v"><a :href="`tel:${sheet.store?.phone}`">{{ sheet.store?.phone }}</a></span></div>
        <div class="kv" v-if="sheet.store?.talkId"><span class="k">연결톡</span><span class="v">@{{ sheet.store?.talkId }}</span></div>
        <div class="as-actions">
          <button class="btn primary" @click="openConnectTalk(sheet.store)">연결톡 열기</button>
          <button class="btn" @click="callPhone(sheet.store?.phone)">전화걸기</button>
          <button class="btn" @click="copyToClipboard(sheet.store?.phone)">번호복사</button>
        </div>
      </div>

      <!-- 이벤트 -->
      <div v-else-if="sheet.type==='event'" class="as-body">
        <h4 class="as-title">이벤트</h4>
        <ul class="list">
          <li v-for="(ev,i) in sheet.store?.events || []" :key="i" class="li">
            <span class="badge small">EVENT</span><span>{{ ev }}</span>
          </li>
        </ul>
        <div class="as-actions">
          <button class="btn primary" @click="openBizChat(sheet.store)">이벤트 문의</button>
          <button class="btn" @click="closeSheet">닫기</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
const props = defineProps({
  sheet: { type:Object, required:true },
  closeSheet: { type:Function, required:true },
  openBizChat: { type:Function, required:true },
  openConnectTalk: { type:Function, required:true },
  callPhone: { type:Function, required:true },
  copyToClipboard: { type:Function, required:true },
})
</script>

<style scoped>
.action-mask{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:grid; place-items:end center; z-index:9999; }
.action-sheet{
  width:100%; max-width:680px; background:var(--surface); color:var(--fg);
  border-top-left-radius:18px; border-top-right-radius:18px;
  box-shadow:0 -10px 30px rgba(0,0,0,.25); padding:12px 14px 14px; animation:slideUp .16s ease-out;
}
@keyframes slideUp{ from{ transform:translateY(16px); opacity:.7 } to{ transform:none; opacity:1 } }
.as-header{ display:flex; justify-content:space-between; align-items:center; padding:4px 2px 10px; border-bottom:1px solid var(--line) }
.as-close{ width:32px; height:32px; border-radius:999px; border:1px solid var(--line); background:var(--surface) }
.as-body{ padding:12px 2px 2px }
.as-title{ margin:0 0 10px; font-size:16px }
.kv{ display:flex; justify-content:space-between; gap:10px; padding:8px 0; border-bottom:1px dashed var(--line) }
.kv .k{ color:var(--muted) } .kv .v{ font-weight:700 }
.list{ display:flex; flex-direction:column; gap:8px; margin-bottom:10px } .li{ display:flex; gap:8px }
.dot{ color:var(--muted) } .badge.small{ font-size:11px; border:1px solid var(--line); border-radius:999px; padding:2px 6px; margin-right:6px; background:var(--surface) }
.as-actions{ display:flex; gap:8px; flex-wrap:wrap; padding:6px 0 2px }
.btn{ flex:1; min-width:120px; height:42px; border-radius:12px; border:1px solid var(--line); background:var(--surface); font-weight:800 }
.btn.primary{ background: color-mix(in oklab, var(--accent), white 85%); border-color: var(--accent) }
</style>
