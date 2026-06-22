<!--
  src/pages/BizSignupPage.vue
  업체 자가 회원가입 — 회원 빌드(gangtox.com/biz-signup), 공개 라우트, 로그인 불필요.
  진단: docs/audit/2026-06-22-biz-signup-회원빌드-이동-진단.md

  왜 회원 빌드?
    - sendSmsCode/verifySmsCode 는 enforceAppCheck: true 강제
    - admin 빌드(gangtalk815) 는 App Check 초기화 스킵 (firebase.js:115) → unauthenticated
    - 회원 빌드는 reCAPTCHA Enterprise 정상 → SMS 통과 (AuthPage 가 증거)
    → BizSignupPage 만 회원 빌드로 이동. 업체 관리/로그인은 gangtalk815.com 유지

  흐름:
    1. 이메일/비밀번호/전화 입력
    2. SMS 인증 (sendSmsCode → verifySmsCode, AuthPage 패턴 그대로)
    3. 업소 정보 입력 (출근업소 9 카테고리 / 지역 4 / 시급 등 — 이미지 제외)
    4. 제출:
       a. SMS 인증 완료 확인
       b. me.signupBiz() → _fbSignupBiz (store/user.js:1092) → Auth + users(type=company) + counters
       c. setDoc(stores/{newId}, { ...form, ownerId: 본인 uid, applyStatus:'pending', approved:false })
          - firestore.rules:111 `ownerId == auth.uid` 통과
       d. 성공 → me.signOut() (회원 빌드에 업체 세션 남기지 않음 — 도메인 분리 정책) →
          안내 패널 + "gangtalk815.com 로그인" 버튼 (외부 도메인 이동)
    5. 부분 실패: 계정 생성됐는데 stores 실패 → 재시도 버튼 (고아 stores 방지)

  보안:
    - pending → MainPage.isApproved 자동 미노출 (회원 화면 차단)
    - SMS 인증 통과 전엔 제출 비활성 (봇/스팸 방어)
    - 가입 후 자동 signOut → 회원 사이트(여성회원 영역) 에 업체 계정 머물지 않음

  하지 않음:
    - 이미지 업로드 (storage.rules 의 isStoreOwner 가 stores doc 존재 확인 — 승인 후 가능)
    - 룰 / Cloud Functions 변경
    - BizMyStorePage / BizAccountsPage / 기존 (A)(B) 흐름 건드림
    - 여성회원 로그인/가입 로직 건드림
-->
<template>
  <main class="biz-signup-shell">
    <section class="biz-signup-card">
      <div class="biz-signup-brand">
        <img src="/icons/icon-192.png" alt="강톡" class="biz-signup-logo" />
        <h1>업체 회원가입</h1>
        <p>가게 정보를 등록하면 관리자 승인 후 강남톡방 현황판에 노출됩니다.</p>
      </div>

      <form class="biz-signup-form" @submit.prevent="onSubmit" :aria-busy="submitting">
        <!-- ===== 1. 계정 정보 ===== -->
        <h2 class="biz-signup-section-title">계정 정보</h2>

        <label class="biz-field">
          <span>이메일 *</span>
          <input
            v-model.trim="form.email"
            type="email"
            autocomplete="email"
            required
            placeholder="biz@example.com"
            :disabled="submitting"
          />
        </label>

        <label class="biz-field">
          <span>비밀번호 * (6자 이상)</span>
          <input
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            required
            minlength="6"
            placeholder="비밀번호"
            :disabled="submitting"
          />
        </label>

        <!-- 전화 + SMS 인증 -->
        <label class="biz-field">
          <span>휴대폰 번호 *</span>
          <div class="biz-flex-row">
            <input
              v-model.trim="form.phone"
              type="tel"
              inputmode="tel"
              required
              placeholder="010-0000-0000"
              :disabled="submitting || smsVerified"
            />
            <button
              type="button"
              class="biz-btn biz-btn-ghost"
              @click="onSendSms"
              :disabled="sendingSms || smsVerified || submitting"
            >{{ sendingSms ? '발송중…' : (smsVerified ? '인증완료' : '인증번호 발송') }}</button>
          </div>
        </label>

        <div v-if="smsRequested && !smsVerified" class="biz-field">
          <span>인증번호</span>
          <div class="biz-flex-row">
            <input
              v-model.trim="smsCode"
              type="text"
              inputmode="numeric"
              maxlength="6"
              placeholder="6자리"
              :disabled="submitting"
            />
            <button
              type="button"
              class="biz-btn biz-btn-ghost"
              @click="onVerifySms"
              :disabled="verifyingSms || submitting"
            >{{ verifyingSms ? '확인중…' : '인증확인' }}</button>
          </div>
        </div>

        <p v-if="smsVerified" class="biz-notice biz-notice-success">✅ 휴대폰 인증 완료</p>

        <!-- ===== 2. 업소 정보 ===== -->
        <h2 class="biz-signup-section-title">업소 정보</h2>

        <label class="biz-field">
          <span>가게명 *</span>
          <input
            v-model.trim="form.storeName"
            type="text"
            required
            placeholder="가게 이름"
            :disabled="submitting"
          />
        </label>

        <label class="biz-field">
          <span>가게 전화번호 (선택)</span>
          <input
            v-model.trim="form.storePhone"
            type="tel"
            placeholder="010-0000-0000"
            :disabled="submitting"
          />
        </label>

        <div class="biz-field">
          <span>카테고리</span>
          <div class="biz-chip-grid">
            <button
              v-for="c in categoryOptions"
              :key="c.key"
              type="button"
              class="biz-chip"
              :class="{ on: form.category === c.key }"
              @click="form.category = c.key"
              :disabled="submitting"
            >{{ c.label }}</button>
          </div>
        </div>

        <div class="biz-field">
          <span>지역</span>
          <div class="biz-chip-grid">
            <button
              v-for="r in regionOptions"
              :key="r"
              type="button"
              class="biz-chip"
              :class="{ on: form.region === r }"
              @click="form.region = r"
              :disabled="submitting"
            >{{ r }}</button>
          </div>
        </div>

        <label class="biz-field">
          <span>한 줄 소개</span>
          <input
            v-model.trim="form.desc"
            type="text"
            maxlength="40"
            placeholder="가게 한 줄 소개 (16자 내외)"
            :disabled="submitting"
          />
        </label>

        <label class="biz-field">
          <span>상세 설명</span>
          <textarea
            v-model.trim="form.detailDesc"
            rows="3"
            placeholder="가게 상세 설명"
            :disabled="submitting"
          ></textarea>
        </label>

        <label class="biz-field">
          <span>주소</span>
          <input
            v-model.trim="form.address"
            type="text"
            placeholder="가게 주소"
            :disabled="submitting"
          />
        </label>

        <div class="biz-grid-2">
          <label class="biz-field">
            <span>영업시간</span>
            <input
              v-model.trim="form.hours"
              type="text"
              placeholder="예: 18:00 - 02:00"
              :disabled="submitting"
            />
          </label>
          <label class="biz-field">
            <span>휴무일</span>
            <input
              v-model.trim="form.closed"
              type="text"
              placeholder="예: 매주 일요일"
              :disabled="submitting"
            />
          </label>
        </div>

        <div class="biz-field">
          <span>시급 / 일급 / 월급</span>
          <div class="biz-chip-grid">
            <button
              v-for="w in wageTypeOptions"
              :key="w.key"
              type="button"
              class="biz-chip"
              :class="{ on: form.wageType === w.key }"
              @click="form.wageType = w.key"
              :disabled="submitting"
            >{{ w.label }}</button>
          </div>
        </div>

        <label class="biz-field">
          <span>금액 (원)</span>
          <input
            :value="wageDisplay"
            @input="onWageInput"
            type="text"
            inputmode="numeric"
            placeholder="예: 15000"
            :disabled="submitting"
          />
        </label>

        <p class="biz-notice">
          💡 대표 이미지는 가입 + 관리자 승인 후 <strong>업체 정보 수정 화면</strong>에서 업로드할 수 있습니다.
        </p>

        <!-- ===== 제출 ===== -->
        <button
          type="submit"
          class="biz-submit-btn"
          :disabled="submitting || !smsVerified"
        >{{ submitting ? '등록 중…' : '회원가입 + 업소 등록 신청' }}</button>

        <p v-if="!smsVerified" class="biz-notice biz-notice-warning">
          ⚠️ 휴대폰 인증을 완료해야 제출할 수 있습니다.
        </p>

        <p v-if="errorMsg" class="biz-error">{{ errorMsg }}</p>

        <!-- 부분 실패 — 재시도 -->
        <div v-if="retryStoreCreate" class="biz-retry-panel">
          <p>⚠️ 계정은 생성됐지만 업소 등록에 실패했습니다.</p>
          <p>{{ retryStoreCreate.message }}</p>
          <button
            type="button"
            class="biz-btn biz-btn-primary"
            @click="onRetryStoreCreate"
            :disabled="submitting"
          >🔁 업소 등록 다시 시도</button>
        </div>
      </form>

      <!-- 가입 성공 안내 -->
      <div v-if="successPanel" class="biz-success-panel">
        <h3>✅ 등록 신청 완료</h3>
        <p>관리자 승인 후 강남톡방 현황판에 노출됩니다.</p>
        <p>승인 전에도 <strong>업체 정보 수정</strong> 화면에서 정보 변경이 가능합니다.</p>
        <p class="biz-success-domain-note">
          업체 관리 / 로그인은 <strong>gangtalk815.com</strong> 에서 진행됩니다.
        </p>
        <a
          class="biz-btn biz-btn-primary"
          :href="ADMIN_LOGIN_URL"
        >gangtalk815.com 로그인 페이지로 이동 →</a>
      </div>

      <p class="biz-signup-foot">
        이미 계정이 있나요?
        <a :href="ADMIN_LOGIN_URL">gangtalk815.com 로그인</a>
      </p>
    </section>
  </main>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { getAuth } from 'firebase/auth'
import {
  collection, doc, setDoc, serverTimestamp,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db as fbDb } from '@/firebase'
import { me } from '@/store/user'

// 회원 빌드(gangtox.com) 에서 가입 후 안내할 admin 도메인 로그인 URL.
// 도메인 분리 정책: 가입은 공개 도메인(gangtox), 운영/로그인은 분리 도메인(gangtalk815).
const ADMIN_LOGIN_URL = 'https://gangtalk815.com/biz/login'

/* ===== 카테고리 / 지역 / 시급 옵션 — 출근업소 9키 (BizMyStorePage 와 동일) ===== */
const categoryOptions = [
  { key: 'hopper',  label: '하퍼' },
  { key: 'point5',  label: '쩜오' },
  { key: 'ten',     label: '텐카페' },
  { key: 'tenpro',  label: '텐프로' },
  { key: 'onep',    label: '1%' },
  { key: 'nrb',     label: '노래방' },
  { key: 'kara',    label: '가라오케' },
  { key: 'bar',     label: '바' },
  { key: 'etc',     label: '기타' },
]
const regionOptions = ['강남', '비강남', '경기', '인천']
const wageTypeOptions = [
  { key: 'hourly',  label: '시급' },
  { key: 'daily',   label: '일급' },
  { key: 'monthly', label: '월급' },
  { key: 'etc',     label: '기타' },
]

/* ===== 폼 상태 ===== */
const form = reactive({
  email: '',
  password: '',
  phone: '',
  storeName: '',
  storePhone: '',
  category: 'hopper',
  region: '강남',
  desc: '',
  detailDesc: '',
  address: '',
  hours: '',
  closed: '',
  wage: 0,
  wageType: 'hourly',
})

const wageDisplay = computed(() => {
  const n = Number(form.wage || 0)
  return n ? String(n) : ''
})
function onWageInput(e) {
  const digits = String(e.target.value || '').replace(/[^\d]/g, '')
  form.wage = digits ? Number(digits) : 0
}

/* ===== SMS 인증 (AuthPage 패턴 그대로) ===== */
const fns = getFunctions(undefined, 'asia-northeast3')
const fnSendSmsCode   = httpsCallable(fns, 'sendSmsCode')
const fnVerifySmsCode = httpsCallable(fns, 'verifySmsCode')

const sendingSms   = ref(false)
const verifyingSms = ref(false)
const smsRequested = ref(false)
const smsCode      = ref('')
const smsVerified  = ref(false)

async function onSendSms() {
  if (sendingSms.value) return
  const digits = form.phone.replace(/\D/g, '')
  if (!/^\d{10,11}$/.test(digits)) {
    alert('휴대폰 번호를 정확히 입력해 주세요.')
    return
  }
  sendingSms.value = true
  try {
    const res = await fnSendSmsCode({ phone: digits })
    if (res?.data?.ok) {
      smsRequested.value = true
      alert('인증번호가 전송되었습니다.')
    } else {
      alert('SMS 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    }
  } catch (e) {
    console.error('sendSmsCode error:', e)
    const code = e?.code || ''
    const detail = e?.details || e?.message || ''
    if (code === 'functions/resource-exhausted' || String(detail).includes('sms-balance-empty')) {
      alert('현재 문자 발송 포인트(잔액)가 부족하여 인증문자를 보낼 수 없습니다.\n관리자에게 문의해 주세요.')
      return
    }
    alert('문자 발송 중 오류가 발생했습니다.\n\n(' + (detail || code || 'unknown') + ')')
  } finally {
    sendingSms.value = false
  }
}

async function onVerifySms() {
  if (verifyingSms.value) return
  const digits = form.phone.replace(/\D/g, '')
  if (!smsCode.value.trim()) {
    alert('인증번호를 입력해주세요.')
    return
  }
  verifyingSms.value = true
  try {
    const res = await fnVerifySmsCode({
      phone: digits,
      code: smsCode.value.trim(),
    })
    const data = res?.data || {}
    if (data.ok) {
      smsVerified.value = true
      alert('인증 완료되었습니다.')
      return
    }
    let msg = '인증 실패: 인증번호를 다시 확인하세요.'
    switch (data.reason) {
      case 'no_request':
        msg = '해당 번호로 발송된 인증번호가 없습니다.\n먼저 "인증번호 발송" 버튼을 눌러 주세요.'
        break
      case 'expired':
        msg = '인증번호가 만료되었습니다. 다시 발송해 주세요.'
        break
      case 'mismatch':
        msg = '인증번호가 일치하지 않습니다.'
        break
    }
    alert(msg)
  } catch (e) {
    console.error('verifySmsCode error:', e)
    alert('인증 확인 중 오류가 발생했습니다.')
  } finally {
    verifyingSms.value = false
  }
}

/* ===== 제출 ===== */
const submitting   = ref(false)
const errorMsg     = ref('')
const successPanel = ref(false)
const retryStoreCreate = ref(null)   // { uid, message } — 부분 실패 시 재시도용

async function onSubmit() {
  if (submitting.value) return
  errorMsg.value = ''

  // 사전 검증
  if (!smsVerified.value) {
    errorMsg.value = '휴대폰 인증을 완료해 주세요.'
    return
  }
  if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) {
    errorMsg.value = '유효한 이메일을 입력해 주세요.'
    return
  }
  if (!form.password || form.password.length < 6) {
    errorMsg.value = '비밀번호는 6자 이상이어야 합니다.'
    return
  }
  if (!form.storeName) {
    errorMsg.value = '가게명을 입력해 주세요.'
    return
  }

  submitting.value = true

  // 1) Auth + users 생성 (me.signupBiz → _fbSignupBiz)
  //    - type='company', accountKind='storeOwner', company.name=storeName
  //    - me.auth 갱신 + counters userSeq +1
  try {
    await me.signupBiz({
      email: form.email,
      password: form.password,
      nick: form.storeName,                // company.name 으로도 들어가지만 명시
      phone: form.phone.replace(/\D/g, ''),
      storeName: form.storeName,
      businessNo: '',
      address: form.address,
      accountKind: 'storeOwner',
    })
  } catch (e) {
    submitting.value = false
    const code = String(e?.code || '')
    if (code.includes('email-already-in-use')) {
      errorMsg.value = '이미 가입된 이메일입니다. 로그인 페이지에서 로그인해 주세요.'
    } else if (code.includes('weak-password')) {
      errorMsg.value = '비밀번호가 너무 약합니다. 6자 이상의 안전한 비밀번호를 사용해 주세요.'
    } else if (code.includes('invalid-email')) {
      errorMsg.value = '이메일 형식이 올바르지 않습니다.'
    } else {
      errorMsg.value = '회원가입 실패: ' + (e?.message || code || e)
    }
    return
  }

  // 2) stores 생성 (본인 uid 로 — rules:111 통과)
  const auth = getAuth()
  const uid = auth.currentUser?.uid || ''
  const email = String(auth.currentUser?.email || '').toLowerCase()
  if (!uid) {
    submitting.value = false
    errorMsg.value = '인증 정보 없음. 로그인 후 업체 정보 수정 화면에서 업소 등록을 시도해 주세요.'
    return
  }

  await runCreateStore(uid, email)
}

async function runCreateStore(uid, email) {
  try {
    const newId = doc(collection(fbDb, 'stores')).id
    await setDoc(doc(fbDb, 'stores', newId), {
      name:       form.storeName,
      phone:      form.storePhone,
      category:   form.category,
      region:     form.region,
      desc:       form.desc,
      detailDesc: form.detailDesc,
      address:    form.address,
      hours:      form.hours,
      closed:     form.closed,
      wage:       Number(form.wage || 0),
      wageType:   form.wageType,
      thumb:      '',
      // 소유자 — rules:111 의 `ownerId == auth.uid` 통과
      ownerId:    uid,
      ownerEmail: email,
      // 승인 대기 상태 — MainPage.isApproved 자동 미노출
      applyStatus: 'pending',
      approved:    false,
      'exposure.gangtalk': false,
      thumbVer:   Date.now(),
      createdAt:  serverTimestamp(),
      updatedAt:  serverTimestamp(),
    })

    submitting.value = false
    retryStoreCreate.value = null
    successPanel.value = true

    // 회원 빌드(gangtox.com) 에 업체(type=company) 세션을 남기지 않음.
    // 도메인 분리 정책: 운영/로그인은 gangtalk815.com 에서.
    // Auth 가 도메인별 indexedDB 라 사용자는 어차피 admin 도메인에서 재로그인 필요.
    try { await me.signOut() } catch {}
  } catch (e) {
    submitting.value = false
    // 부분 실패 — Auth+users 는 살아있고 stores 만 실패
    retryStoreCreate.value = {
      uid,
      email,
      message: '업소 정보 저장에 실패했습니다 (' + (e?.message || e?.code || e) + '). ' +
               '"다시 시도" 버튼을 누르거나, 잠시 후 로그인하여 업체 정보 수정 화면에서 등록해 주세요.',
    }
  }
}

async function onRetryStoreCreate() {
  if (!retryStoreCreate.value) return
  submitting.value = true
  errorMsg.value = ''
  const { uid, email } = retryStoreCreate.value
  await runCreateStore(uid, email)
}
</script>

<style scoped>
.biz-signup-shell{
  min-height:100vh;
  display:flex; justify-content:center;
  background:#fafafa;
  padding:24px 12px;
}
.biz-signup-card{
  width:100%; max-width:560px;
  background:#fff;
  border-radius:16px;
  box-shadow:0 8px 24px rgba(0,0,0,.08);
  padding:28px 24px;
  display:flex; flex-direction:column;
  gap:14px;
}
.biz-signup-brand{
  text-align:center;
  margin-bottom:8px;
}
.biz-signup-logo{
  width:64px; height:64px; border-radius:14px;
  margin-bottom:10px;
}
.biz-signup-brand h1{
  margin:0 0 6px; font-size:22px; font-weight:900; color:#222;
}
.biz-signup-brand p{
  margin:0; font-size:13px; color:#666;
}

.biz-signup-section-title{
  margin:16px 0 8px;
  font-size:15px; font-weight:800; color:#333;
  padding-bottom:6px; border-bottom:1px dashed #eee;
}

.biz-signup-form{
  display:flex; flex-direction:column; gap:12px;
}

.biz-field{
  display:flex; flex-direction:column; gap:4px;
}
.biz-field span{
  font-size:12px; font-weight:700; color:#666;
}
.biz-field input,
.biz-field textarea{
  padding:10px 12px;
  border:1.5px solid #eee; border-radius:8px;
  font-size:14px; background:#fff;
  font-family:inherit;
}
.biz-field input{ height:40px; padding:0 12px; }
.biz-field input:focus,
.biz-field textarea:focus{
  outline:none; border-color:#ff2e7e;
}
.biz-field input:disabled,
.biz-field textarea:disabled{
  background:#f5f5f5; cursor:not-allowed;
}

.biz-flex-row{
  display:flex; gap:8px; align-items:center;
}
.biz-flex-row input{ flex:1; min-width:0; }

.biz-grid-2{
  display:grid; grid-template-columns:1fr 1fr; gap:10px;
}
@media (max-width:480px){ .biz-grid-2{ grid-template-columns:1fr; } }

.biz-chip-grid{
  display:flex; flex-wrap:wrap; gap:6px;
}
.biz-chip{
  min-height:36px; padding:0 12px;
  border:1.5px solid #eee; border-radius:8px;
  background:#fff; color:#333;
  font-size:13px; font-weight:600; font-family:inherit;
  cursor:pointer;
  transition:border-color .12s, background .12s, color .12s;
}
.biz-chip:hover:not(:disabled){ border-color:#ffd6e4; }
.biz-chip.on{ background:#ff2e7e; border-color:#ff2e7e; color:#fff; }
.biz-chip:disabled{ opacity:.6; cursor:not-allowed; }

.biz-btn{
  height:40px; padding:0 14px;
  border:1.5px solid #eee; background:#fafafa; color:#333;
  border-radius:8px; font-weight:700; font-size:13px;
  cursor:pointer; white-space:nowrap;
}
.biz-btn:disabled{ opacity:.6; cursor:not-allowed; }
.biz-btn-ghost{ background:#fff; }
.biz-btn-ghost:hover:not(:disabled){ background:#fff0f6; color:#ff2e7e; border-color:#ffd6e4; }
.biz-btn-primary{
  background:#ff2e7e; border-color:#ff2e7e; color:#fff;
}
.biz-btn-primary:hover:not(:disabled){ background:#e8276f; border-color:#e8276f; }

.biz-submit-btn{
  margin-top:8px;
  height:48px; padding:0 18px;
  background:#ff2e7e; border:none; border-radius:10px;
  color:#fff; font-size:15px; font-weight:800;
  cursor:pointer;
}
.biz-submit-btn:disabled{ background:#ccc; cursor:not-allowed; }

.biz-notice{
  font-size:12px; color:#666; margin:6px 0 0;
  padding:8px 10px;
  background:#fafafa; border-radius:6px;
}
.biz-notice-success{ background:#e9f7ef; color:#21c36b; font-weight:700; }
.biz-notice-warning{ background:#fff3e0; color:#f2a100; font-weight:700; }

.biz-error{
  margin:8px 0 0; padding:10px 12px;
  background:#fff5f5; border:1.5px solid #f3b0b0; border-radius:8px;
  color:#c0392b; font-size:13px; font-weight:700;
}

.biz-retry-panel{
  margin-top:10px; padding:12px 14px;
  background:#fff8e1; border:1.5px solid #ffe082; border-radius:8px;
}
.biz-retry-panel p{ margin:4px 0; font-size:13px; color:#7a5a00; }
.biz-retry-panel button{ margin-top:8px; width:100%; }

.biz-success-panel{
  margin-top:14px; padding:16px;
  background:#fff5f8; border:1.5px solid #ffd6e4; border-radius:10px;
  text-align:center;
}
.biz-success-panel h3{
  margin:0 0 8px; font-size:16px; font-weight:800; color:#ff2e7e;
}
.biz-success-panel p{
  margin:4px 0; font-size:13px; color:#444;
}
.biz-success-panel button,
.biz-success-panel a.biz-btn{
  margin-top:12px; width:100%;
  display:inline-flex; align-items:center; justify-content:center;
  text-decoration:none;
}
.biz-success-domain-note{
  margin-top:10px !important; padding:8px 10px;
  background:#fff; border:1px dashed #ffd6e4; border-radius:8px;
  font-size:12px !important; color:#666 !important;
}
.biz-success-domain-note strong{ color:#ff2e7e; }

.biz-signup-foot{
  text-align:center; font-size:13px; color:#666;
  margin:14px 0 0;
}
.biz-signup-foot a{ color:#ff2e7e; font-weight:700; text-decoration:none; }
.biz-signup-foot a:hover{ text-decoration:underline; }

/* 다크모드 보정 */
:root[data-theme="dark"] .biz-signup-shell,
:root[data-theme="black"] .biz-signup-shell{ background:#111; }
:root[data-theme="dark"] .biz-signup-card,
:root[data-theme="black"] .biz-signup-card{ background:#1c1c1c; color:#eee; }
:root[data-theme="dark"] .biz-signup-brand h1,
:root[data-theme="black"] .biz-signup-brand h1{ color:#eee; }
:root[data-theme="dark"] .biz-signup-section-title,
:root[data-theme="black"] .biz-signup-section-title{ color:#ddd; border-bottom-color:#2a2a2a; }
:root[data-theme="dark"] .biz-field input,
:root[data-theme="dark"] .biz-field textarea,
:root[data-theme="black"] .biz-field input,
:root[data-theme="black"] .biz-field textarea{ background:#222; border-color:#2a2a2a; color:#eee; }
:root[data-theme="dark"] .biz-chip,
:root[data-theme="black"] .biz-chip{ background:#222; border-color:#2a2a2a; color:#ddd; }
:root[data-theme="dark"] .biz-btn,
:root[data-theme="black"] .biz-btn{ background:#222; border-color:#2a2a2a; color:#ddd; }
:root[data-theme="dark"] .biz-notice,
:root[data-theme="black"] .biz-notice{ background:#222; color:#999; }
:root[data-theme="dark"] .biz-success-panel,
:root[data-theme="black"] .biz-success-panel{ background:#2a1620; border-color:#3a2030; }
:root[data-theme="dark"] .biz-success-panel p,
:root[data-theme="black"] .biz-success-panel p{ color:#ccc; }
</style>
