// src/store/auth.js
import { reactive, watch } from 'vue'

const STORAGE_KEY = 'gt_auth_v1'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
function genReferralCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export const auth = reactive({
  user: null, // { id, role:'female'|'company', email, nickname, referralCode, company? }

  async register(payload) {
    const id = 'u_' + Math.random().toString(36).slice(2, 10)
    const base = {
      id,
      role: payload.role, // 'female' | 'company'
      email: payload.email,
      nickname: payload.nickname || '사용자',
      referralCode: genReferralCode(),
    }
    if (payload.role === 'company') {
      base.company = {
        brn: payload.brn || '',
        address: payload.address || '',
        phone: payload.phone || '',
      }
    }
    if (payload.referrerCode) {
      // 추천인 로직은 나중에 서버로 옮기면 됩니다.
      console.log('[추천인]', payload.referrerCode, '가입자', id)
    }
    this.user = base
    save({ user: this.user })
    return base
  },

  async login({ email }) {
    const saved = load()
    if (saved?.user && saved.user.email === email) {
      this.user = saved.user
      return this.user
    }
    // 데모: 저장된 계정이 없을 때 임시 로그인
    this.user = {
      id: 'u_demo',
      role: 'female',
      email,
      nickname: '게스트',
      referralCode: genReferralCode(),
    }
    save({ user: this.user })
    return this.user
  },

  logout() {
    this.user = null
    save({ user: null })
  },

  init() {
    const s = load()
    if (s?.user) this.user = s.user
  },
})

auth.init()

watch(
  () => auth.user,
  () => save({ user: auth.user }),
  { deep: true }
)
