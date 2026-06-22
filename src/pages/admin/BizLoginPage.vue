<!--
  src/pages/admin/BizLoginPage.vue
  gangtalk815 통합 로그인 화면 (관리자 + 업체 공용).
  - 로그인 성공 시 useAuthRole.getRole() 로 role 판별:
      platform → /admin/dashboard
      biz      → /biz/dashboard
      null + resolved=true → 권한 없음 안내 + 강제 로그아웃
      null + resolved=false → 일시 오류 안내 (signOut 안 함, 재시도 권장)
  - 라우터 query.reason='retry' 인 경우 진단 안내 표시 (가드의 미확정 redirect).
-->
<template>
  <main class="adm-login-shell">
    <section class="adm-login-card">
      <div class="adm-login-brand">
        <img src="/icons/icon-192.png" alt="강톡" class="adm-login-logo" />
        <h1>강남톡방 통합 로그인</h1>
        <p>관리자 / 업체 계정 모두 사용 가능합니다.</p>
      </div>

      <p v-if="hintMsg" class="adm-login-hint">{{ hintMsg }}</p>

      <form class="adm-login-form" @submit.prevent="onLogin" :aria-busy="busy">
        <label>
          <span>이메일</span>
          <input
            v-model.trim="email"
            type="email"
            autocomplete="email"
            required
            placeholder="이메일"
          />
        </label>
        <label>
          <span>비밀번호</span>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            minlength="6"
            placeholder="비밀번호"
          />
        </label>

        <button type="submit" class="adm-login-btn" :disabled="busy">
          {{ busy ? '로그인 중…' : '로그인' }}
        </button>

        <p v-if="errorMsg" class="adm-login-error">{{ errorMsg }}</p>
      </form>

      <p class="adm-login-signup">
        업체 계정이 없으신가요?
        <!-- 회원가입은 회원 빌드(gangtox.com) 에서 처리 (SMS App Check 호환). -->
        <a href="https://www.gangtox.com/biz-signup">업체 회원가입</a>
      </p>

      <p class="adm-login-foot">© 강남톡방</p>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  getAuth, setPersistence, browserLocalPersistence,
  signInWithEmailAndPassword, signOut,
} from 'firebase/auth'
import {
  authReady, getRole, invalidateRoleCache,
} from '@/composables/useAuthRole'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const busy = ref(false)
const errorMsg = ref('')

const hintMsg = computed(() => {
  if (route.query.reason === 'retry') {
    return '세션 복원 중 일시적인 오류가 발생했습니다. 다시 로그인해 주세요.'
  }
  return ''
})

function destinationFor(role) {
  const next = String(route.query.next || '')
  if (role === 'platform') {
    return next && next.startsWith('/admin') ? next : '/admin/dashboard'
  }
  if (role === 'biz') {
    return next && next.startsWith('/biz') ? next : '/biz/dashboard'
  }
  return '/biz/login'
}

onMounted(async () => {
  try {
    const auth = getAuth()
    await setPersistence(auth, browserLocalPersistence)
    // 이미 로그인되어 있으면 role 에 맞는 곳으로 즉시 이동
    const u = await authReady()
    if (!u) return
    const { role, resolved } = await getRole({ retries: 1 })
    if (!resolved) return  // 미확정 — 사용자에게 로그인 폼 노출
    if (role === 'platform' || role === 'biz') {
      router.replace(destinationFor(role))
    }
  } catch (e) {
    console.warn('[BizLogin] onMounted', e)
  }
})

async function onLogin() {
  if (busy.value) return
  errorMsg.value = ''
  busy.value = true
  try {
    const auth = getAuth()
    const cred = await signInWithEmailAndPassword(auth, email.value, password.value)
    if (!cred?.user) {
      errorMsg.value = '로그인에 실패했습니다.'
      return
    }
    // 새 세션이므로 캐시 무효 후 재판별
    invalidateRoleCache()
    const { role, resolved } = await getRole({ retries: 2 })

    if (!resolved) {
      // Firestore 일시 오류 — 강제 로그아웃 하지 않고 안내만
      errorMsg.value = '계정 정보를 일시적으로 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.'
      return
    }
    if (role === 'platform' || role === 'biz') {
      router.replace(destinationFor(role))
      return
    }
    // 확정적 권한 없음 → 강제 로그아웃
    await signOut(auth).catch(() => {})
    invalidateRoleCache()
    errorMsg.value = '등록된 관리자 또는 업체 계정이 아닙니다. 관리자에게 문의해 주세요.'
  } catch (e) {
    console.warn('login fail:', e)
    const code = String(e?.code || '')
    if (code.includes('auth/invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
      errorMsg.value = '이메일 또는 비밀번호가 올바르지 않습니다.'
    } else if (code.includes('auth/too-many-requests')) {
      errorMsg.value = '잠시 후 다시 시도해 주세요.'
    } else {
      errorMsg.value = '로그인 실패: ' + (e?.message || code)
    }
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.adm-login-shell{
  min-height:100vh;
  display:grid; place-items:center;
  padding:20px;
  background:linear-gradient(135deg, #fff5f8 0%, #ffeaf2 100%);
}
.adm-login-card{
  width:100%; max-width:380px;
  background:#fff; border-radius:16px;
  box-shadow:0 10px 40px rgba(255,77,141,.15);
  padding:36px 32px 28px;
}
.adm-login-brand{ text-align:center; margin-bottom:24px; }
.adm-login-logo{
  width:64px; height:64px; border-radius:14px;
  object-fit:cover; box-shadow:0 4px 12px rgba(255,77,141,.25);
  margin-bottom:10px;
}
.adm-login-brand h1{
  margin:0; font-size:20px; font-weight:900;
  color:#ff2e7e; letter-spacing:-0.3px;
}
.adm-login-brand p{
  margin:4px 0 0; font-size:12px; color:#888;
}

.adm-login-form{
  display:flex; flex-direction:column; gap:14px;
}
.adm-login-form label{
  display:flex; flex-direction:column; gap:4px;
}
.adm-login-form span{
  font-size:12px; font-weight:700; color:#666;
}
.adm-login-form input{
  height:42px; padding:0 14px;
  border:1.5px solid #eee; border-radius:10px;
  font-size:14px; background:#fafafa;
  box-sizing:border-box;
}
.adm-login-form input:focus{
  outline:none; border-color:#ff2e7e; background:#fff;
}

.adm-login-btn{
  margin-top:8px;
  height:46px;
  background:#ff2e7e; color:#fff;
  border:none; border-radius:10px;
  font-size:15px; font-weight:800;
  cursor:pointer;
}
.adm-login-btn:disabled{
  opacity:.6; cursor:not-allowed;
}
.adm-login-error{
  margin:0; color:#c0392b;
  font-size:13px; text-align:center;
}
.adm-login-hint{
  margin:-8px 0 8px;
  padding:10px 12px;
  background:#fff5f8;
  border:1px solid #ffd6e4;
  border-radius:8px;
  color:#ff2e7e;
  font-size:12px;
  text-align:center;
}
.adm-login-signup{
  margin:18px 0 0; text-align:center;
  font-size:13px; color:#666;
}
.adm-login-signup a{
  color:#ff2e7e; font-weight:700; text-decoration:none; margin-left:6px;
}
.adm-login-signup a:hover{ text-decoration:underline; }
.adm-login-foot{
  margin:20px 0 0; text-align:center;
  font-size:11px; color:#bbb;
}

:root[data-theme='dark'] .adm-login-shell,
:root[data-theme='black'] .adm-login-shell{
  background:linear-gradient(135deg, #1a1115 0%, #25141d 100%);
}
:root[data-theme='dark'] .adm-login-card,
:root[data-theme='black'] .adm-login-card{
  background:#1c1c1c;
}
:root[data-theme='dark'] .adm-login-form input,
:root[data-theme='black'] .adm-login-form input{
  background:#222; border-color:#2a2a2a; color:#eee;
}
</style>
