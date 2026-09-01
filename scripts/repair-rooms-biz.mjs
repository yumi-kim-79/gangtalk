/**
 * rooms_biz 복구 — stores 의 값으로 되돌린다.
 *
 * 배경
 *   docs/audit/2026-06-19-rooms_biz-입력경로-진단.md 에 기록된 사고
 *   ("시드 그대로 일괄 저장 → 전 업소 0/0/manualSaved 덮어쓰기") 의 잔재로,
 *   rooms_biz 다수가 needRooms=0 / needPeople=0 / manualSaved=true 인 채 남아 있다.
 *   현황판(웹·앱)은 manualSaved 를 의도된 값으로 존중하므로 stores 의 실제 값이 가려진다.
 *
 * 하는 일
 *   stores.match/persons 중 하나라도 양수인데 rooms_biz 가 0/0 인 업소에 대해
 *   rooms_biz 를 stores 값으로 다시 채운다. (stores 는 건드리지 않음)
 *
 * 실행
 *   cd ~/GangTalk/web
 *   ADMIN_EMAIL=gangtalk815@gmail.com ADMIN_PASSWORD='...' node ../scripts/repair-rooms-biz.mjs          # 미리보기
 *   ADMIN_EMAIL=gangtalk815@gmail.com ADMIN_PASSWORD='...' node ../scripts/repair-rooms-biz.mjs --apply  # 실제 반영
 *
 *   rooms_biz 쓰기는 관리자 권한이 필요해 로그인해야 한다.
 *   기본은 미리보기(dry-run) — --apply 를 붙여야 실제로 쓴다.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

const APPLY = process.argv.includes('--apply');
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

const app = initializeApp({
  apiKey: 'AIzaSyCpoG1MamqFD0pMbltCmG46eAhSfnIvqAk',
  authDomain: 'gangtalk-b8eb8.firebaseapp.com',
  projectId: 'gangtalk-b8eb8',
  storageBucket: 'gangtalk-b8eb8.firebasestorage.app',
  messagingSenderId: '804477097788',
  appId: '1:804477097788:web:81adf7b756f7809e0ab039',
});
const db = getFirestore(app);

if (APPLY) {
  if (!email || !password) {
    console.error('❌ --apply 에는 ADMIN_EMAIL / ADMIN_PASSWORD 환경변수가 필요합니다.');
    process.exit(1);
  }
  await signInWithEmailAndPassword(getAuth(app), email, password);
  console.log(`🔑 ${email} 로 로그인했습니다.\n`);
}

const [storesSnap, rbSnap] = await Promise.all([
  getDocs(collection(db, 'stores')),
  getDocs(collection(db, 'rooms_biz')),
]);
const rb = new Map();
rbSnap.forEach(d => rb.set(d.id, d.data() || {}));

const targets = [];
storesSnap.forEach(d => {
  const s = d.data() || {};
  const match = Number(s.match ?? 0);
  const persons = Number(s.persons ?? 0);
  if (match <= 0 && persons <= 0) return; // stores 에도 값이 없으면 대상 아님

  const r = rb.get(d.id);
  const rr = Number(r?.needRooms ?? 0);
  const rp = Number(r?.needPeople ?? 0);
  if (rr > 0 || rp > 0) return; // rooms_biz 에 이미 값이 있으면 손대지 않음

  targets.push({
    id: d.id,
    name: s.name || d.id,
    match,
    persons,
    totalRooms: Number(s.totalRooms ?? 0),
    before: r ? `${rr}/${rp}` : '문서없음',
  });
});

console.log(`대상 ${targets.length}건 (stores 에 값이 있는데 rooms_biz 가 0/0)\n`);
targets.forEach(t =>
  console.log(`  ${t.name.padEnd(16)} ${t.before.padEnd(10)} →  ${t.match}/${t.persons}`),
);

if (!targets.length) {
  console.log('\n✅ 복구할 항목이 없습니다.');
  process.exit(0);
}

if (!APPLY) {
  console.log('\n미리보기입니다. 실제로 반영하려면 --apply 를 붙여 다시 실행하세요.');
  process.exit(0);
}

let ok = 0;
for (const t of targets) {
  try {
    await setDoc(
      doc(db, 'rooms_biz', t.id),
      {
        needRooms: t.match,
        needPeople: t.persons,
        need: t.persons,
        totalNeeded: t.persons,
        totalRooms: t.totalRooms,
        manualSaved: true,
        manualSavedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    ok += 1;
  } catch (e) {
    console.error(`  ❌ ${t.name}: ${e?.code || e?.message || e}`);
  }
}
console.log(`\n✅ ${ok}/${targets.length}건 복구 완료.`);
process.exit(0);
