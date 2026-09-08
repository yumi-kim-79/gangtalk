/**
 * 현황판 지표 저장 — 단일 창구.
 *
 * 지표는 두 곳에 살아 있다.
 *   stores/{id}        match / persons / totalRooms / maxPersons / statusMode / status
 *   rooms_biz/{id}     needRooms / needPeople / totalRooms / manualSaved …  ← 현황판이 실제로 읽는 곳
 *
 * 둘을 따로 쓰면 갈라진다. 실제로 그랬다 —
 * MainPage 의 지표 시트가 stores 만 갱신하는 바람에
 *   stores      : match 16 / persons 22   (2026-09-08 갱신)
 *   rooms_biz   : needRooms 0 / needPeople 0, manualSaved=true (2026-09-01)
 * 이 되었고, 현황판은 manualSaved 쪽을 최우선으로 읽어 계속 0/0 을 보여 줬다.
 * "관리자에서 고쳐도 반영이 안 된다" 의 원인.
 *
 * 그래서 지표를 바꾸는 화면은 전부 이 함수만 쓴다.
 */
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'

/** 맞출방/전체방 비율로 혼잡도 자동 판정 (좋음 ≥0.6 · 보통 ≥0.3 · 나쁨) */
export function autoStatusOf(match, totalRooms) {
  const m = Number(match || 0)
  const t = Number(totalRooms || 0)
  if (t <= 0) return '나쁨'
  const r = m / t
  if (r >= 0.6) return '좋음'
  if (r >= 0.3) return '보통'
  return '나쁨'
}

/**
 * stores + rooms_biz 를 한 배치로 함께 쓴다.
 * @param {import('firebase/firestore').Firestore} db
 * @param {string} storeId
 * @param {{match:number,persons:number,totalRooms?:number,maxPersons?:number,statusMode?:string,status?:string}} v
 * @param {object} [extraRoomsBiz] 붙여넣기 원문 등 rooms_biz 에만 넣을 값
 */
export async function saveStoreMetrics(db, storeId, v, extraRoomsBiz = {}) {
  const id = String(storeId || '')
  if (!id) throw new Error('storeId 가 없습니다.')

  const match      = Math.max(0, Number(v.match || 0))
  const persons    = Math.max(0, Number(v.persons || 0))
  const totalRooms = Math.max(0, Number(v.totalRooms || 0))
  const maxPersons = Math.max(0, Number(v.maxPersons || 0))
  const statusMode = String(v.statusMode || 'auto')
  const status = statusMode === 'manual'
    ? String(v.status || '좋음')
    : autoStatusOf(match, totalRooms)
  const now = serverTimestamp()

  const batch = writeBatch(db)
  batch.update(doc(db, 'stores', id), {
    match, persons, totalRooms, maxPersons, statusMode, status, updatedAt: now,
  })
  batch.set(doc(db, 'rooms_biz', id), {
    needRooms: match,
    needPeople: persons,
    need: persons,
    totalNeeded: persons,
    totalRooms,
    manualSaved: true,
    manualSavedAt: now,
    updatedAt: now,
    ...extraRoomsBiz,
  }, { merge: true })
  await batch.commit()
}
