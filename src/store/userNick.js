// 전역 닉네임 스토어 (Pinia 없이 순수 Vue로 구성)
import { ref, watch } from 'vue'

const KEY = 'user:nick'

// 초기값: localStorage → 기본값 빈문자
const nick = ref(localStorage.getItem(KEY) || '')

// setter
function setNick(n) {
  const v = (n ?? '').toString().trim()
  nick.value = v
  if (v) localStorage.setItem(KEY, v)
  else localStorage.removeItem(KEY)
}

// 반대방향 동기화(동일 탭에서 수동 변경 시)
watch(nick, (v) => {
  if (v) localStorage.setItem(KEY, v)
  else localStorage.removeItem(KEY)
})

// 다른 탭에서 변경해도 실시간 반영
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) nick.value = e.newValue || ''
  })
}

// 로그인/회원가입/어디서든 사용: const { nick, setNick } = useUserNick()
export function useUserNick() {
  return { nick, setNick }
}
