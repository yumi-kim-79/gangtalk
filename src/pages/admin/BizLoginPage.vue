<!--
  src/pages/admin/BizLoginPage.vue
  업체/관리자 공용 로그인 화면.
  - 로그인 성공 시 users/{uid} 또는 이메일을 확인해 role 결정:
      platform (gangtalk815@gmail.com) → /admin/dashboard
      biz (type='company' & accountKind='storeOwner') → /biz/dashboard
      그 외 → 로그아웃 + 에러
-->
<template>
  <main class="adm-login-shell">
    <section class="adm-login-card">
      <div class="adm-login-brand">
        <img src="/icons/icon-192.png" alt="강톡" class="adm-login-logo" />
        <h1>업체 관리자 로그인</h1>
        <p>강남톡방 업체용 페이지입니다.</p>
      </div>

      <form class="adm-login-form" @submit.prevent="onLogin" :aria-busy="busy">
        <label>
          <span>이메일</span>
          <input
            v-model.trim="email"
            type="email"
            autocomplete="email"
            required
            placeholder="업체에 부여된 이메일"
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

      <p class="adm-login-foot">© 강남톡방 업체 관리</p>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  getAuth, setPersistence, browserLocalPersistence,
  signInWithEmailAndPassword, signOut,
} from 'firebase/auth'
import { db as fbDb } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'

const PLATFORM_EMAIL = 'gangtalk815@gmail.com'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const busy = ref(false)
const errorMsg = ref('')

async function resolveRole(user) {
  if (!user) return null
  const em = String(user.email || '').toLowerCase()
  if (em === PLATFORM_EMAIL) return 'platform'
  try {
    const snap = await getDoc(doc(fbDb, 'users', user.uid))
    if (snap.exists()) {
      const d = snap.data() || {}
      if (d.type === 'company' && d.accountKind === 'storeOwner') return 'biz'
    }
  } catch (e) {
    console.warn('[BizLogin] resolveRole:', e)
  }
  return null
}

onMounted(async () => {
  try {
    const auth = getAuth()
    await setPersistence(auth, browserLocalPersistence)
    // 이미 로그인되어 있으면 role 에 맞는 곳으로 즉시 이동
    const u = auth.currentUser
    if (u) {
      const role = await resolveRole(u)
      if (role === 'platform') return router.replace(String(route.query.next || '/admin/dashboard'))
      if (role === 'biz')      return router.replace(String(route.query.next || '/biz/dashboard'))
    }
  } catch {}
})

async function onLogin() {
  if (busy.value) return
  errorMsg.value = ''
  busy.value = true
  try {
    const auth = getAuth()
    const cred = await signInWithEmailAndPassword(auth, email.value, password.value)
    const role = await resolveRole(cred.user)
    if (role === 'platform') {
      router.replace(String(route.query.next || '/admin/dashboard'))
      return
    }
    if (role === 'biz') {
      router.replace(String(route.query.next || '/biz/dashboard'))
      return
    }
    // 권한 없음 → 강제 로그아웃
    await signOut(auth).catch(() => {})
    errorMsg.value = '업체 계정이 아닙니다. 관리자에게 문의해 주세요.'
  } catch (e) {
    console.warn('biz login fail:', e)
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
