// src/store/data.js
import { reactive, watch } from 'vue'

const STORAGE_KEY = 'gt_db_v1'
const UID_KEY = 'gt_uid'

// 간단한 로컬 사용자 ID
function getUid() {
  let u = localStorage.getItem(UID_KEY)
  if (!u) {
    u = 'u_' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem(UID_KEY, u)
  }
  return u
}
export const currentUid = getUid()

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

export const db = reactive({
  /** 메인 현황판(업체) */
  stores: [],
  /** 게시판(다양/익명/투표 공용) */
  general: [],

  /** 메인 현황판에 업체 추가 (업체게시판 생성과 동시에 메인에도 반영) */
  addStore(payload) {
    const id = 's' + Math.random().toString(36).slice(2, 9)
    const now = Date.now()
    const store = {
      id,
      createdAt: now,
      name: payload.name,
      logo: payload.logo || '',
      region: payload.region,
      type: payload.type,
      matchRooms: payload.matchRooms ?? 0,
      matchPeople: payload.matchPeople ?? 0,
      congestion: payload.congestion ?? 'mid', // busy | mid | free
      about: payload.about || '',
      manager: payload.manager || '',
    }
    this.stores.unshift(store)
    return store
  },

  /** 게시판(다양/익명/투표) 생성 */
  addGeneral(payload) {
    const id = 'g' + Math.random().toString(36).slice(2, 9)
    const now = Date.now()
    // 공통 필드
    const base = {
      id,
      title: payload.title,
      subtitle: payload.subtitle || '',
      category: payload.category || 'var', // var | anon | vote
      views: 0,
      updatedAt: now,
    }

    // 투표인 경우 옵션/집계 필드 포함
    if (base.category === 'vote') {
      const a = (payload.optA || '').trim()
      const b = (payload.optB || '').trim()
      const post = {
        ...base,
        optA: a,
        optB: b,
        votes: { a: 0, b: 0 },
        voters: {}, // { uid: 'a' | 'b' }
      }
      this.general.unshift(post)
      return post
    }

    // 일반 글
    this.general.unshift(base)
    return base
  },

  /** 조회수 +1 및 업데이트 시간 갱신 */
  touchGeneral(id) {
    const t = this.general.find((x) => x.id === id)
    if (t) {
      t.views++
      t.updatedAt = Date.now()
    }
  },

  /** 투표 수행/변경 */
  vote(postId, choice /* 'a' | 'b' */, uid = currentUid) {
    const p = this.general.find((x) => x.id === postId && x.category === 'vote')
    if (!p) return { ok: false, reason: 'NOT_FOUND' }
    if (choice !== 'a' && choice !== 'b') return { ok: false, reason: 'BAD_CHOICE' }

    const prev = p.voters[uid]
    if (prev === choice) {
      // 동일 선택: 아무 것도 하지 않음
      return { ok: true, noChange: true, totals: { ...p.votes } }
    }
    // 이전 표 제거
    if (prev === 'a') p.votes.a = Math.max(0, p.votes.a - 1)
    if (prev === 'b') p.votes.b = Math.max(0, p.votes.b - 1)

    // 새 표 반영
    p.voters[uid] = choice
    if (choice === 'a') p.votes.a++
    if (choice === 'b') p.votes.b++
    p.updatedAt = Date.now()

    return { ok: true, totals: { ...p.votes }, mine: choice }
  },

  /** 내가 이 투표에서 선택한 항목 */
  myVote(postId, uid = currentUid) {
    const p = this.general.find((x) => x.id === postId && x.category === 'vote')
    return p?.voters?.[uid] || null
  },

  /** 초기 데이터 (없을 때만) */
  init() {
    const saved = load()
    if (saved) {
      this.stores = saved.stores || []
      this.general = saved.general || []
      return
    }

    // 더미(초기 보기용)
    this.stores = [
      {
        id: 's1',
        name: '바이올릿',
        region: '강남',
        type: '라운지',
        logo: '',
        createdAt: Date.now() - 3600_000,
        matchRooms: 7,
        matchPeople: 2,
        congestion: 'busy',
        about: '바이올릿 라운지입니다.',
        manager: '민수',
      },
      {
        id: 's2',
        name: '라운지 A',
        region: '서초',
        type: '라운지',
        logo: '',
        createdAt: Date.now() - 86_400_000,
        matchRooms: 4,
        matchPeople: 3,
        congestion: 'free',
      },
      {
        id: 's3',
        name: '클럽 C',
        region: '강남',
        type: '클럽',
        logo: '',
        createdAt: Date.now() - 3 * 86_400_000,
        matchRooms: 2,
        matchPeople: 5,
        congestion: 'mid',
      },
    ]

    this.general = [
      {
        id: 'g1',
        category: 'var',
        title: '오늘 강남 가성비 어디?',
        subtitle: '추천 좀!',
        views: 31,
        updatedAt: Date.now() - 600000,
      },
      {
        id: 'g2',
        category: 'anon',
        title: '사장님 썰 푼다',
        subtitle: '익명 보장 ㄱ',
        views: 120,
        updatedAt: Date.now() - 7200000,
      },
      {
        id: 'g3',
        category: 'vote',
        title: '금요일 어디갈까 투표',
        subtitle: '클럽 vs 라운지',
        optA: '클럽',
        optB: '라운지',
        votes: { a: 5, b: 3 },
        voters: {}, // 첫 로드는 투표자 없음
        views: 87,
        updatedAt: Date.now() - 1200000,
      },
      {
        id: 'g4',
        category: 'var',
        title: '신규 제휴 소식',
        subtitle: '이벤트 진행중',
        views: 23,
        updatedAt: Date.now() - 300000,
      },
      {
        id: 'g5',
        category: 'anon',
        title: '첫 방문 팁 공유',
        subtitle: '눈탱이 방지',
        views: 200,
        updatedAt: Date.now() - 500000,
      },
    ]
  },
})

db.init()

/** 로컬스토리지 자동 저장 */
watch(
  db,
  () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ stores: db.stores, general: db.general }),
    )
  },
  { deep: true },
)
