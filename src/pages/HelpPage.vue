<!-- src/pages/HelpPage.vue -->
<template>
  <main class="help-page">
    <!-- 상단 헤더 -->
    <header class="help-header">
      <button class="back-btn" @click="router.back()">←</button>
      <h1>강남톡방 이용 안내</h1>
      <span class="spacer"></span>
    </header>

    <!-- 안내 소개 영역 -->
    <section class="intro">
      <h2>앱 사용 방법을 이미지로 안내해드려요</h2>
      <p>각 메뉴별로 캡쳐한 화면을 슬라이드로 넘기며 확인하세요.</p>

      <button type="button" class="open-btn" @click="openSlides">
        전체 안내 보기
      </button>
    </section>

    <!-- 풀스크린 슬라이드 -->
    <GuideOverlay
      v-model="open"
      :slides="slides"
      :show-text="false"
    />
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import GuideOverlay from '@/components/GuideOverlay.vue'

const router = useRouter()
const open = ref(false)

// ✅ 안내 이미지들 (public/help 폴더)
const slides = [
  {
    key: 'h1',
    title: '현황판 안내',
    desc: '',
    image: '/help/help_01.png',
  },
  {
    key: 'h2',
    title: '가게찾기 안내',
    desc: '',
    image: '/help/help_02.png', // ← 새로 넣은 가게찾기 안내 이미지
  },
  // 나중에 강톡, 제품관, 마이페이지 등 계속 추가 가능
  // { key: 'h3', title: '강톡 안내', image: '/help/help_03.png' },
]

const openSlides = () => {
  open.value = true
}
</script>

<style scoped>
.help-page {
  padding-bottom: 40px;
}

.help-header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
  position: sticky;
  top: 0;
  z-index: 10;
}
.help-header h1 {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 800;
}
.back-btn {
  font-size: 20px;
  background: none;
  border: none;
  cursor: pointer;
}
.spacer {
  width: 24px;
}

.intro {
  padding: 24px 16px;
  text-align: center;
}
.intro h2 {
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 10px;
}
.intro p {
  opacity: 0.7;
  font-size: 14px;
  margin-bottom: 22px;
}

.open-btn {
  background: #ff2c8a;
  color: white;
  padding: 12px 22px;
  border-radius: 14px;
  border: none;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(255, 44, 138, 0.25);
}
</style>
