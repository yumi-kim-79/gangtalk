<!-- src/components/mypage/PointRuleModal.vue -->
<template>
  <div class="point-modal-backdrop" @click.self="$emit('close')">
    <section class="point-modal">
      <header class="point-modal__header">
        <h2>포인트 적립 기준표</h2>
        <button
          type="button"
          class="point-modal__close"
          @click="$emit('close')"
        >
          ✕
        </button>
      </header>

      <table class="point-table">
        <thead>
          <tr>
            <th>행동</th>
            <th>지급 포인트</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>친구 소개 (추천 가입)</td>
            <td>{{ formatPoint(POINT_RULE.FRIEND_INVITE) }}</td>
          </tr>
          <tr>
            <td>게시글 작성</td>
            <td>{{ formatPoint(POINT_RULE.POST_WRITE) }}</td>
          </tr>
          <tr>
            <td>댓글 작성</td>
            <td>{{ formatPoint(POINT_RULE.COMMENT_WRITE) }}</td>
          </tr>
          <tr>
            <td>베스트 게시글 선정</td>
            <td>{{ formatPoint(POINT_RULE.BEST_POST) }}</td>
          </tr>
          <tr>
            <td>베스트 댓글 선정</td>
            <td>{{ formatPoint(POINT_RULE.BEST_COMMENT) }}</td>
          </tr>
        </tbody>
      </table>

      <p class="point-modal__desc">
        * 포인트 정책은 서비스 운영 상황에 따라 변경될 수 있습니다.
      </p>
    </section>
  </div>
</template>

<script setup>
const POINT_RULE = {
  FRIEND_INVITE: 20000,   // 친구소개 포인트 2만
  POST_WRITE: 500,        // 게시글 작성 포인트 5백
  COMMENT_WRITE: 100,     // 댓글 작성 포인트 1백
  BEST_POST: 3000,        // 베스트 게시글 포인트 3천
  BEST_COMMENT: 2000,     // 베스트 댓글 포인트 2천
}

const formatPoint = (value) => `+${value.toLocaleString('ko-KR')}P`
</script>

<style scoped>
.point-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 6000;
}

.point-modal {
  width: 100%;
  max-width: 480px;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 16px 16px 20px;
  box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.18);
}

.point-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.point-modal__header h2 {
  font-size: 16px;
  font-weight: 700;
}

.point-modal__close {
  border: none;
  background: transparent;
  font-size: 18px;
  line-height: 1;
  padding: 4px;
  cursor: pointer;
}

.point-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.point-table th,
.point-table td {
  padding: 8px 6px;
  text-align: left;
  border-bottom: 1px solid #f1f1f1;
}

.point-table th {
  font-weight: 700;
  background: #fff5fa;
}

.point-table td:nth-child(2) {
  text-align: right;
  font-weight: 600;
  color: #ff2c8a;
}

.point-modal__desc {
  margin-top: 10px;
  font-size: 11px;
  color: #888;
  text-align: right;
}
</style>
