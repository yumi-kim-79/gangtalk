<!-- ============================================================
     src/pages/AuthPage.vue
     회원유형 3종(여성/기업/관리자)
     이메일·닉네임 중복확인 + 문자 인증 포함
=============================================================== -->
<template>
  <main class="wrap auth-page">
    <section class="card shadow box">
      <header class="head">
        <h2>로그인 / 회원가입</h2>
        <div class="mode">
          <button
            class="btn sm"
            :class="{ on: action === 'login' }"
            type="button"
            @click="action = 'login'"
          >
            로그인
          </button>
          <button
            class="btn sm"
            :class="{ on: action === 'signup' }"
            type="button"
            @click="action = 'signup'"
          >
            회원가입
          </button>
        </div>
      </header>

      <!-- 회원 유형 탭 -->
      <div class="tabs">
        <button
          class="tab"
          :class="{ active: who === 'user' }"
          type="button"
          @click="who = 'user'"
        >
          여성회원
        </button>

        <button
          class="tab"
          :class="{ active: who === 'biz' }"
          type="button"
          @click="who = 'biz'"
        >
          기업회원(가게찾기)
        </button>

        <button
          class="tab"
          :class="{ active: who === 'admin' }"
          type="button"
          @click="who = 'admin'"
        >
          관리자회원(제휴관)
        </button>
      </div>

      <!-- ===========================
           로그인 Form
      ============================== -->
      <form
        v-if="action === 'login'"
        class="form"
        @submit.prevent="onLogin"
        :aria-busy="pendingLogin"
      >
        <label>이메일</label>
        <div class="flex-row">
          <input
            class="auth-input"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            required
            autocomplete="email"
          />
        </div>

        <label>비밀번호</label>
        <div class="flex-row">
          <input
            class="auth-input"
            v-model="password"
            type="password"
            placeholder="8자 이상"
            minlength="8"
            required
            autocomplete="current-password"
          />
        </div>

        <button class="btn primary xl" type="submit" :disabled="pendingLogin">
          {{ pendingLogin ? '로그인 중…' : '로그인' }}
        </button>
      </form>

      <!-- ===========================
           회원가입 Form
      ============================== -->
      <form
        v-else
        class="form"
        @submit.prevent="onSignup"
        :aria-busy="pendingSignup"
      >
        <!-- 닉네임 (모든 회원 유형에서 사용) -->
        <label>닉네임</label>
        <div class="flex-row">
          <input
            class="auth-input"
            v-model="nick"
            placeholder="표시될 이름 (한글,영어 가능)"
            required
          />
          <button
            type="button"
            class="btn sm ghost"
            @click="checkNickDuplicate"
            :disabled="nickChecking"
          >
            {{ nickChecking ? '확인중…' : '중복확인' }}
          </button>
        </div>

        <!-- 이메일 + 중복확인 -->
        <label>이메일</label>
        <div class="flex-row">
          <input
            class="auth-input"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            required
          />
          <button
            type="button"
            class="btn sm ghost"
            @click="checkEmailDuplicate"
            :disabled="emailChecking"
          >
            {{ emailChecking ? '확인중…' : '중복확인' }}
          </button>
        </div>

        <!-- 비밀번호/비밀번호 확인 -->
        <label>비밀번호</label>
        <div class="flex-row">
          <input
            class="auth-input"
            v-model="password"
            type="password"
            minlength="8"
            required
            placeholder="8자 이상"
          />
        </div>

        <label>비밀번호 확인</label>
        <div class="flex-row">
          <input
            class="auth-input"
            v-model="passwordConfirm"
            type="password"
            minlength="8"
            required
            placeholder="비밀번호 확인"
          />
        </div>

        <!-- 연락처 + 문자 인증 -->
        <label>연락처</label>
        <div class="flex-row">
          <input
            class="auth-input"
            v-model="phone"
            placeholder="010-0000-0000"
            inputmode="tel"
            required
          />
          <button
            type="button"
            class="btn sm ghost"
            @click="sendSmsCode"
            :disabled="sendingSms"
          >
            {{ sendingSms ? '발송중…' : '인증번호 발송' }}
          </button>
        </div>

        <label v-if="smsRequested">인증번호 입력</label>
        <div v-if="smsRequested" class="flex-row">
          <input
            class="auth-input"
            v-model="smsCode"
            placeholder="6자리"
            inputmode="numeric"
          />
          <button
            type="button"
            class="btn sm ghost"
            @click="verifySmsCode"
            :disabled="verifyingSms"
          >
            {{ verifyingSms ? '확인중…' : '인증확인' }}
          </button>
        </div>

        <!-- 추천인 코드 -->
        <label>추천인 코드 (선택)</label>
        <div class="flex-row">
          <input
            class="auth-input"
            v-model="refCode"
            placeholder="예: A00001"
          />
        </div>

        <!-- 기업회원 / 관리자회원(제휴관) 공통 업체 필드 -->
        <template v-if="who === 'biz' || who === 'admin'">
          <label>업체명</label>
          <div class="flex-row">
            <input
              class="auth-input"
              v-model="storeName"
              placeholder="예) 라운지 G / 제휴관 이름"
              required
            />
          </div>

          <label>사업자등록번호 (선택)</label>
          <div class="flex-row">
            <input
              class="auth-input"
              v-model="businessNo"
              placeholder="10자리"
            />
          </div>

          <label>주소 (선택)</label>
          <div class="flex-row">
            <input
              class="auth-input"
              v-model="address"
              placeholder="사업장 주소"
            />
          </div>
        </template>

        <button class="btn primary xl" type="submit" :disabled="pendingSignup">
          {{ pendingSignup ? '가입 처리 중…' : '회원가입' }}
        </button>
      </form>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { me } from '@/store/user.js'
import { humanizeAuthError } from '../utils/authErrors.js'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { checkEmailAvailable, checkNicknameAvailable } from '@/services/authService'

/* ---------------------------------------------------------
   문자 인증 함수 (Cloud Functions)
--------------------------------------------------------- */

const fns = getFunctions(undefined, 'asia-northeast3')

const fnSendSmsCode   = httpsCallable(fns, 'sendSmsCode')
const fnVerifySmsCode = httpsCallable(fns, 'verifySmsCode')

// 중복확인 Cloud Functions (폴백용)
const fnCheckEmail = httpsCallable(fns, 'checkEmailDuplicate')
const fnCheckNick  = httpsCallable(fns, 'checkNicknameDuplicate')

/* ---------------------------------------------------------
   기본 설정
--------------------------------------------------------- */
const router = useRouter()
const route = useRoute()

/* 모드/회원유형 */
const action = ref(route.query.mode === 'signup' ? 'signup' : 'login')
const who = ref(
  ['user', 'biz', 'admin'].includes(route.query.who) ? route.query.who : 'user'
)

/* 입력 필드 */
const nick = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const refCode = ref('')
const phone = ref('')

/* 기업/관리자 공통 추가 데이터 */
const storeName = ref('')
const businessNo = ref('')
const address = ref('')

/* 인증 관련 */
const pendingLogin = ref(false)
const pendingSignup = ref(false)

/* ===== 문자 인증 ===== */
const sendingSms = ref(false)
const verifyingSms = ref(false)
const smsRequested = ref(false)
const smsCode = ref('')
const smsVerified = ref(false)

async function sendSmsCode() {
  if (sendingSms.value) return

  const digits = phone.value.replace(/\D/g, '')
  if (!/^\d{10,11}$/.test(digits)) {
    alert('휴대폰 번호를 정확히 입력해 주세요.')
    return
  }

  try {
    sendingSms.value = true
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

    alert('문자 발송 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.\n\n(' + (detail || code || 'unknown') + ')')
  } finally {
    sendingSms.value = false
  }
}

async function verifySmsCode() {
  if (verifyingSms.value) return

  const digits = phone.value.replace(/\D/g, '')
  if (!smsCode.value.trim()) {
    alert('인증번호를 입력해주세요.')
    return
  }

  try {
    verifyingSms.value = true

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

    // ✅ 서버에서 내려준 실패 사유에 따라 메시지 분리
    let msg = '인증 실패: 인증번호를 다시 확인하세요.'
    switch (data.reason) {
      case 'no_request':
        msg = '해당 번호로 발송된 인증번호가 없습니다.\n먼저 "인증번호 발송" 버튼을 눌러 주세요.'
        break
      case 'wrong_code':
        msg = '인증번호가 일치하지 않습니다.\n문자에 도착한 번호를 다시 확인해 주세요.'
        break
      case 'expired':
        msg = '인증번호 입력 가능 시간이 지났습니다.\n다시 "인증번호 발송"부터 진행해 주세요.'
        break
      default:
        // 그 외에는 기본 메시지 유지
        break
    }
    alert(msg)
  } catch (e) {
    console.error('verifySmsCode error:', e)
    const code = e?.code || e?.details?.code || 'INTERNAL'
    const msg = e?.message || e?.details?.message || ''
    alert(`인증 오류가 발생했습니다.\n\n코드: ${code}\n${msg}`)
  } finally {
    verifyingSms.value = false
  }
}

/* ---------------------------------------------------------
   이메일/닉네임 중복 확인
--------------------------------------------------------- */

const emailChecking = ref(false)
const nickChecking = ref(false)

async function checkEmailDuplicate() {
  const v = email.value.trim()
  if (!v) {
    alert('이메일을 입력해 주세요.')
    return
  }

  try {
    emailChecking.value = true

    let exists = false

    // 1차: Firebase Auth 기준 (빠름)
    try {
      const ok = await checkEmailAvailable(v)
      exists = !ok
    } catch (e) {
      console.warn('[email check] local(Auth) 실패, CF 폴백 시도:', e)
    }

    // 2차: Auth 기준으로는 없는 이메일 → Cloud Function으로 Firestore 기준 재확인
    if (!exists) {
      try {
        const res = await fnCheckEmail({ email: v })
        exists = !!res?.data?.exists
      } catch (e2) {
        console.warn('[email check] Cloud Function 실패:', e2)
        throw e2
      }
    }

    if (exists) {
      alert('이미 사용 중인 이메일입니다.')
    } else {
      alert('사용 가능한 이메일입니다.')
    }
  } catch (e) {
    alert('이메일 확인 오류: ' + (e?.message || e))
  } finally {
    emailChecking.value = false
  }
}

async function checkNickDuplicate() {
  const v = nick.value.trim()
  if (!v) {
    alert('닉네임을 입력해 주세요.')
    return
  }

  try {
    nickChecking.value = true

    // 1차: 로컬 Firestore 쿼리로 빠르게 확인
    let exists = false
    try {
      const ok = await checkNicknameAvailable(v)
      exists = !ok
    } catch (e) {
      const code = e?.code || ''
      const msg  = e?.message || ''
      console.warn('[nick check] local(Firestore) 실패, CF 폴백 시도:', e)

      // Firestore 규칙에 막힌 경우 → Cloud Function으로 폴백
      if (code === 'permission-denied' || msg.includes('insufficient permissions')) {
        // 아래에서 CF 호출
      } else {
        throw e
      }
    }

    // 2차: local 에서 "사용 가능" 또는 권한 문제일 때 → Cloud Function으로 최종 확인
    if (!exists) {
      const res = await fnCheckNick({ nick: v })
      exists = !!res?.data?.exists
    }

    if (exists) {
      alert('이미 사용 중인 닉네임입니다.')
    } else {
      alert('사용 가능한 닉네임입니다.')
    }
  } catch (e) {
    alert('닉네임 확인 오류: ' + (e?.message || e))
  } finally {
    nickChecking.value = false
  }
}

/* ---------------------------------------------------------
   추천코드 자동 생성 함수
--------------------------------------------------------- */
async function getOrCreateMyReferralCode(emailStr) {
  const localId = (emailStr.split('@')[0] || '').replace(/[^a-z0-9]/gi, '')
  const prefix = (localId[0] || 'X').toUpperCase()

  try {
    const reserveReferralCode = httpsCallable(fns, 'reserveReferralCode')
    const res = await reserveReferralCode({ prefix })
    const code = String(res?.data?.code || '').toUpperCase()
    if (!/^[A-Z]\d{5}$/.test(code)) throw new Error('코드 형식 오류')
    return code
  } catch (e) {
    console.error('reserveReferralCode 실패:', e)
    return prefix + '00001'
  }
}

/* ---------------------------------------------------------
   추천코드 보상 처리
--------------------------------------------------------- */
async function applyReferralIfAny(rawCode) {
  // ✨ Functions 쪽도 소문자 기준으로 처리 (findReferrerByCode 가 대소문자 모두 커버)
  const code = (rawCode ?? refCode.value).trim().toLowerCase()
  if (!code) return
  try {
    const applyReferralNow = httpsCallable(fns, 'applyReferralNow')
    await applyReferralNow({ refCode: code })
  } catch (e) {
    console.warn('applyReferralNow 실패:', e)
  }
}

/* ---------------------------------------------------------
   로그인
--------------------------------------------------------- */
async function onLogin() {
  if (pendingLogin.value) return

  pendingLogin.value = true
  try {
    const emailTrim = email.value.trim()

    if (who.value === 'biz') {
      await me.loginBiz({ email: emailTrim, password: password.value })
    } else if (who.value === 'admin') {
      await me.loginAdmin({ email: emailTrim, password: password.value })
    } else {
      await me.loginUser({ email: emailTrim, password: password.value })
    }

    router.replace(route.query.next || '/')
  } catch (e) {
    const rawCode = String(e?.code || '')
    const rawMsg = String(e?.message || '')
    const isRoleMismatch =
      rawCode.includes('role-mismatch') || rawMsg.includes('role-mismatch')

    let msg
    if (isRoleMismatch) {
      if (who.value === 'user') {
        msg =
          '해당 계정은 기업회원/관리자회원 계정입니다.\n기업회원 또는 관리자회원으로 로그인해 주세요.'
      } else if (who.value === 'biz' || who.value === 'admin') {
        msg =
          '해당 계정은 여성회원 계정입니다.\n여성회원으로 로그인해 주세요.'
      } else {
        msg =
          '선택한 회원유형과 계정 유형이 일치하지 않습니다.\n올바른 회원 유형 탭을 선택한 뒤 다시 시도해 주세요.'
      }
    } else {
      msg = humanizeAuthError(e)
    }

    alert('로그인 실패: ' + msg)
  } finally {
    pendingLogin.value = false
  }
}

/* ---------------------------------------------------------
   회원가입
--------------------------------------------------------- */
async function onSignup() {
  if (pendingSignup.value) return

  if (password.value !== passwordConfirm.value) {
    alert('비밀번호와 비밀번호 확인이 일치하지 않습니다.')
    return
  }
  if (!smsVerified.value) {
    alert('휴대폰 인증을 완료해야 회원가입이 가능합니다.')
    return
  }

  pendingSignup.value = true
  try {
    const emailTrim = email.value.trim()
    // ✨ 추천코드는 모두 소문자로 통일 (내 코드 y00023 과 동일)
    const refInput = (refCode.value.trim() || '').toLowerCase()

    // ===== 여성회원 =====
    if (who.value === 'user') {
      const myReferralCode = await getOrCreateMyReferralCode(emailTrim)

      await me.signupUser({
        email: emailTrim,
        password: password.value,
        nick: nick.value.trim(),
        refCode: refInput || undefined,
      })
      await applyReferralIfAny(refInput)
    }

    // ===== 기업회원(가게찾기 사장님) =====
    else if (who.value === 'biz') {
      await me.signupBiz({
        email: emailTrim,
        password: password.value,
        nick: nick.value.trim(),
        phone: phone.value.trim(),
        storeName: storeName.value.trim(),
        businessNo: businessNo.value.trim(),
        address: address.value.trim(),
        refCode: refInput || undefined,
        accountKind: 'storeOwner',
      })
      await applyReferralIfAny(refInput)
    }

    // ===== 관리자 회원(제휴관 사장님) =====
    else if (who.value === 'admin') {
      await me.signupAdmin({
        email: emailTrim,
        password: password.value,
        nick: nick.value.trim(),
        phone: phone.value.trim(),
        storeName: storeName.value.trim(),
        businessNo: businessNo.value.trim(),
        address: address.value.trim(),
        refCode: refInput || undefined,
        accountKind: 'partnerOwner',
      })
      await applyReferralIfAny(refInput)
    }

    router.replace(route.query.next || '/')
  } catch (e) {
    alert('회원가입 실패: ' + (e?.code || e?.message || e))
    console.error(e)
  } finally {
    pendingSignup.value = false
  }
}

/* ---------------------------------------------------------
   Firebase Auth 초기 설정
--------------------------------------------------------- */
onMounted(async () => {
  try {
    const auth = getAuth()
    await setPersistence(auth, browserLocalPersistence)
  } catch (e) {
    console.warn(e)
  }

  const qRef = String(route.query.ref || route.query.code || '').trim()
  if (qRef) {
    // ✨ URL 에 붙어온 코드도 소문자로 통일
    refCode.value = qRef.toLowerCase()
    if (action.value !== 'signup') action.value = 'signup'
  }
})
</script>

<style scoped>
/* 기본 레이아웃 */
.wrap {
  padding: 16px;
}

.box {
  padding: 16px;
  border-radius: 18px;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

/* ✅ 상단 타이틀: 한 줄 고정 + 화면 크기에 따라 자동 축소 */
.head h2 {
  margin: 0;
  white-space: nowrap;
  font-weight: 900;
  font-size: clamp(18px, 4.5vw, 22px);
}

/* 로그인/회원가입 토글 버튼 */
.mode {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.tabs {
  display: flex;
  gap: 8px;
  margin: 12px 0;
  flex-wrap: nowrap;
}

.tab {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 6px 10px;
  font-weight: 800;
  background: var(--surface);
  white-space: nowrap;              /* ✅ 한 줄 고정 */
  font-size: clamp(11px, 3.2vw, 13px); /* 화면 좁으면 자동 축소 */
  flex-shrink: 1;
}

.tab.active {
  background: var(--accent);
  color: #fff;
}

/* form */
.form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-weight: 800;
  margin: 2px 0;
}

.flex-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
</style>

<!-- ===== 전역 오버라이드 스타일 ===== -->
<style>
/* 테마별 탭/버튼 색상 */
html[data-theme='white'] .auth-page .tabs .tab:not(.active) {
  color: #ff6aa8 !important;
  border-color: #ffd0e3 !important;
  background: transparent !important;
}
html[data-theme='white'] .auth-page .tabs .tab.active {
  background: #ff2c8a !important;
  border-color: #ff2c8a !important;
  color: #fff !important;
}
html[data-theme='white'] .auth-page .btn.primary.xl {
  background: #ff2c8a !important;
  border-color: #ff2c8a !important;
  color: #fff !important;

  /* ✅ 한 줄 고정 + 자동 축소 */
  white-space: nowrap;
  font-size: clamp(14px, 3.8vw, 16px);
}
html[data-theme='black'] .auth-page .btn.primary.xl,
html[data-theme='black'] .auth-page .btn.primary.xl[disabled] {
  background: #ff2c8a !important;
  border-color: #ff2c8a !important;
  color: #fff !important;
  opacity: 1 !important;
  filter: none !important;

  white-space: nowrap;
  font-size: clamp(14px, 3.8vw, 16px);
}

/* 모든 입력칸 */
.auth-page input.auth-input {
  box-sizing: border-box;
  height: 40px !important;
  border-radius: 12px !important;
  border: 1px solid var(--line) !important;
  padding: 0 16px !important;
  background: transparent !important;
  color: var(--fg) !important;
  flex: 1;
  font-size: 16px;
  line-height: 1.2;
}

/* 인풋 옆 작은 버튼 (닉네임/이메일 중복확인, 인증번호 발송 등) */
.auth-page .btn.sm {
  height: 40px !important;
  padding: 0 12px !important;
  border-radius: 12px !important;
  border: 1px solid var(--line) !important;
  background: var(--surface) !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;

  white-space: nowrap;
  font-size: clamp(11px, 3.2vw, 13px);
}
</style>
