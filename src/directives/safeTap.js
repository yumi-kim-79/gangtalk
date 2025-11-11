// 드래그 중에는 클릭(탭) 막고, 손을 떼는 순간에만 onTap 실행.
// 감도(이동 허용치)와 최소 누름 시간으로 '미감도'를 낮춰 오작동 방지.

const _state = new WeakMap();

function setup(el, binding) {
  const isFn = typeof binding.value === 'function';
  const opts = isFn ? { onTap: binding.value } : (binding.value || {});
  const onTap = opts.onTap || (() => {});
  const THRESHOLD = Number(opts.threshold ?? 14);   // px, 커질수록 덜 민감
  const MIN_PRESS = Number(opts.minPressMs ?? 120); // ms, 길수록 덜 민감
  const SUPPRESS_MS = 300;                          // 드래그 후 유령 click 막기

  const s = {
    pointerId: null,
    startX: 0,
    startY: 0,
    startAt: 0,
    dragging: false,
    suppressClickUntil: 0,
    onPointerDown: null,
    onPointerMove: null,
    onPointerUp: null,
    onPointerCancel: null,
    onClick: null,
  };

  // 드래그/탭 감지
  s.onPointerDown = (e) => {
    if (s.pointerId !== null) return;
    s.pointerId = e.pointerId ?? 'mouse';
    s.dragging = false;
    s.startX = e.clientX ?? 0;
    s.startY = e.clientY ?? 0;
    s.startAt = Date.now();
    el.classList.add('safe-tap-pressed');

    window.addEventListener('pointermove', s.onPointerMove, { passive: true });
    window.addEventListener('pointerup', s.onPointerUp, { passive: true });
    window.addEventListener('pointercancel', s.onPointerCancel, { passive: true });
  };

  s.onPointerMove = (e) => {
    if ((e.pointerId ?? 'mouse') !== s.pointerId) return;
    const dx = (e.clientX ?? 0) - s.startX;
    const dy = (e.clientY ?? 0) - s.startY;
    if (!s.dragging && (dx*dx + dy*dy) > (THRESHOLD*THRESHOLD)) {
      s.dragging = true;                 // 임계치 넘으면 드래그로 전환
      el.classList.remove('safe-tap-pressed');
    }
  };

  s.onPointerUp = (e) => {
    if ((e.pointerId ?? 'mouse') !== s.pointerId) return;
    cleanupPointer();
    const held = Date.now() - s.startAt;

    // 드래그가 아니고, 최소 누름 시간 충족 시에만 onTap 실행
    if (!s.dragging && held >= MIN_PRESS) {
      onTap(e);
    } else {
      // 드래그 이후 발생할 수 있는 유령 클릭 차단
      s.suppressClickUntil = Date.now() + SUPPRESS_MS;
    }
  };

  s.onPointerCancel = () => {
    cleanupPointer();
    s.suppressClickUntil = Date.now() + SUPPRESS_MS;
  };

  s.onClick = (e) => {
    // pointer 계열로 이미 처리했으므로 click은 전부 막아 안전하게 함
    const now = Date.now();
    if (now < s.suppressClickUntil) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // pointer 이벤트에서 onTap을 호출했기 때문에 click은 통과하지 않도록 기본 차단
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  function cleanupPointer() {
    el.classList.remove('safe-tap-pressed');
    s.pointerId = null;
    window.removeEventListener('pointermove', s.onPointerMove);
    window.removeEventListener('pointerup', s.onPointerUp);
    window.removeEventListener('pointercancel', s.onPointerCancel);
  }

  // 초기 스타일: 세로 스크롤은 허용, 탭 하이라이트 제거
  if (!el.style.touchAction) el.style.touchAction = 'pan-y';
  el.style.webkitTapHighlightColor = 'transparent';

  el.addEventListener('pointerdown', s.onPointerDown, { passive: true });
  el.addEventListener('click', s.onClick, true);

  _state.set(el, s);
}

function teardown(el) {
  const s = _state.get(el);
  if (!s) return;
  el.removeEventListener('pointerdown', s.onPointerDown);
  el.removeEventListener('click', s.onClick, true);
  window.removeEventListener('pointermove', s.onPointerMove);
  window.removeEventListener('pointerup', s.onPointerUp);
  window.removeEventListener('pointercancel', s.onPointerCancel);
  _state.delete(el);
}

export default {
  mounted: setup,
  beforeUnmount: teardown,
};
