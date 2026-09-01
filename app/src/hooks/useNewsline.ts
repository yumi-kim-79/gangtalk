import { useEffect, useState } from 'react';
import { subscribeNews, type NewsItem } from '@/services/news';

/** 웹과 동일하게 최신 10건만 순환하고, 2.5초마다 다음 항목으로 넘긴다 */
const VISIBLE_LIMIT = 10;
const ROTATE_MS = 2500;

/**
 * 핫이슈 한줄 뉴스.
 * 관리자 "뉴스/한줄 관리" 저장이 실시간 반영된다.
 */
export function useNewsline() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => subscribeNews(setItems), []);

  const visible = items.slice(0, VISIBLE_LIMIT);

  // 목록이 짧아지면 인덱스 보정
  useEffect(() => {
    setIndex(i => (visible.length === 0 || i >= visible.length ? 0 : i));
  }, [visible.length]);

  useEffect(() => {
    if (visible.length < 2) return;
    const t = setInterval(
      () => setIndex(i => (i + 1) % visible.length),
      ROTATE_MS,
    );
    return () => clearInterval(t);
  }, [visible.length]);

  return { items, visible, current: visible[index] ?? null };
}
