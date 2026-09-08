/**
 * 작성자 이름을 밝히지 않은 글의 표기.
 * 웹 web/src/lib/author.js 와 **같은 값을 써야 한다**.
 * 예전에는 '익명' 으로 저장·표시했는데 말을 '비공개' 하나로 통일했다.
 * 이미 '익명' 으로 저장된 옛 글도 화면에서는 '비공개' 로 보이게 매핑한다.
 */
export const ANON_LABEL = '비공개';

export function displayAuthor(name?: string | null): string {
  const n = String(name ?? '').trim();
  if (!n || n === '익명' || n === ANON_LABEL) return ANON_LABEL;
  return n;
}
