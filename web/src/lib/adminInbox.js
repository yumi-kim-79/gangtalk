// src/lib/adminInbox.js
import { db } from '@/firebase'
import {
  collection, doc, setDoc, serverTimestamp,
  onSnapshot, query, where, orderBy, limit
} from 'firebase/firestore'

/** 관리자 인박스에 푸시 (이메일은 기존 로직대로) */
export async function pushAdminInbox(payload = {}) {
  const ref = doc(collection(db, 'adminInbox'))
  const data = {
    id: ref.id,
    kind: payload.kind || 'info',
    title: payload.title || '',
    body: payload.body || '',
    meta: payload.meta || {},
    unread: true,                      // ← 배지 집계는 이 필드를 봅니다
    createdAt: serverTimestamp(),
  }
  await setDoc(ref, data)
  return ref.id
}

/**
 * 배지 카운트(미읽음 수) 감시
 * onCount(size:number) 콜백으로 전달
 */
export function watchAdminBadge(onCount) {
  // unread=true 인 것만 집계
  const q = query(
    collection(fbDb, 'adminInbox'),
    where('unread', '==', true),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  const unsub = onSnapshot(q, snap => onCount?.(snap.size),
    err => console.warn('adminInbox watch error:', err))
  return unsub
}
