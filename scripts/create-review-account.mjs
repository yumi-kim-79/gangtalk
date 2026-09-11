/**
 * 스토어 심사용 계정을 만든다 (Play "로그인 세부정보" / App Store "데모 계정").
 *
 * 왜 필요한가:
 *   강톡은 로그인하지 않으면 대부분의 화면이 비어 있다. 심사자가 들어갈 수 없으면
 *   내용을 못 보고 반려한다. 그런데 일반 가입은 SMS 본인인증을 거쳐야 해서
 *   심사자가 진행할 수 없다 → Admin SDK 로 인증을 건너뛴 계정을 직접 만든다.
 *
 * 실행 (맥에서):
 *   node scripts/create-review-account.mjs review@gangtox.com 심사용계정
 *
 * 비밀번호는 인자로 받지 않는다. 실행 중에 물어본다 (셸 히스토리에 남지 않게).
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import readline from 'node:readline'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const require = createRequire(import.meta.url)

const KEY = path.join(root, 'GangTalkMacro', 'serviceAccountKey.json')
if (!fs.existsSync(KEY)) {
  console.error(`서비스 계정 키가 없습니다: ${KEY}`)
  process.exit(1)
}

let admin
try {
  admin = require(path.join(root, 'functions', 'node_modules', 'firebase-admin'))
} catch {
  console.error('firebase-admin 을 찾을 수 없습니다. 먼저 실행하세요:  npm --prefix functions install')
  process.exit(1)
}

const [, , emailArg, nickArg] = process.argv
const email = (emailArg || '').trim().toLowerCase()
const nickname = (nickArg || '심사용계정').trim()
if (!email || !email.includes('@')) {
  console.error('사용법: node scripts/create-review-account.mjs <이메일> [닉네임]')
  process.exit(1)
}

/** 입력을 화면에 찍지 않고 받는다 */
function askHidden(q) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    const onData = (ch) => {
      if (['\n', '\r', ''].includes(ch.toString())) process.stdin.removeListener('data', onData)
      else rl.output.write('\x1B[2K\x1B[200D' + q + '*'.repeat(rl.line.length))
    }
    process.stdin.on('data', onData)
    rl.question(q, (a) => { rl.close(); process.stdout.write('\n'); resolve(a) })
  })
}

const pw = await askHidden('심사용 계정 비밀번호 (6자 이상): ')
if (!pw || pw.length < 6) { console.error('비밀번호는 6자 이상이어야 합니다.'); process.exit(1) }

admin.initializeApp({ credential: admin.credential.cert(require(KEY)) })
const auth = admin.auth()
const db = admin.firestore()

/** app/src/services/auth.ts 의 makeMyCodeV2 와 같은 규칙 */
const makeMyCodeV2 = (mail, seq) =>
  `${(mail.split('@')[0][0] || 'x').toLowerCase()}${String(Math.max(1, seq)).padStart(5, '0')}`

let user
try {
  user = await auth.getUserByEmail(email)
  await auth.updateUser(user.uid, { password: pw, emailVerified: true, disabled: false })
  console.log(`기존 계정을 찾았습니다 → 비밀번호를 재설정했습니다 (uid ${user.uid})`)
} catch (e) {
  if (e.code !== 'auth/user-not-found') throw e
  user = await auth.createUser({ email, password: pw, emailVerified: true, displayName: nickname })
  console.log(`새 계정을 만들었습니다 (uid ${user.uid})`)
}

const userRef = db.doc(`users/${user.uid}`)
const countersRef = db.doc('meta/counters')
const now = admin.firestore.FieldValue.serverTimestamp()

await db.runTransaction(async (tx) => {
  const [cSnap, uSnap] = await Promise.all([tx.get(countersRef), tx.get(userRef)])
  const existing = uSnap.exists ? uSnap.data() : null

  if (existing && Number(existing.myJoinSeq) > 0) {
    tx.set(userRef, {
      profile: { email, nickname, nick: nickname, nicknameLower: nickname.toLowerCase(), uid: user.uid },
      updatedAt: now,
    }, { merge: true })
    return
  }

  const seq = (cSnap.exists ? Number(cSnap.data()?.userSeq ?? 0) : 0) + 1
  const myCode = makeMyCodeV2(email, seq)
  if (cSnap.exists) tx.update(countersRef, { userSeq: seq, updatedAt: now })
  else tx.set(countersRef, { userSeq: 1, updatedAt: now })

  tx.set(userRef, {
    type: 'user',
    provider: 'email',
    profile: { email, nickname, nick: nickname, nicknameLower: nickname.toLowerCase(), uid: user.uid },
    points: 0,
    referral: { myCode, codeVersion: 2, refBy: null, refApplied: false },
    myJoinSeq: seq,
    myRefCode: myCode,
    myRefCreatedAt: now,
    createdAt: now,
    updatedAt: now,
  }, { merge: true })
})

console.log('users 문서까지 만들었습니다. SMS 인증 없이 바로 로그인됩니다.')
console.log('')
console.log('Play Console "로그인 세부정보" 에 넣을 값:')
console.log(`  사용자 이름: ${email}`)
console.log('  비밀번호: (방금 입력한 값)')
console.log('')
console.log('⚠️ 실제 앱에서 로그인이 되는지 반드시 직접 확인한 뒤 제출하세요.')
process.exit(0)
