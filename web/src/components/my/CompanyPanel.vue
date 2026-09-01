<template>
  <section class="card shadow">
    <h3>기업회원 센터</h3>

    <!-- 요약 통계 -->
    <div class="stats">
      <div class="stat"><b>{{ summary.jobs }}</b><span>진행중 공고</span></div>
      <div class="stat"><b>{{ summary.contacts }}</b><span>담당찾기 요청</span></div>
      <div class="stat"><b>{{ summary.messages }}</b><span>메시지</span></div>
    </div>

    <!-- 액션 타일 (유사앱 구성 느낌) -->
    <div class="grid">
      <button class="tile" @click="act('biz-profile')">비즈 프로필(담당찾기)</button>
      <button class="tile" @click="act('job-post')">채용공고</button>
      <button class="tile" @click="act('promo')">추천패키지</button>
      <button class="tile" @click="act('list-banner')">리스트 배너</button>
    </div>

    <!-- 채용 정보 카드 -->
    <div class="hr card-lite">
      <h4>채용 정보</h4>
      <div class="grid2">
        <div class="field">
          <label>지역</label>
          <select v-model="form.region">
            <option>강남</option><option>서초</option><option>홍대</option><option>건대</option>
          </select>
        </div>
        <div class="field">
          <label>직종</label>
          <select v-model="form.job">
            <option>라운지</option><option>클럽</option><option>펍</option><option>기타</option>
          </select>
        </div>
        <div class="field">
          <label>급여</label>
          <select v-model="form.pay">
            <option>시급</option><option>일급</option><option>월급</option>
          </select>
        </div>
        <div class="field">
          <label>연락처</label>
          <input v-model="form.phone" placeholder="예) 010-1234-5678" />
        </div>
      </div>
      <div class="field">
        <label>상세정보</label>
        <textarea v-model="form.desc" rows="3" placeholder="복지/스케줄/우대 등"></textarea>
      </div>
      <div class="row" style="gap:8px; justify-content:flex-end">
        <button class="btn" @click="reset">초기화</button>
        <button class="btn primary" @click="save">저장</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive } from 'vue'
const props = defineProps({ user: { type: Object, required: true } })

const summary = reactive({ jobs: 2, contacts: 3, messages: 5 })
const form = reactive({ region: '강남', job: '라운지', pay: '시급', phone: '', desc: '' })

function act(name){ alert(`[기업회원] ${name} 화면으로 이동 (연결 예정)`) }
function reset(){ form.region='강남'; form.job='라운지'; form.pay='시급'; form.phone=''; form.desc='' }
function save(){ alert('채용 정보 저장 (향후 Firestore/Server 연결)') }
</script>

<style scoped>
h3{ margin:0 0 12px 0 }
.stats{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:10px }
.stat{ border:1px solid var(--line); border-radius:12px; padding:10px; text-align:center; background:var(--surface) }
.stat b{ display:block; font-size:18px }
.grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px }
.tile{ border:1px solid var(--line); background:var(--surface); border-radius:12px; padding:14px; font-weight:800; text-align:center }
.card-lite{ border:1px dashed var(--line); border-radius:12px; padding:12px; background: color-mix(in oklab, var(--muted), transparent 92%); }
.grid2{ display:grid; grid-template-columns:1fr 1fr; gap:10px }
.field{ display:flex; flex-direction:column; gap:6px; margin-top:6px }
select, input, textarea{ border:1px solid var(--line); background:var(--surface); border-radius:10px; padding:10px }
.btn{ border:1px solid var(--line); background:var(--surface); border-radius:12px; padding:10px 14px; font-weight:800; }
.btn.primary{ background:var(--accent); color:#fff; border-color:var(--accent); }
</style>
