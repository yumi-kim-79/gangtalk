/**
 * 추천코드 적립 진단.
 *
 * 신규 가입자와 추천인의 users 문서를 실제로 읽어 어느 단계에서 끊겼는지 본다.
 *   1) 신규 가입자에게 referral.refBy 가 저장됐나?          → 앱이 코드를 안 보냈는지
 *   2) refApplied 가 true 인가?                              → 트리거가 돌았는지
 *   3) point_logs 에 referral 기록이 있나?                   → 지급이 실행됐는지
 *   4) 추천인이 그 코드로 검색되나? (referral.myCode)        → 추천인을 못 찾았는지
 *   5) config/points.referralBonus 가 0 은 아닌가?           → 금액이 0이라 안 오른 건지
 *
 * 아무것도 쓰지 않는다. 읽기 전용.
 *
 * 실행
 *   cd ~/GangTalk/web
 *   node ../scripts/check-referral.mjs <신규가입자이메일> <추천코드>
 *   예) node ../scripts/check-referral.mjs yyy1234@naver.com y00001
 */
import readline from 'node:readline';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, query, where, limit } from 'firebase/firestore';

const [targetEmail, refCode] = process.argv.slice(2);
const adminEmail = process.env.ADMIN_EMAIL || 'gangtalk815@gmail.com';

if (!targetEmail || !refCode) {
  console.error('사용법: node ../scripts/check-referral.mjs <신규가입자이메일> <추천코드>');
  process.exit(1);
}

const app = initializeApp({
  apiKey: 'AIzaSyCpoG1MamqFD0pMbltCmG46eAhSfnIvqAk',
  authDomain: 'gangtalk-b8eb8.firebaseapp.com',
  projectId: 'gangtalk-b8eb8',
  storageBucket: 'gangtalk-b8eb8.firebasestorage.app',
  messagingSenderId: '804477097788',
  appId: '1:804477097788:web:81adf7b756f7809e0ab039',
});
const db = getFirestore(app);

function askPassword(prompt = '관리자 비밀번호: ') {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) { reject(new Error('대화형 터미널에서 실행해 주세요.')); return; }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const onKey = () => {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(prompt);
    };
    process.stdout.write(prompt);
    process.stdin.on('data', onKey);
    rl.question('', a => {
      process.stdin.removeListener('data', onKey);
      rl.close();
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write('\n');
      resolve(a);
    });
  });
}

const show = v => (v === undefined ? '(없음)' : JSON.stringify(v));

async function findByEmail(email) {
  for (const f of ['profile.email', 'email']) {
    const qs = await getDocs(query(collection(db, 'users'), where(f, '==', email), limit(1)));
    if (!qs.empty) return { doc: qs.docs[0], field: f };
  }
  return null;
}

async function dumpPointLogs(uid) {
  // point_logs 는 firestore.rules 에 규칙이 없다(Functions 가 admin SDK 로만 쓴다).
  // 읽기가 거부돼도 진단을 멈추지 않는다.
  try {
    const qs = await getDocs(collection(db, 'users', uid, 'point_logs'));
    if (qs.empty) { console.log('   point_logs: (없음)'); return; }
    qs.docs.forEach(d => {
      const x = d.data() || {};
      console.log(`   point_logs/${d.id}: ${x.amount}P  reason=${x.reason}`);
    });
  } catch {
    console.log('   point_logs: (규칙상 조회 불가 — 콘솔에서 직접 확인)');
  }
}

async function main() {
  console.log(`관리자 계정: ${adminEmail}`);
  const password = await askPassword();
  await signInWithEmailAndPassword(getAuth(app), adminEmail, password);

  // ── 1) config/points
  const cfgSnap = await getDoc(doc(db, 'config', 'points'));
  const cfg = cfgSnap.exists() ? (cfgSnap.data() || {}) : null;
  console.log('\n■ config/points');
  console.log(cfg ? `   referralBonus = ${show(cfg.referralBonus)} (없으면 기본 20000)` : '   문서 없음 → 기본 20000 사용');

  // ── 2) 신규 가입자
  console.log(`\n■ 신규 가입자 (${targetEmail})`);
  const found = await findByEmail(targetEmail);
  if (!found) {
    console.log('   ❌ users 에서 못 찾음');
  } else {
    const uid = found.doc.id;
    const d = found.doc.data() || {};
    const r = d.referral || {};
    console.log(`   uid       = ${uid}   (매칭 필드: ${found.field})`);
    console.log(`   points    = ${show(d.points)}`);
    console.log(`   myJoinSeq = ${show(d.myJoinSeq)}`);
    console.log(`   referral.myCode    = ${show(r.myCode)}`);
    console.log(`   referral.refBy     = ${show(r.refBy)}      ← 여기가 (없음)/null 이면 앱이 코드를 안 보낸 것`);
    console.log(`   referral.refApplied= ${show(r.refApplied)} ← true 면 트리거가 지급을 마쳤다는 뜻`);
    console.log(`   최상위 refBy       = ${show(d.refBy)}`);
    await dumpPointLogs(uid);
  }

  // ── 3) 추천인 (코드로 역검색 — 함수와 같은 필드 순서)
  console.log(`\n■ 추천인 검색 (코드 ${refCode})`);
  const fields = ['referral.myCode', 'myCode', 'profile.myCode', 'profile.referralCode', 'profile.refCode'];
  const variants = [...new Set([refCode, refCode.toUpperCase(), refCode.toLowerCase()])];
  let hit = null;
  for (const v of variants) {
    for (const f of fields) {
      const qs = await getDocs(query(collection(db, 'users'), where(f, '==', v), limit(1)));
      if (!qs.empty) { hit = { doc: qs.docs[0], f, v }; break; }
    }
    if (hit) break;
  }
  if (!hit) {
    console.log('   ❌ 이 코드로 추천인을 찾지 못함 → payReferral 이 조용히 return 한다');
  } else {
    const d = hit.doc.data() || {};
    console.log(`   uid    = ${hit.doc.id}  (필드 ${hit.f} / 값 ${hit.v})`);
    console.log(`   nickname = ${show(d.profile?.nickname)}`);
    console.log(`   points = ${show(d.points)}`);
    console.log(`   reward = ${show(d.reward)}`);
    await dumpPointLogs(hit.doc.id);
  }

  console.log('\n읽기만 했습니다.');
  process.exit(0);
}

main().catch(e => { console.error('\n실패:', e?.message || e); process.exit(1); });
