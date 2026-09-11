/**
 * app/src/constants/legal.ts 를 유일한 원본으로 삼아
 * web/public/privacy.html · web/public/terms.html 정적 페이지를 생성한다.
 *
 * 스토어(Play/App Store)가 요구하는 "공개 URL"이 이 파일들이다.
 *   https://gangtox.com/privacy.html
 *   https://gangtox.com/terms.html
 *
 * 실행: npm run build:legal   (web 디렉터리에서)
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..', '..')
const SRC = path.join(root, 'app', 'src', 'constants', 'legal.ts')
const OUT = path.join(root, 'web', 'public')

// legal.ts 는 타입 주석 몇 개만 쓰는 단순한 상수 파일이라 esbuild 없이 벗겨낸다.
// (esbuild 네이티브 바이너리는 설치한 OS에서만 동작해서 환경을 탄다)
const ts = await readFile(SRC, 'utf8')
const code = ts
  .replace(/export\s+interface\s+\w+\s*\{[^}]*\}/g, '')   // interface 제거
  .replace(/\s+as\s+const(?=\s*;)/g, '')                     // as const 제거
  .replace(/(export\s+const\s+\w+)\s*:\s*[\w.<>\[\]| ]+\s*=/g, '$1 =') // 타입 주석 제거
const mod = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
const { LEGAL_COMPANY, TERMS_SECTIONS, PRIVACY_SECTIONS, DELETION_SECTIONS } = mod

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const unfilled = Object.entries(LEGAL_COMPANY)
  .filter(([, v]) => typeof v === 'string' && v.includes('[사업자정보'))
if (unfilled.length) {
  console.warn('\n⚠️  사업자 정보가 아직 비어 있습니다 — 스토어 심사에서 반려됩니다:')
  for (const [k, v] of unfilled) console.warn(`   ${k}: ${v}`)
  console.warn('   app/src/constants/legal.ts 의 LEGAL_COMPANY 를 채운 뒤 다시 실행하세요.\n')
}

function page({ title, sections, desc }) {
  const body = sections.map((s) => `
    <section>
      <h2>${esc(s.title)}</h2>
      <p>${esc(s.body).replace(/\n/g, '<br>')}</p>
    </section>`).join('')

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · 강톡</title>
<meta name="description" content="${esc(desc)}">
<link rel="icon" href="/icons/icon-192.png">
<style>
  :root{color-scheme:light;--ink:#2b2226;--muted:#6b5b63;--line:#f0dde5;--brand:#e0568e}
  *{box-sizing:border-box}
  body{margin:0;background:#fff;color:var(--ink);
    font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;
    line-height:1.75;font-size:15px;-webkit-text-size-adjust:100%}
  header{background:linear-gradient(115deg,#ffb5cf,#e0568e);color:#fff;padding:36px 20px 30px}
  header .in{max-width:760px;margin:0 auto}
  header .brand{font-size:13px;font-weight:800;letter-spacing:.08em;opacity:.9}
  header h1{margin:6px 0 0;font-size:26px;font-weight:800;letter-spacing:-.5px}
  header .date{margin-top:8px;font-size:13px;opacity:.92}
  main{max-width:760px;margin:0 auto;padding:8px 20px 64px}
  section{padding:22px 0;border-bottom:1px solid var(--line)}
  section:last-of-type{border-bottom:0}
  h2{font-size:16px;font-weight:800;margin:0 0 10px;color:var(--brand);letter-spacing:-.3px}
  p{margin:0;white-space:normal;word-break:keep-all}
  .biz{margin-top:26px;padding:18px 20px;background:#fdf4f8;border-radius:14px;font-size:13.5px;color:var(--muted)}
  .biz b{color:var(--ink)}
  .nav{margin-top:26px;font-size:14px}
  .nav a{color:var(--brand);text-decoration:none;font-weight:700;margin-right:14px}
  @media (min-width:720px){body{font-size:16px}header h1{font-size:32px}}
</style>
</head>
<body>
<header><div class="in">
  <div class="brand">강톡 · 강남톡방</div>
  <h1>${esc(title)}</h1>
  <div class="date">시행일 ${esc(LEGAL_COMPANY.updatedAt)}</div>
</div></header>
<main>
${body}
  <div class="biz">
    <b>${esc(LEGAL_COMPANY.name)}</b><br>
    대표자 ${esc(LEGAL_COMPANY.ceo)} · 사업자등록번호 ${esc(LEGAL_COMPANY.bizNo)}<br>
    ${esc(LEGAL_COMPANY.address)}<br>
    문의 ${esc(LEGAL_COMPANY.email)} · ${esc(LEGAL_COMPANY.phone)}
  </div>
  <div class="nav">
    <a href="/privacy.html">개인정보처리방침</a>
    <a href="/terms.html">이용약관</a>
    <a href="/account-deletion.html">계정 삭제</a>
    <a href="/">강톡 홈</a>
  </div>
</main>
</body>
</html>
`
}

await mkdir(OUT, { recursive: true })
await writeFile(path.join(OUT, 'privacy.html'), page({
  title: '개인정보처리방침',
  sections: PRIVACY_SECTIONS,
  desc: '강톡(강남톡방)이 수집하는 개인정보 항목, 이용 목적, 보유 기간과 이용자의 권리를 안내합니다.',
}))
await writeFile(path.join(OUT, 'terms.html'), page({
  title: '이용약관',
  sections: TERMS_SECTIONS,
  desc: '강톡(강남톡방) 서비스 이용약관입니다.',
}))
await writeFile(path.join(OUT, 'account-deletion.html'), page({
  title: '계정 삭제 안내',
  sections: DELETION_SECTIONS,
  desc: '강톡(강남톡방) 계정을 삭제하는 방법과, 삭제되는 데이터 및 보관되는 데이터를 안내합니다.',
}))

console.log('생성 완료')
console.log('  web/public/privacy.html  →  https://gangtox.com/privacy.html')
console.log('  web/public/terms.html    →  https://gangtox.com/terms.html')
console.log('  web/public/account-deletion.html → https://gangtox.com/account-deletion.html')
