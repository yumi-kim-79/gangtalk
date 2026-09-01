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

const [storesSnap, rbSnap, marketingSnap] = await Promise.all([
  getDocs(collection(db, 'stores')),
  getDocs(collection(db, 'rooms_biz')),
  getDoc(doc(db, 'config', 'marketing')),
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

process.exit(0);
