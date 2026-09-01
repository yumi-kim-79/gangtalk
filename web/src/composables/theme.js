// src/store/theme.js
const KEY = 'theme';

export function normalizeTheme(v) {
  const s = String(v || '').toLowerCase();
  if (s === 'dark' || s === 'black') return 'black';
  return 'white';
}

export function getTheme() {
  try {
    return normalizeTheme(localStorage.getItem(KEY) || 'white');
  } catch {
    return 'white';
  }
}

export function applyThemeToDom(v) {
  const t = normalizeTheme(v || getTheme());
  document.documentElement.setAttribute('data-theme', t);
  return t;
}

export function setTheme(v) {
  const t = normalizeTheme(v);
  try { localStorage.setItem(KEY, t); } catch {}
  applyThemeToDom(t);
  // 브로드캐스트(선택)
  try {
    window.dispatchEvent(new CustomEvent('themechange', { detail: t }));
  } catch {}
  return t;
}

export function toggleTheme() {
  return setTheme(getTheme() === 'white' ? 'black' : 'white');
}

/** 다른 탭/윈도우와 동기화 */
export function attachThemeSync() {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) applyThemeToDom(e.newValue || 'white');
  });
}
