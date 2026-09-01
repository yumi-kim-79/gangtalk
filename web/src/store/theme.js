// src/store/theme.js
const KEY = 'theme';

export function normalizeTheme(v) {
  const s = String(v ?? '').toLowerCase();
  if (s === 'black' || s === 'dark') return 'black';
  return 'white'; // 기본값
}

export function getTheme() {
  try { return normalizeTheme(localStorage.getItem(KEY) || 'white'); }
  catch { return 'white'; }
}

export function setTheme(v) {
  const t = normalizeTheme(v);
  try { localStorage.setItem(KEY, t); } catch {}
  applyThemeToDom(t);
  try { window.dispatchEvent(new CustomEvent('themechange', { detail: t })); } catch {}
  return t;
}

export function toggleTheme() {
  return setTheme(getTheme() === 'white' ? 'black' : 'white');
}

export function applyThemeToDom(v) {
  const t = normalizeTheme(v);
  document.documentElement.setAttribute('data-theme', t);
  return t;
}

export function attachThemeSync() {
  // 다른 탭/창 동기화
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) applyThemeToDom(e.newValue || 'white');
  });
}
