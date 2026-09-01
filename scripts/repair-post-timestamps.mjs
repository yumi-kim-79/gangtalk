/**
 * board_posts / comments 타임스탬프 복구.
 *
 * 배경
 *   앱(app/src/services/board.ts)이 createdAt/updatedAt 을 `Date.now()` 숫자로 썼다.
 *   웹은 같은 필드를 serverTimestamp(Timestamp) 로 쓴다.
 *   Firestore 의 값 타입 정렬 순서는 Number < Timestamp 라서
 *     - orderBy('updatedAt','desc') → 숫자 문서가 전부 맨 뒤로 밀린다
 *     - orderBy('createdAt','asc')  → 숫자 댓글이 항상 맨 위에 고정된다
 *   게다가 incView 가 updatedAt 을 숫자로 덮어써서, 웹에서 쓴 정상 글도
 *   앱에서 한 번 열리면 Timestamp → number 로 바뀌어 목록 최하단으로 밀렸다.
 *
 *   코드는 commit dd59948 에서 고쳤지만, 이미 숫자로 저장된 문서는 그대로 남아 있다.
 *   이 스크립트가 그 문서들을 Timestamp 로 되돌린다.
 *
 * 하는 일
 *   board_posts 와 각 글의 comments 서브컬렉션을 훑어
 *   createdAt / updatedAt 이 number 인 문서를 찾아
 *   같은 시각의 Timestamp 로 변환해 다시 쓴다. (값은 보존 — 순서만 바로잡힌다)
 *
 * 실행
 *   cd ~/GangTalk/web
 *   read -s ADMIN_PASSWORD && export ADMIN_PASSWORD ADMIN_EMAIL=gangtalk815@gmail.com
 *   node ../scripts/repair-post-timestamps.mjs           # 미리보기 (아무것도 쓰지 않음)
 *   node ../scripts/repair-post-timestamps.mjs --apply   # 실제 반영
 *
 *   ⚠️ 먼저 미리보기로 건드릴 문서 수를 확인할 것.
 *   ⚠️ board_posts 수정은 관리자 권한이 필요하다 (firestore.rules).
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
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

/** number(ms) 인 필드만 골라 Timestamp 로 바꾼 patch 를 만든다 */
function patchFor(data) {
  const patch = {};
  for (const key of ['createdAt', 'updatedAt']) {
    const v = data?.[key];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      // 초 단위로 저장된 레거시도 방어 (2001년 이전이면 초로 간주)
      const ms = v < 1_000_000_000_000 ? v * 1000 : v;
      patch[key] = Timestamp.fromMillis(ms);
    }
  }
  return Object.keys(patch).length ? patch : null;
}

async function main() {
  if (!email || !password) {
    console.error('ADMIN_EMAIL / ADMIN_PASSWORD 환경변수가 필요합니다.');
    console.error("  read -s ADMIN_PASSWORD && export ADMIN_PASSWORD ADMIN_EMAIL=...");
    process.exit(1);
  }
  await signInWithEmailAndPassword(getAuth(app), email, password);
  console.log(APPLY ? '=== 실제 반영 모드 ===' : '=== 미리보기 (쓰지 않음) ===\n');

  const posts = await getDocs(collection(db, 'board_posts'));
  let postFix = 0;
  let cmtFix = 0;
  let postSeen = 0;
  let cmtSeen = 0;

  for (const p of posts.docs) {
    postSeen++;
    const patch = patchFor(p.data());
    if (patch) {
      postFix++;
      const title = String(p.data()?.title ?? '').slice(0, 24);
      console.log(
        `[post] ${p.id}  ${title}  →  ${Object.keys(patch).join(', ')}`,
      );
      if (APPLY) await updateDoc(doc(db, 'board_posts', p.id), patch);
    }

    const cmts = await getDocs(collection(db, 'board_posts', p.id, 'comments'));
    for (const c of cmts.docs) {
      cmtSeen++;
      const cp = patchFor(c.data());
      if (!cp) continue;
      cmtFix++;
      console.log(`  [cmt] ${p.id}/${c.id}  →  ${Object.keys(cp).join(', ')}`);
      if (APPLY) await updateDoc(doc(db, 'board_posts', p.id, 'comments', c.id), cp);
    }
  }

  console.log('');
  console.log(`글   ${postFix} / ${postSeen} 건 수정 대상`);
  console.log(`댓글 ${cmtFix} / ${cmtSeen} 건 수정 대상`);
  if (!APPLY && postFix + cmtFix > 0) {
    console.log('\n실제로 반영하려면 --apply 를 붙여 다시 실행하세요.');
  }
  process.exit(0);
}

main().catch(e => {
  console.error('실패:', e?.message || e);
  process.exit(1);
});
