/**
 * 시드가 아닌 게시글이 정확히 뭔지 확인한다.
 *
 * purge-seed-posts 는 isSeed == true 만 지우므로 나머지는 안전하다.
 * 하지만 "사람이 쓴 글" 로 집계된 것들이 정말 사람 글인지,
 * 아니면 isSeed 플래그가 붙기 전에 만들어진 옛 시드인지는 봐야 안다.
 *
 * 작성자별로 묶어 건수·기간·제목 샘플을 보여준다. 아무것도 쓰지 않는다.
 *
 * 실행
 *   cd ~/GangTalk/web
 *   node ../scripts/inspect-nonseed-posts.mjs
 */
import readline from 'node:readline';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const email = process.env.ADMIN_EMAIL || 'gangtalk815@gmail.com';

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

const toMs = v => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (typeof v?.seconds === 'number') return v.seconds * 1000;
  return 0;
};
const day = ms => (ms ? new Date(ms).toISOString().slice(0, 10) : '?');

async function main() {
  console.log(`관리자 계정: ${email}`);
  const password = await askPassword();
  await signInWithEmailAndPassword(getAuth(app), email, password);

  console.log('\n전체 글을 훑는 중… (2만 건 넘어 조금 걸립니다)');
  const snap = await getDocs(collection(db, 'board_posts'));

  const groups = new Map();
  let nonSeed = 0;

  snap.docs.forEach(d => {
    const x = d.data() || {};
    if (x.isSeed === true) return;
    nonSeed += 1;

    const key = `${String(x.author ?? '(이름없음)')} / ${String(x.authorUid ?? '(uid없음)')}`;
    if (!groups.has(key)) groups.set(key, { n: 0, min: Infinity, max: 0, titles: [], cats: new Set() });
    const g = groups.get(key);
    g.n += 1;
    const ms = toMs(x.createdAt ?? x.createdAtMs);
    if (ms) { g.min = Math.min(g.min, ms); g.max = Math.max(g.max, ms); }
    g.cats.add(String(x.category ?? '?'));
    if (g.titles.length < 5) g.titles.push(String(x.title ?? '(제목없음)').slice(0, 30));
  });

  console.log(`\n시드가 아닌 글 ${nonSeed} 건 — 작성자별\n`);
  const rows = [...groups.entries()].sort((a, b) => b[1].n - a[1].n);
  for (const [who, g] of rows) {
    const from = day(g.min === Infinity ? 0 : g.min);
    const to = day(g.max);
    console.log(`● ${who}`);
    console.log(`   ${g.n} 건 · ${from} ~ ${to} · 카테고리 ${[...g.cats].join(', ')}`);
    console.log(`   제목: ${[...new Set(g.titles)].join(' | ')}`);
    console.log('');
  }

  console.log('아무것도 쓰지 않았습니다. (읽기만)');
  process.exit(0);
}

main().catch(e => { console.error('\n실패:', e?.message || e); process.exit(1); });
