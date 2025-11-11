<!-- src/pages/AuthPage.vue -->
<template>
  <main class="wrap auth-page">
    <section class="card shadow box">
      <header class="head">
        <h2>로그인 / 회원가입</h2>
        <div class="mode">
          <button class="btn sm" :class="{ on: action==='login' }" type="button" @click="action='login'">로그인</button>
          <button class="btn sm" :class="{ on: action==='signup' }" type="button" @click="action='signup'">회원가입</button>
        </div>
      </header>

      <!-- 회원 유형 -->
      <div class="tabs">
        <button class="tab" :class="{active: who==='user'}" type="button" @click="who='user'">여성회원</button>
        <button class="tab" :class="{active: who==='biz'}"  type="button" @click="who='biz'">기업회원</button>
      </div>

      <!-- ───────── 로그인 ───────── -->
      <form v-if="action==='login'" class="form" @submit.prevent="onLogin" :aria-busy="pendingLogin">
        <label>이메일</label>
        <input v-model="email" type="email" placeholder="you@example.com" required autocomplete="email" />
        <label>비밀번호</label>
        <input v-model="password" type="password" placeholder="8자 이상" minlength="8" required autocomplete="current-password" />
        <button class="btn primary xl" type="submit" :disabled="pendingLogin">
          {{ pendingLogin ? '로그인 중…' : '로그인' }}
        </button>
      </form>

      <!-- ───────── 회원가입 ───────── -->
      <form v-else class="form" @submit.prevent="onSignup" :aria-busy="pendingSignup">
        <template v-if="who==='user'">
          <label>닉네임</label>
          <input v-model="nick" placeholder="표시될 이름" required autocomplete="nickname" />

          <!-- ✅ 여성회원: PASS 본인확인 필수 -->
          <div class="pass-box">
            <div class="row-between">
              <label class="m0">본인확인(PASS)</label>
              <small class="badge" :class="pass.verified ? 'ok' : 'warn'">
                {{ pass.verified ? '인증 완료' : '인증 필요' }}
              </small>
            </div>

            <div class="kv">
              <div class="k">상태</div>
              <div class="v">
                <template v-if="pass.verified">
                  이름 {{ nameMasked }} · 생년월일 {{ birthMasked }} · 성별 <b>여성</b>
                </template>
                <template v-else>
                  휴대폰 본인확인으로 <b>여성</b> 여부 확인이 필요합니다.
                </template>
              </div>
            </div>

            <div class="row-inline mt10">
              <button
                class="btn"
                type="button"
                :disabled="startingPass || pendingSignup"
                @click="startPass"
              >
                {{ startingPass ? '요청 중…' : (pass.verified ? '다시 인증' : 'PASS로 본인확인') }}
              </button>
              <span class="muted mt6-sm" v-if="pass.verified">인증 시간: {{ passVerifiedAtYmd }}</span>
            </div>

            <!-- 아래 안내문과 겹치지 않도록 여백 강화 -->
            <p class="hint mt12">
              * PASS 인증 결과에서 <b>성별이 여성</b>일 때만 가입할 수 있어요. (DI로 중복가입 방지)
            </p>
          </div>
        </template>

        <label>이메일</label>
        <input v-model="email" type="email" placeholder="you@example.com" required autocomplete="email" />

        <label>비밀번호</label>
        <input v-model="password" type="password" placeholder="8자 이상" minlength="8" required autocomplete="new-password" />

        <!-- ✅ 추천인 코드 (선택 입력) -->
        <label>추천인 코드 (선택)</label>
        <input v-model="refCode" placeholder="예: A00001" autocomplete="one-time-code" />
        <p class="hint">
          회원가입 시 <b>내 추천코드</b>가 자동 생성됩니다. 규칙: <code>이메일 아이디 첫 글자</code> + <code>가입순번(00001부터)</code> 예) <code>a00001</code> → 대문자로 저장.
        </p>

        <!-- 기업회원 전용 추가정보 -->
        <template v-if="who==='biz'">
          <label>업체명</label>
          <input v-model="storeName" placeholder="예) 라운지 G" required />
          <label>사업자등록번호 (선택)</label>
          <input v-model="businessNo" placeholder="10자리" inputmode="numeric" />
          <label>주소 (선택)</label>
          <input v-model="address" placeholder="사업장 주소" />
          <label>연락처 (선택)</label>
          <input v-model="phone" placeholder="010-0000-0000" inputmode="tel" />
        </template>

        <button
          class="btn primary xl"
          type="submit"
          :disabled="pendingSignup || (who==='user' && !pass.verified)"
          :title="who==='user' && !pass.verified ? 'PASS 본인확인(여성) 완료 후 가입 가능합니다' : ''"
        >
          {{ pendingSignup ? '가입 처리 중…' : '회원가입' }}
        </button>
      </form>
    </section>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { me } from '@/store/user.js'
import { humanizeAuthError } from '../utils/authErrors.js'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'

/* ---------------------------------------------------------
   🔌 PASS 연동 가정(백엔드 필요)
   - POST /api/pass/start { purpose: 'signup_user' }
       -> { txId: string, authUrl: string } 반환
   - GET  /api/pass/status?txId=...
       -> { done:true, ok:true, gender:'F'|'M', name, birth, phone, diHash, verifiedAt }
   --------------------------------------------------------- */

const router = useRouter()
const route = useRoute()

/* 모드/회원유형 */
const action = ref(route.query.mode === 'signup' ? 'signup' : 'login')
const who    = ref(route.query.who === 'biz' ? 'biz' : 'user')

/* 공통 입력 */
const nick = ref('')
const email = ref('')
const password = ref('')
const refCode = ref('') // 입력받은 추천코드(선택)

/* 기업 입력 */
const storeName = ref('')
const businessNo = ref('')
const address    = ref('')
const phone      = ref('')

/* 인증 상태 */
const pendingLogin  = ref(false)
const pendingSignup = ref(false)

/* ✅ PASS 상태 */
const startingPass = ref(false)
const pass = reactive({
  txId: '',
  verified: false,
  gender: null,       // 'F'|'M'|null
  name: '',
  birth: '',          // YYYYMMDD
  phone: '',
  diHash: '',
  verifiedAt: 0,
})

const passPoll = { timer: null, popup: null }

/* 마스킹/표시용 */
const nameMasked = computed(()=>{
  if (!pass.name) return ''
  return pass.name[0] + '※'.repeat(Math.max(0, pass.name.length-1))
})
const birthMasked = computed(()=>{
  if (!pass.birth) return ''
  return `${pass.birth.slice(0,4)}-${pass.birth.slice(4,6)}-**`
})
const passVerifiedAtYmd = computed(()=>{
  if (!pass.verifiedAt) return ''
  const d = new Date(pass.verifiedAt)
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${dd}`
})

onMounted(async () => {
  try {
    const auth = getAuth()
    await setPersistence(auth, browserLocalPersistence)
  } catch(_) {}

  // ref code from url
  const qRef = String(route.query.ref || route.query.code || '').trim()
  if (qRef) {
    refCode.value = qRef
    if (action.value !== 'signup') action.value = 'signup'
  }

  window.addEventListener('message', onMessageFromPopup)
})
onBeforeUnmount(()=>{
  window.removeEventListener('message', onMessageFromPopup)
  if (passPoll.timer) clearInterval(passPoll.timer)
  try { passPoll.popup && passPoll.popup.close() } catch(_){}
})

/* postMessage 수신 */
async function onMessageFromPopup (ev){
  if (ev.origin !== window.location.origin) return
  if (!ev.data || ev.data.type !== 'passResult') return
  if (!pass.txId || ev.data.txId !== pass.txId) return
  await fetchPassStatus(pass.txId)
}

/* PASS 시작 */
async function startPass () {
  if (startingPass.value) return
  startingPass.value = true
  try{
    const res = await fetch('/api/pass/start', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ purpose:'signup_user' })
    })
    if (!res.ok) {
      const txt = await res.text().catch(()=> '')
      throw new Error(`start 실패 (${res.status}) ${txt}`)
    }
    const data = await res.json().catch(()=>null)
    if (!data?.authUrl || !data?.txId) throw new Error('start 응답 형식 오류')

    pass.txId = data.txId
    // 팝업 열기
    const w = 480, h = 720
    const y = window.top.outerHeight/2 + window.top.screenY - (h/2)
    const x = window.top.outerWidth/2 + window.top.screenX - (w/2)
    passPoll.popup = window.open(
      data.authUrl,
      'pass_auth',
      `width=${w},height=${h},left=${x},top=${y},resizable=no,scrollbars=yes`
    )
    if (!passPoll.popup) { alert('팝업 차단을 해제하고 다시 시도해 주세요.'); return }

    // 폴링(팝업 닫힘 감지 + 상태 조회)
    if (passPoll.timer) clearInterval(passPoll.timer)
    passPoll.timer = setInterval(async ()=>{
      if (passPoll.popup && passPoll.popup.closed) {
        clearInterval(passPoll.timer)
        passPoll.timer = null
        await fetchPassStatus(pass.txId)
      }
    }, 800)
  }catch(e){
    console.error(e)
    alert('PASS 요청 실패: ' + (e?.message || e))
  }finally{
    startingPass.value = false
  }
}

/* PASS 상태 조회 */
async function fetchPassStatus (txId){
  try{
    const res = await fetch(`/api/pass/status?txId=${encodeURIComponent(txId)}`, { method:'GET' })
    if (!res.ok) {
      const txt = await res.text().catch(()=> '')
      throw new Error(`status 조회 실패 (${res.status}) ${txt}`)
    }
    const d = await res.json().catch(()=>null)
    if (!d?.done) return
    if (!d?.ok || d?.gender !== 'F') {
      pass.verified = false
      alert('본인확인에 실패했거나, 여성 회원이 아닙니다.')
      return
    }
    pass.verified   = true
    pass.gender     = 'F'
    pass.name       = d.name || ''
    pass.birth      = d.birth || ''
    pass.phone      = d.phone || ''
    pass.diHash     = d.diHash || ''
    pass.verifiedAt = d.verifiedAt ? Number(d.verifiedAt) : Date.now()
  }catch(e){
    console.error(e)
    alert('인증 결과 확인 실패: ' + (e?.message || e))
  }
}

/* ✅ 추천코드: URL 입력이 있으면 적용, 없으면 자동 생성(충돌 없는 예약/발급) */
async function getOrCreateMyReferralCode (emailStr){
  const localId = (emailStr.split('@')[0] || '').replace(/[^a-z0-9]/gi,'')
  const prefix = (localId[0] || 'X').toUpperCase()
  try{
    const fns = getFunctions(undefined, 'asia-northeast3')
    const reserve = httpsCallable(fns, 'reserveReferralCode')
    const res = await reserve({ prefix })
    const code = String(res?.data?.code || '').toUpperCase()
    if (!/^[A-Z]\d{5}$/.test(code)) throw new Error('코드 형식 오류')
    return code
  }catch(e){
    console.error('reserveReferralCode 실패:', e)
    return prefix + '00001' // 임시 폴백
  }
}

/* 초대한 사람 보상 적용 */
async function applyReferralIfAny () {
  const code = refCode.value.trim()
  if (!code) return
  try {
    const fns = getFunctions(undefined, 'asia-northeast3')
    const applyReferralNow = httpsCallable(fns, 'applyReferralNow')
    await applyReferralNow({ refCode: code })
  } catch (e) {
    console.warn('applyReferralNow failed:', e?.message || e)
  }
}

function roleMismatchAlert(actual) {
  const tabLabel = actual === 'company' ? '기업회원' : '여성회원'
  alert(`이 계정은 ${tabLabel} 계정입니다. 상단 탭에서 [${tabLabel}]으로 전환해 로그인해 주세요.`)
}

/* 로그인 */
async function onLogin () {
  if (pendingLogin.value) return
  pendingLogin.value = true
  try {
    if (who.value === 'biz') {
      await me.loginBiz({ email: email.value.trim(), password: password.value })
    } else {
      await me.loginUser({ email: email.value.trim(), password: password.value })
    }
    router.replace(route.query.next || '/')
  } catch (e) {
    if (e?.code === 'role-mismatch') {
      roleMismatchAlert(e.actual)
    } else {
      alert('로그인 실패: ' + humanizeAuthError(e))
    }
  } finally {
    pendingLogin.value = false
  }
}

/* 회원가입 */
async function onSignup () {
  if (pendingSignup.value) return

  // ✅ 여성회원은 PASS 인증(여성) 필수
  if (who.value === 'user' && !pass.verified) {
    alert('PASS 본인확인을 완료해 주세요.')
    return
  }

  pendingSignup.value = true
  try {
    const emailTrim = email.value.trim()

    if (who.value === 'biz') {
      await me.signupBiz({
        email: emailTrim,
        password: password.value,
        storeName: storeName.value.trim(),
        businessNo: businessNo.value.trim(),
        address: address.value.trim(),
        phone: phone.value.trim(),
        manager: nick.value.trim() || '',
        refCode: refCode.value.trim() || undefined,
      })
      await applyReferralIfAny()
    } else {
      // ✅ 내 추천코드 예약 발급
      const myReferralCode = await getOrCreateMyReferralCode(emailTrim)

      // 여성회원 가입 — PASS 결과 + 내 추천코드 전달
      await me.signupUser({
        email: emailTrim,
        password: password.value,
        nick: nick.value.trim(),
        refCode: refCode.value.trim() || undefined,   // 누군가의 코드 입력(선택)
        myReferralCode,                                // 내가 부여받을 고유 코드 (A00001 형식)
        passVerified: true,
        gender: 'F',
        phone: pass.phone || '',
        diHash: pass.diHash || '',
        passName: pass.name || '',
        passBirth: pass.birth || '',
        verifiedAt: pass.verifiedAt || Date.now(),
      })

      // 로컬 닉네임 저장
      const n = nick.value.trim()
      if (n) {
        localStorage.setItem('user:nick', n)
        localStorage.setItem('nickname', n)
      }

      await applyReferralIfAny()
    }

    router.replace(route.query.next || '/')
  } catch (e) {
    if (e?.code === 'role-mismatch') {
      roleMismatchAlert(e.actual)
      return
    }
    if (e?.code === 'auth/email-already-in-use') {
      alert('이미 가입된 이메일입니다. 같은 비밀번호라면 로그인으로 이동해 주세요.')
      action.value = 'login'
      return
    }
    alert('회원가입 실패: 오류(' + (e?.code || e?.message || e) + ')가 발생했습니다. 잠시 후 다시 시도해 주세요.')
    console.error(e)
  } finally {
    pendingSignup.value = false
  }
}
</script>

<style scoped>
.wrap{ padding:16px }
.box{ padding:16px; border-radius:18px }
.head{ display:flex; justify-content:space-between; align-items:center }
.mode{ display:flex; gap:8px }
.btn.sm{ height:36px; padding:0 12px; border-radius:10px; border:1px solid var(--line); background:var(--surface) }
.btn.sm.on{ outline:2px solid var(--accent) }

.tabs{ display:flex; gap:8px; margin:12px 0 }
.tab{ border:1px solid var(--line); border-radius:12px; padding:8px 12px; font-weight:800; background:var(--surface) }
.tab.active{ background:var(--accent); color:#fff }

.form{ display:flex; flex-direction:column; gap:10px }
label{ font-weight:800; margin-top:4px }
label.m0{ margin:0 }
input{
  height:44px; border-radius:12px; border:1px solid var(--line);
  padding:0 12px; background:transparent; color:var(--fg);
}
.hint{ margin:-6px 0 4px; color:var(--muted); font-size:12px }

/* PASS 블록(간격 강화) */
.pass-box{ margin-top:8px; padding:12px; border:1px dashed var(--line); border-radius:12px; background:var(--surface) }
.row-between{ display:flex; align-items:center; justify-content:space-between }
.row-inline{ display:flex; gap:10px; align-items:center; margin-top:8px; flex-wrap:wrap } /* 줄바꿈 허용 */
.mt6{ margin-top:6px }
.mt10{ margin-top:10px }
.mt12{ margin-top:12px }
.mt6-sm{ margin-top:6px }
.kv{ display:flex; gap:10px; align-items:flex-start; margin-top:8px }
.kv .k{ flex:0 0 64px; color:var(--muted) }
.kv .v{ flex:1; min-width:0 }
.badge{ padding:2px 8px; border-radius:999px; font-size:12px; font-weight:900; border:1px solid var(--line) }
.badge.ok{ background:#dcfce7; border-color:#bbf7d0; color:#166534 }
.badge.warn{ background:#fff7ed; border-color:#fed7aa; color:#a16207 }

.btn.primary.xl{
  margin-top:8px; height:50px; border-radius:14px; font-weight:900;
  border:1px solid var(--accent);
  background: color-mix(in oklab, var(--accent), white 85%);
}
</style>

<!-- 전역(비-scoped) 오버라이드 -->
<style>
html[data-theme="white"] .auth-page .tabs .tab:not(.active){
  color:#ff6aa8 !important;
  border-color:#ffd0e3 !important;
  background:transparent !important;
}
html[data-theme="white"] .auth-page .tabs .tab.active{
  background:#ff2c8a !important;
  border-color:#ff2c8a !important;
  color:#fff !important;
}
html[data-theme="white"] .auth-page .btn.primary.xl{
  background:#ff2c8a !important;
  border-color:#ff2c8a !important;
  color:#fff !important;
}
html[data-theme="black"] .auth-page .btn.primary.xl,
html[data-theme="black"] .auth-page .btn.primary.xl[disabled]{
  background:#ff2c8a !important;
  border-color:#ff2c8a !important;
  color:#fff !important;
  opacity:1 !important;
  filter:none !important;
}
</style>
