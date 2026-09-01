// src/directives/lazyBg.js
//
// v-lazy-bg="<url>" — viewport 에 들어오기 직전에만 element 의
// background-image 를 적용한다. CSS background 방식의 카드(예: Top5 썸네일)에
// 가시 영역 밖 이미지의 즉시 다운로드를 막아 첫 진입 부담을 줄이는 용도.
//
// 값이 빈 문자열이거나 falsy 면 아무것도 하지 않는다.
// 값이 바뀌면(예: 데이터 갱신) observer 를 재구성한다.

const KEY = '__lazyBgObserver__'

function applyBg(el, url) {
  if (!url) return
  el.style.backgroundImage = `url("${String(url).replace(/"/g, '\\"')}")`
}

function setupObserver(el, url) {
  // 기존 observer 정리
  const prev = el[KEY]
  if (prev) {
    try { prev.disconnect() } catch {}
    el[KEY] = null
  }

  if (!url) {
    el.style.backgroundImage = ''
    return
  }

  // IntersectionObserver 미지원 환경 폴백
  if (typeof IntersectionObserver === 'undefined') {
    applyBg(el, url)
    return
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (entry && entry.isIntersecting) {
        applyBg(el, url)
        try { observer.disconnect() } catch {}
        el[KEY] = null
      }
    },
    { rootMargin: '100px' }
  )
  observer.observe(el)
  el[KEY] = observer
}

export default {
  mounted(el, binding) {
    setupObserver(el, binding.value || '')
  },
  updated(el, binding) {
    if (binding.value === binding.oldValue) return
    setupObserver(el, binding.value || '')
  },
  beforeUnmount(el) {
    const obs = el[KEY]
    if (obs) {
      try { obs.disconnect() } catch {}
      el[KEY] = null
    }
  },
}
