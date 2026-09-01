// src/lib/firestoreSafe.js
import { addDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore'
import { setLogLevel } from 'firebase/firestore'
import { firebaseReady } from '@/firebase' // ✅ 준비 대기 추가
setLogLevel('debug')

function swallowOrThrow(e, trace) {
  if (e?.code === 'permission-denied') {
    console.warn(`[firestoreSafe:${trace}] permission-denied`)
    return false // <- 권한 거부는 false로 반환(기존 정책 유지)
  }
  // update 대상 문서 없음 등은 호출부에서 upsert 사용으로 해결
  throw e
}

/** 디버그 로그(불필요하면 주석 처리) */
function logDropped(trace, reason, detail = {}) {
  console.warn(`[firestoreSafe:${trace}] dropped: ${reason}`, detail)
}

/** docRef 로부터 상위 컬렉션 키를 추출해 화이트리스트에 매핑 */
function getCollectionKeyFromDocRef(docRef) {
  try {
    const path = docRef?.parent?.path || ''
    if (!path) return 'unknown'
    if (path === 'board_posts') return 'board_posts'
    if (/^stores\/[^/]+\/posts$/.test(path)) return 'store_posts'
    if (path === 'rooms_biz') return 'rooms_biz'
    return path
  } catch {
    return 'unknown'
  }
}

/* ───────────────── 허용 키(액션별/컬렉션별) ───────────────── */

const ACTION_ALLOW = {
  // board_posts: 조회/좋아요/댓글/투표 카운터 계열
  'incView':                 new Set(['views', 'updatedAt']),
  'list:auto:view':          new Set(['views', 'updatedAt']),
  'auto:view':               new Set(['views', 'updatedAt']),

  'incLike':                 new Set(['likes', 'updatedAt']),
  'auto:like':               new Set(['likes', 'updatedAt']),

  'incCmtCount':             new Set(['cmtCount', 'updatedAt']),
  'incCmtCountReply':        new Set(['cmtCount', 'updatedAt']),
  'seedComment:incCmtCount': new Set(['cmtCount', 'updatedAt']),
  'seedReply:incCmtCount':   new Set(['cmtCount', 'updatedAt']),

  'doVote':                  new Set(['votesA', 'votesB', 'updatedAt']),

  'updateNotice': new Set([
    'title','subtitle','body','content','category','isNotice','updatedAt'
  ]),

  // stores/{id}/posts/* 카운터
  'incViewStore': new Set(['views', 'updatedAt']),
  'incLikeStore': new Set(['likes', 'updatedAt']),

  // rooms_biz 붙여넣기/카운터(업서트용)
  'roomsBiz:counter': new Set([
    'storeId','storeName',
    'needRooms','needPeople','matched','lastResetDate',
    'lastPasteMsgId','lastPastedText','lastPastedAt',
    'updatedAt','createdAt'
  ]),
}

const COLLECTION_ALLOW = {
  board_posts: new Set([
    'title','subtitle','body','content','category','isNotice',
    'author','authorUid',
    'views','likes','cmtCount',
    'optA','optB','votesA','votesB',
    'createdAt','updatedAt',
  ]),
  store_posts: new Set([
    'title','subtitle','body','content',
    'views','likes',
    'author','authorUid',
    'createdAt','updatedAt',
  ]),
  // rooms_biz 메타(첫 생성/업데이트 공통)
  rooms_biz: new Set([
    'storeId','storeName',
    'needRooms','needPeople','matched','lastResetDate',
    'lastPasteMsgId','lastPastedText','lastPastedAt',
    'createdAt','updatedAt'
  ]),
}

/** 화이트리스트 필터링(허용 키만 통과) */
function filterDataByWhitelist(data, collectionKey, trace) {
  const actionAllow = ACTION_ALLOW[trace]
  const baseAllow   = COLLECTION_ALLOW[collectionKey]
  const allow = actionAllow || baseAllow

  if (!allow) {
    return { filtered: { ...data }, dropped: [] }
  }
  const filtered = {}
  const dropped = []
  for (const [k, v] of Object.entries(data || {})) {
    if (allow.has(k)) filtered[k] = v
    else dropped.push(k)
  }
  return { filtered, dropped }
}

/* ───────────────── 안전 래퍼 ───────────────── */

export async function safeAdd(colRef, data, trace = 'add') {
  await firebaseReady // ✅ 준비 보장
  try {
    await addDoc(colRef, data)
    return true
  } catch (e) {
    return swallowOrThrow(e, trace)
  }
}

/**
 * 성공 시 true, 권한 거부 등으로 실제 쓰기가 안 되면 false를 반환.
 * (기존 “조용히 삼키기” 정책 유지)
 */
export async function safeUpdate(docRef, data, trace = 'update') {
  await firebaseReady // ✅ 준비 보장

  const collectionKey = getCollectionKeyFromDocRef(docRef)
  const { filtered, dropped } = filterDataByWhitelist(data, collectionKey, trace)

  if (dropped.length) {
    logDropped(trace, `not-allowed-fields on ${collectionKey}`, { dropped })
  }
  if (Object.keys(filtered).length === 0) {
    logDropped(trace, `empty-payload-after-filter on ${collectionKey}`)
    return false
  }

  try {
    await updateDoc(docRef, filtered)
    return true
  } catch (e) {
    return swallowOrThrow(e, trace)
  }
}

/** 문서가 없으면 생성, 있으면 병합 업데이트(업서트). setDoc(..., {merge:true}) */
export async function safeUpsert(docRef, data, trace = 'upsert') {
  await firebaseReady // ✅ 준비 보장

  const collectionKey = getCollectionKeyFromDocRef(docRef)
  const { filtered, dropped } = filterDataByWhitelist(data, collectionKey, trace)

  if (dropped.length) {
    logDropped(trace, `not-allowed-fields on ${collectionKey}`, { dropped })
  }
  if (Object.keys(filtered).length === 0) {
    logDropped(trace, `empty-payload-after-filter on ${collectionKey}`)
    return false
  }

  try {
    await setDoc(docRef, filtered, { merge: true })
    return true
  } catch (e) {
    return swallowOrThrow(e, trace)
  }
}

export async function safeDelete(docRef, trace = 'delete') {
  await firebaseReady // ✅ 준비 보장
  try {
    await deleteDoc(docRef)
    return true
  } catch (e) {
    return swallowOrThrow(e, trace)
  }
}
