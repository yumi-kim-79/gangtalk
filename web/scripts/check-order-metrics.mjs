/**
 * 노출 순서 · 현황판 지표 진단 (읽기 전용).
 *
 * 확인하는 것:
 *   1) config/marketing 에 어떤 순서 키가 실제로 저장돼 있는가
 *      (homeOrder=현황판 / partnerOrder=제휴관 / listOrders=가게찾기 / topRanks=Top5)
 *   2) 특정 업체의 stores 값과, 그 업체로 매칭되는 rooms_biz 문서들
 *   3) 현황판이 실제로 어느 rooms_biz 문서를 채택하는지 (tier 규칙 재현)
 *
 * 실행:
 *   cd ~/GangTalk/web
 *   node scripts/check-order-metrics.mjs            # 전체 요약
 *   node scripts/check-order-metrics.mjs 쎄미 레이블  # 특정 업체만 자세히
 *
 * 아무것도 쓰지 않는다.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const names = process.argv.slice(2);

const app = initializeApp({
  apiKey: 'AIzaSyCpoG1MamqFD0pMbltCmG46eAhSfnIvqAk',
  authDomain: 'gangtalk-b8eb8.firebaseapp.com',
  projectId: 'gangtalk-b8eb8',
  storageBucket: 'gangtalk-b8eb8.firebasestorage.app',
  messagingSenderId: '804477097788',
  appId: '1:804477097788:web:81adf7b756f7809e0ab039',
});
const db = getFirestore(app);

const ms = (t) => {
  if (!t) return 0;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  const n = Number(t); return Number.isFinite(n) ? n : 0;
};
const when = (t) => (ms(t) ? new Date(ms(t)).toLocaleString('ko-KR') : '-');

const [stSnap, rbSnap, mkSnap, ptSnap] = await Promise.all([
  getDocs(collection(db, 'stores')),
  getDocs(collection(db, 'rooms_biz')),
  getDoc(doc(db, 'config', 'marketing')),
  getDocs(collection(db, 'partners')),
]);

const stores = [];
stSnap.forEach(d => stores.push({ id: d.id, ...(d.data() || {}) }));
const rooms = [];
rbSnap.forEach(d => rooms.push({ id: d.id, ...(d.data() || {}) }));
const partners = [];
ptSnap.forEach(d => partners.push({ id: d.id, ...(d.data() || {}) }));
const mk = mkSnap.exists() ? (mkSnap.data() || {}) : {};

console.log(`stores ${stores.length} · rooms_biz ${rooms.length} · partners ${partners.length}\n`);

/* ── 1) 순서 키 ── */
console.log('=== config/marketing 저장된 키 ===');
console.log(' ', Object.keys(mk).sort().join(', ') || '(비어 있음)');
const arrLen = (v) => (Array.isArray(v) ? `${v.length}개` : v == null ? '없음' : typeof v);
console.log(`  homeOrder(현황판)   : ${arrLen(mk.homeOrder)}`);
console.log(`  partnerOrder(제휴관): ${arrLen(mk.partnerOrder)}   저장시각 ${when(mk.partnerOrderSavedAt)}`);
console.log(`  listOrders(가게찾기) : ${mk.listOrders ? Object.keys(mk.listOrders).map(k => `${k}=${(mk.listOrders[k]||[]).length}`).join(' ') : '없음'}`);
console.log(`  topRanks(Top5)      : ${mk.topRanks ? Object.keys(mk.topRanks).map(k => `${k}=${(mk.topRanks[k]||[]).length}`).join(' ') : '없음'}`);

/* 제휴관 순서가 실제 partners 문서와 맞물리는지 */
if (Array.isArray(mk.partnerOrder) && mk.partnerOrder.length) {
  const ids = new Set(partners.map(p => p.id));
  const hit = mk.partnerOrder.filter(id => ids.has(String(id)));
  console.log(`\n  → partnerOrder ${mk.partnerOrder.length}개 중 실제 partners 문서와 맞는 것: ${hit.length}개`);
  if (hit.length !== mk.partnerOrder.length) {
    console.log('    맞지 않는 id:', mk.partnerOrder.filter(id => !ids.has(String(id))).slice(0, 10).join(', '));
  }
  console.log('    저장된 순서 앞 5개:');
  mk.partnerOrder.slice(0, 5).forEach((id, i) => {
    const p = partners.find(x => x.id === String(id));
    console.log(`      ${i + 1}. ${p ? p.name : '(없는 문서) ' + id}`);
  });
}

/* ── 2) 업체별 지표 ── */
const targets = names.length ? stores.filter(s => names.includes(String(s.name || ''))) : [];
if (!targets.length && names.length) console.log('\n(해당 이름의 업체를 못 찾음)');

const norm = (v) => String(v || '').replace(/\s+/g, '').toLowerCase();
for (const s of targets) {
  console.log(`\n────────── ${s.name}  (stores/${s.id})`);
  console.log('  stores      :', JSON.stringify({
    match: s.match, persons: s.persons, totalRooms: s.totalRooms, maxPersons: s.maxPersons,
    statusMode: s.statusMode, status: s.status,
  }));
  console.log('  노출/승인   :', JSON.stringify({
    approved: s.approved, active: s.active, hidden: s.hidden, exposure: s.exposure,
    displayOrder: s.displayOrder,
  }));
  console.log('  이미지      :', JSON.stringify({
    thumb: !!s.thumb, cover: !!s.cover, img: !!s.img, images: (s.images || []).length,
  }));
  console.log('  updatedAt   :', when(s.updatedAt));

  const cands = rooms.filter(r =>
    r.id === s.id ||
    String(r.storeId || '') === s.id ||
    (r.name && norm(r.name) === norm(s.name)) ||
    (s.vendorKey && r.id.toLowerCase() === String(s.vendorKey).toLowerCase()));

  if (!cands.length) { console.log('  rooms_biz   : (매칭되는 문서 없음 → stores 값이 그대로 쓰인다)'); continue; }

  // 현황판 tier 규칙 재현: manualSaved(4) > pastedText(3) > 양수(2) > 빈(1)
  const tier = (r) => {
    if (r.manualSaved) return 4;
    if (String(r.lastPastedText || r.manualText || r.bannerText || '').trim()) return 3;
    if (Number(r.needRooms || 0) > 0 || Number(r.needPeople || 0) > 0) return 2;
    return 1;
  };
  const sorted = cands.slice().sort((a, b) =>
    tier(b) - tier(a) || ms(b.manualSavedAt || b.updatedAt) - ms(a.manualSavedAt || a.updatedAt));

  cands.forEach(r => {
    console.log(`  rooms_biz/${r.id}  tier=${tier(r)}${sorted[0].id === r.id ? '  ← 현황판이 채택' : ''}`);
    console.log('     ', JSON.stringify({
      needRooms: r.needRooms, needPeople: r.needPeople, totalRooms: r.totalRooms,
      manualSaved: r.manualSaved, storeId: r.storeId, name: r.name,
      congestion: r.congestion, congestionScore: r.congestionScore,
    }));
    const pasted = String(r.lastPastedText || r.manualText || r.bannerText || '').trim();
    if (pasted) console.log('      붙여넣기:', pasted.replace(/\s+/g, ' ').slice(0, 60));
    console.log('      updatedAt', when(r.manualSavedAt || r.updatedAt));
  });
}

process.exit(0);
