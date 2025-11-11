<template>
  <section class="section">
    <div class="panel">
      <div class="avatar" :style="avatarStyle">
        <span v-if="!hasAvatarImage" class="avatar-fallback">🏢</span>
      </div>
      <div class="info">
        <strong class="name">{{ state.company?.name || '기업회원' }}</strong>
        <small class="muted ellip">닉네임: {{ displayNick }}</small>
        <small class="muted">{{ state.profile?.email || state.company?.contact || '-' }}</small>
      </div>
    </div>

    <ul class="list">
      <li class="item">
        <span>사업자등록번호</span>
        <strong>{{ state.company?.brn || '-' }}</strong>
      </li>
      <li class="item">
        <span>주소</span>
        <small class="ellip">{{ state.company?.address || '-' }}</small>
      </li>
      <li class="item">
        <span>담당자</span>
        <small>{{ state.company?.manager || '-' }}</small>
      </li>
      <li class="item">
        <span>연락처</span>
        <small>{{ state.company?.phone || '-' }}</small>
      </li>
    </ul>

    <h3 class="sub">업체 등록/편집 관리</h3>
    <div class="grid actions">
      <button class="act primary" @click="go({ name:'myStores' })">업체 등록/편집</button>
    </div>
  </section>
</template>

<script setup>
defineProps({
  state: { type: Object, required: true },
  displayNick: { type: String, required: true },
  hasAvatarImage: { type: Boolean, required: true },
  avatarStyle: { type: Object, required: true },
  go: { type: Function, required: true },
})
</script>
