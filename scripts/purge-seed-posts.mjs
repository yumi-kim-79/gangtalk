/**
 * 시드(자동 생성) 게시글·댓글 정리.
 *
 * 배경
 *   functions/index.js 의 tickSeeder 가 **매분** 실행되며 하루 최대 28건을
 *   "운영팀"(authorUid: 'seed-admin') 이름으로 board_posts 에 넣어 왔다.
 *   게시판이 비어 보이지 않게 하려던 장치인데, 제목 후보가 카테고리당 3~4개뿐이라
 *   실사용자가 스크롤하면 같은 제목이 끝없이 반복되는 게 그대로 드러난다.
 *   실서비스 시작 시점에는 지우는 게 맞다.
 *
 * 안전장치
 *   - `isSeed == true` 인 문서만 지운다. 사람이 쓴 글은 절대 건드리지 않는다.
 *   - 기본은 미리보기(dry-run). --apply 를 붙여야 실제로 지운다.
 *   - 지우기 전에 시드/실제 건수를 먼저 보여준다.
 *
 * ⚠️ 먼저 tickSeeder 를 멈춰야 한다. 안 그러면 지우는 동안 계속 새로 생긴다.
 *      npm run deploy:functions      (SEEDER_DISABLED = true 반영)
 *
 * 실행 (비밀번호는 실행 중에 직접 물어본다)
 *   cd ~/GangTalk/web
 *   node ../scripts/purge-seed-posts.mjs           # 미리보기
 *   node ../scripts/purge-seed-posts.mjs --apply   # 실제 삭제
 */
import readline from 'node:readline';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  getDocs,
  getCountFromServer,
  query,
  where,
  limit as fbLimit,
  writeBatch,
} from 'firebase/firestore';

const APPLY = process.argv.includes('--apply');
const email = process.env.ADMIN_EMAIL || 'gangtalk815@gmail.com';

/** 한 번에 처리할 글 수 (댓글 삭제까지 포함하므로 배치 한도 500 보다 넉넉히 작게) */
const PAGE = 100;

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
    if (!process.stdin.isTTY) {
      reject(new Error('대화형 터미널에서 실행해 주세요.'));
      return;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const onKey = () => {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(prompt);
    };
    process.stdout.write(prompt);
    process.stdin.on('data', onKey);
    rl.question('', answer => {
      process.stdin.removeListener('data', onKey);
      rl.close();
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main() {
  console.log(`관리자 계정: ${email}`);
  const password = await askPassword();
  if (!password) {
    console.error('비밀번호가 비어 있습니다.');
    process.exit(1);
  }
  await signInWithEmailAndPassword(getAuth(app), email, password);

  const postsCol = collection(db, 'board_posts');
  const [totalSnap, seedSnap] = await Promise.all([
    getCountFromServer(postsCol),
    getCountFromServer(query(postsCol, where('isSeed', '==', true))),
  ]);
  const total = totalSnap.data().count || 0;
  const seed = seedSnap.data().count || 0;

  console.log('');
  console.log(`전체 글      ${total.toLocaleString()} 건`);
  console.log(`시드 글      ${seed.toLocaleString()} 건  ← 삭제 대상`);
  console.log(`사람이 쓴 글 ${(total - seed).toLocaleString()} 건  ← 그대로 둔다`);
  console.log('');

  if (!APPLY) {
    console.log('미리보기입니다. 아무것도 지우지 않았습니다.');
    if (seed > 0) console.log('실제로 지우려면 --apply 를 붙여 다시 실행하세요.');
    process.exit(0);
  }
  if (seed === 0) {
    console.log('지울 시드 글이 없습니다.');
    process.exit(0);
  }

  console.log('=== 실제 삭제 시작 ===');
  let removedPosts = 0;
  let removedComments = 0;

  // 삭제하면 쿼리 결과에서 사라지므로 커서 없이 같은 쿼리를 반복한다
  for (;;) {
    const snap = await getDocs(query(postsCol, where('isSeed', '==', true), fbLimit(PAGE)));
    if (snap.empty) break;

    for (const d of snap.docs) {
      const cmts = await getDocs(collection(db, 'board_posts', d.id, 'comments'));
      // 댓글 + 글을 한 배치로 (배치 한도 500)
      const batch = writeBatch(db);
      cmts.docs.forEach(c => batch.delete(c.ref));
      batch.delete(d.ref);
      await batch.commit();
      removedComments += cmts.size;
      removedPosts += 1;
    }
    process.stdout.write(`\r삭제 중… 글 ${removedPosts} / 댓글 ${removedComments}   `);
  }

  console.log('');
  console.log('');
  console.log(`완료 — 글 ${removedPosts.toLocaleString()} 건, 댓글 ${removedComments.toLocaleString()} 건 삭제`);
  process.exit(0);
}

main().catch(e => {
  console.error('\n실패:', e?.message || e);
  process.exit(1);
});
