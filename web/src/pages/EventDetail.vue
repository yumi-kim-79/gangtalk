<!-- src/pages/EventDetail.vue -->
<template>
  <main class="page event-page">
    <section class="event-wrap">
      <img
        :src="EVENT_IMAGE"
        alt="강남톡방 오픈 이벤트"
        class="event-img"
      />
    </section>

    <section class="event-footer">
      <!-- ✅ 이벤트 참여하기 (강톡 게시판으로 이동) -->
      <button class="btn join" type="button" @click="goGangtalk">
        이벤트 참여하기
      </button>

      <!-- 하단 두 개 버튼: 7일 숨김 / 메인으로 -->
      <div class="event-footer-row">
        <button class="btn ghost" type="button" @click="onDismissFor7Days">
          7일 동안 보지 않기
        </button>
        <button class="btn primary" type="button" @click="goHome">
          메인화면으로 돌아가기
        </button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

// MainPage.vue에서 쓰는 키랑 반드시 동일해야 함
const EVENT_KEY = 'GANGTOX_EVENT_HIDDEN_UNTIL'
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

// ✅ public/event 폴더 기준 경로 (배포 후: https://gangtox.com/event/event-open-01.jpeg)
const EVENT_IMAGE = '/event/event-open-01.jpeg'

// 공통: 7일 숨김 처리
function hideEventFor7Days() {
  try {
    localStorage.setItem(EVENT_KEY, String(Date.now() + SEVEN_DAYS))
  } catch (e) {
    console.error('EVENT_KEY 저장 실패', e)
  }
}

/** ✅ 메인으로 돌아가기 */
function goHome() {
  // 메인으로 돌아갈 때도 이번 세션에서는 다시 안 뜨도록 7일 숨김 처리
  hideEventFor7Days()
  router.push('/')
}

/** ✅ 7일 동안 이벤트 배너 숨기기 */
function onDismissFor7Days() {
  hideEventFor7Days()
  router.push('/')
}

/** ✅ 이벤트 참여하기 → 강톡 게시판으로 이동 */
function goGangtalk() {
  // 필요하면 여기서 hideEventFor7Days() 를 같이 호출해도 됨
  // hideEventFor7Days()
  router.push('/gangtalk')
}
</script>

<style scoped>
.event-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #000;
  color: #fff;
}

/* 가운데 이벤트 이미지 영역
   - 아래쪽에 버튼 + 하단 탭 높이만큼 여유를 준다 */
.event-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  padding-bottom: 140px; /* 버튼(약 56~64px) + 하단 네비 탭 여유 */
  box-sizing: border-box;
}

/* 이미지가 버튼/탭에 가려지지 않도록 최대 높이 제한 */
.event-img {
  max-width: 100%;
  max-height: calc(100vh - 220px);
  border-radius: 16px;
  object-fit: contain;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
}

/* 하단 버튼 영역: 하단 네비 탭 바로 위에 고정 */
.event-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 60px; /* 하단 네비 탭 높이에 맞게 필요하면 56~64px로 조정 */
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 16px 12px;
  box-sizing: border-box;
  z-index: 20;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.96),
    rgba(0, 0, 0, 0.86)
  );
}

/* 하단 두 개 버튼을 위한 행 */
.event-footer-row {
  display: flex;
  gap: 8px;
}

.btn {
  flex: 1;
  height: 48px;
  border-radius: 999px;
  border: none;
  font-size: 15px;
  font-weight: 600;
}

/* 상단 빨간 테두리 "이벤트 참여하기" */
.btn.join {
  border: 2px solid #ff2d87;
  background: transparent;
  color: #ff2d87;
}

/* 7일 동안 보지 않기 */
.btn.ghost {
  background: #111;
  color: #f4f4f4;
}

/* 메인으로 돌아가기 */
.btn.primary {
  background: #ff2d87;
  color: #fff;
}
</style>
