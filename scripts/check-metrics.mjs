/**
 * 현황판 지표 진단 — stores 와 rooms_biz 의 실제 값을 비교한다.
 *
 * 앱/웹 현황판이 관리자 입력과 다르게 보일 때, 어느 쪽 데이터가 어긋났는지 확인용.
 *
 * 실행:
 *   cd ~/GangTalk/web && node ../scripts/check-metrics.mjs
 *   (firebase 패키지가 web/node_modules 에 있어 web 디렉토리에서 실행해야 한다)
 *
 * stores / rooms_biz 는 읽기가 공개라 로그인 없이 동작한다.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCpoG1MamqFD0pMbltCmG46eAhSfnIvqAk',
  authDomain: 'gangtalk-b8eb8.firebaseapp.com',
  projectId: 'gangtalk-b8eb8',
  storageBucket: 'gangtalk-b8eb8.firebasestorage.app',
  messagingSenderId: '804477097788',
  appId: '1:804477097788:web:81adf7b756f7809e0ab039',
});
const db = getFirestore(app);

const n = v => (v === undefined || v === null ? '-' : String(v));

const [storesSnap, rbSnap, marketingSnap, partnersSnap] = await Promise.all([
  getDocs(collection(db, 'stores')),
  getDocs(collection(db, 'rooms_biz')),
  getDoc(doc(db, 'config', 'marketing')),
  getDocs(collection(db, 'partners')),
]);

const marketing = marketingSnap.exists() ? marketingSnap.data() : {};
const homeOrder = Array.isArray(marketing.homeOrder) ? marketing.homeOrder.map(String) : [];

const rb = new Map();
rbSnap.forEach(d => rb.set(d.id, d.data() || {}));

console.log(`stores ${storesSnap.size}건 / rooms_biz ${rb.size}건`);
console.log(`config/marketing.homeOrder ${homeOrder.length}건 ${homeOrder.length ? '' : '⚠️ 비어 있음 — 순서가 앱에 반영되지 않습니다'}\n`);
console.log(
  '업체명'.padEnd(10) +
    'stores(match/persons)'.padEnd(24) +
    'mode/status'.padEnd(16) +
    'rooms_biz(needRooms/needPeople/manualSaved)'.padEnd(46) +
    '앱 표시 예상',
);
console.log('-'.repeat(130));

const rows = [];
storesSnap.forEach(d => {
  const s = d.data() || {};
  const r = rb.get(d.id);

  // 앱(services/dashboard.applyRoomsBiz) 과 동일한 계산
  const inputRooms = Number(r?.needRooms ?? 0);
  const inputPeople = Number(r?.needPeople ?? 0);
  const manualSaved = r?.manualSaved === true;
  const hasInput = manualSaved || inputRooms > 0 || inputPeople > 0;
  const hasPositive = inputRooms > 0 || inputPeople > 0;
  const active = !!r && hasInput && (hasPositive || manualSaved);

  const match = active ? inputRooms : Number(s.match ?? s.needRooms ?? 0);
  const persons = active ? inputPeople : Number(s.persons ?? s.needPeople ?? 0);

  rows.push({
    name: s.name || d.id,
    id: d.id,
    line:
      String(s.name || d.id).padEnd(10) +
      `${n(s.match)}/${n(s.persons)}`.padEnd(24) +
      `${n(s.statusMode)}/${n(s.status)}`.padEnd(16) +
      (r
        ? `${n(r.needRooms)}/${n(r.needPeople)}/${n(r.manualSaved)}`
        : '문서없음'
      ).padEnd(46) +
      `${match}/${persons}` +
      (active ? '  (rooms_biz 채택)' : '  (stores 폴백)'),
    mismatch:
      match !== Number(s.match ?? 0) || persons !== Number(s.persons ?? 0),
  });
});

rows.sort((a, b) => a.name.localeCompare(b.name));
rows.forEach(r => console.log(r.line));

const bad = rows.filter(r => r.mismatch);
if (bad.length) {
  console.log(`\n⚠️  stores 값과 앱 표시가 다른 업소 ${bad.length}건:`);
  bad.forEach(r => console.log(`   - ${r.name} (docId: ${r.id})`));
  console.log('\n   → rooms_biz 에 오래된 manualSaved 0/0 이 남아 stores 값을 덮고 있을 가능성이 큽니다.');
  console.log('      관리자 화면에서 해당 업소 값을 다시 입력하고 [일괄 저장] 하면 양쪽이 동기화됩니다.');
} else {
  console.log('\n✅ 모든 업소에서 stores 와 앱 표시가 일치합니다.');
}

/* ───────── 현황판 노출/기간/순서 진단 ───────── */
console.log('\n\n[현황판 노출 조건]');
console.log(
  '업체명'.padEnd(10) +
    'exposure.dashboard'.padEnd(20) +
    'exposure.gangtalk'.padEnd(20) +
    '노출기간'.padEnd(24) +
    '현황판 순서',
);
console.log('-'.repeat(100));

const now = Date.now();
const orderPos = new Map(homeOrder.map((id, i) => [id, i + 1]));
const hidden = [];

storesSnap.forEach(d => {
  const s = d.data() || {};
  const exp = s.exposure || {};
  const dash = exp.dashboard;
  const gang = exp.gangtalk;

  const start = Number(s.adStart || 0);
  const end = Number(s.adEnd || 0);
  let period = '무기한';
  let periodOk = true;
  if (start || end) {
    if (start && now < start) { period = '시작 전'; periodOk = false; }
    else if (end && now >= end) { period = '만료됨'; periodOk = false; }
    else period = `D-${Math.ceil((end - now) / 86400000)}`;
  }

  // 현황판 정책: dashboard 가 undefined 면 미노출
  const dashOk = dash === true;
  const pos = orderPos.get(d.id);

  console.log(
    String(s.name || d.id).padEnd(10) +
      String(dash === undefined ? '(없음) → 미노출' : dash).padEnd(20) +
      String(gang === undefined ? '(없음) → 노출' : gang).padEnd(20) +
      period.padEnd(24) +
      (pos ? `${pos}번` : '미지정'),
  );

  if (!dashOk || !periodOk) {
    hidden.push(`${s.name || d.id} (${!dashOk ? 'dashboard 미지정/OFF' : ''}${!dashOk && !periodOk ? ', ' : ''}${!periodOk ? period : ''})`);
  }
});

if (hidden.length) {
  console.log(`\n현황판에 안 보이는 업소 ${hidden.length}건:`);
  hidden.forEach(h => console.log('   - ' + h));
}

/* ═══════════════ 제휴관 / Top5 관리자 설정 ═══════════════ */

const partnerOrder = Array.isArray(marketing.partnerOrder) ? marketing.partnerOrder.map(String) : [];
const partnerTopRanks = (marketing.partnerTopRanks && typeof marketing.partnerTopRanks === 'object')
  ? marketing.partnerTopRanks : {};
const topRanks = (marketing.topRanks && typeof marketing.topRanks === 'object') ? marketing.topRanks : {};
const listOrders = (marketing.listOrders && typeof marketing.listOrders === 'object') ? marketing.listOrders : {};

const partners = new Map();
partnersSnap.forEach(d => partners.set(d.id, d.data() || {}));

const partnerApproved = (x = {}) => {
  if (x.active === false) return false;
  if (x.approved === true) return true;
  if (x.approved === false) return false;
  const apply = String(x.applyStatus || '').trim().toLowerCase();
  if (!apply) return true;
  return ['approved', 'active', '승인', '승인완료'].includes(apply);
};
const adOk = (x = {}) => {
  if (!x.adStart && !x.adEnd) return true;
  const t = Date.now();
  if (x.adStart && t < Number(x.adStart)) return false;
  if (x.adEnd && t >= Number(x.adEnd)) return false;
  return true;
};

console.log('\n\n═══════════════ 제휴관(partners) ═══════════════');
console.log(`제휴업체 ${partners.size}건`);
console.log(`config/marketing.partnerOrder ${partnerOrder.length}건 ${partnerOrder.length ? '' : '⚠️ 비어 있음 — 관리자 순서가 앱/웹에 반영되지 않습니다'}`);

const posP = new Map(partnerOrder.map((id, i) => [id, i + 1]));
const hiddenP = [];
console.log('\n순번  업체명                     카테고리   승인  기간');
console.log('─────────────────────────────────────────────────────────────');
[...partners.entries()]
  .sort((a, b) => (posP.get(a[0]) ?? 1e9) - (posP.get(b[0]) ?? 1e9))
  .forEach(([id, x]) => {
    const ok = partnerApproved(x);
    const ad = adOk(x);
    const period = !x.adStart && !x.adEnd ? '무기한'
      : `${x.adStart ? new Date(Number(x.adStart)).toISOString().slice(0, 10) : '-'}~${x.adEnd ? new Date(Number(x.adEnd)).toISOString().slice(0, 10) : '-'}`;
    console.log(
      String(posP.get(id) ?? '-').padStart(4) + '  ' +
      String(x.name || id).padEnd(24) + '  ' +
      String(x.category || '-').padEnd(9) + '  ' +
      (ok ? '  O ' : '  X ') + '  ' + period
    );
    if (!ok || !ad) hiddenP.push(`${x.name || id} (${!ok ? '미승인/비활성' : ''}${!ok && !ad ? ', ' : ''}${!ad ? '기간 ' + period : ''})`);
  });
if (hiddenP.length) {
  console.log(`\n제휴관에 안 보이는 업체 ${hiddenP.length}건:`);
  hiddenP.forEach(h => console.log('   - ' + h));
}

console.log('\n제휴관 카테고리별 Top5 (partnerTopRanks):');
const pKeys = Object.keys(partnerTopRanks);
if (!pKeys.length) console.log('   (지정 없음 — 전부 자동 점수 정렬)');
pKeys.forEach(k => {
  const ids = Array.isArray(partnerTopRanks[k]) ? partnerTopRanks[k] : [];
  const names = ids.map(id => {
    const x = partners.get(String(id));
    if (!x) return `${id}(삭제됨⚠️)`;
    if (x.category !== k) return `${x.name}(카테고리≠${k}⚠️)`;
    if (!partnerApproved(x) || !adOk(x)) return `${x.name}(미노출⚠️)`;
    return x.name;
  });
  console.log(`   ${k.padEnd(7)} ${names.join(' > ') || '(비어 있음)'}`);
});

console.log('\n\n═══════════════ 가게찾기 Top5 / 목록 순서 ═══════════════');
const tKeys = Object.keys(topRanks);
console.log('카테고리별 Top5 (topRanks):');
if (!tKeys.length) console.log('   (지정 없음 — 전부 자동 정렬)');
tKeys.forEach(k => {
  const ids = Array.isArray(topRanks[k]) ? topRanks[k] : [];
  const names = ids.map(id => {
    const d = storesSnap.docs.find(x => x.id === String(id));
    if (!d) return `${id}(삭제됨⚠️)`;
    const x = d.data() || {};
    return x.category !== k ? `${x.name}(카테고리≠${k}⚠️)` : x.name;
  });
  console.log(`   ${k.padEnd(9)} ${names.join(' > ') || '(비어 있음)'}`);
});

const lKeys = Object.keys(listOrders).filter(k => Array.isArray(listOrders[k]) && listOrders[k].length);
console.log('\n카테고리별 목록 순서 (listOrders):');
if (!lKeys.length) console.log('   (지정 없음 — 선택한 정렬 기준만 적용)');
lKeys.forEach(k => console.log(`   ${k.padEnd(9)} ${listOrders[k].length}건`));

process.exit(0);
