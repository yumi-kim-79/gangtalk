import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { POSTS_PER_PAGE } from '@/constants/board';
import { loadMorePosts, subscribePosts } from '@/services/board';
import type { BoardCategory, Post } from '@/types/post';

type Cursor = FirebaseFirestoreTypes.QueryDocumentSnapshot | null;

/**
 * 게시판 목록.
 * 첫 페이지는 실시간 구독, 이후는 커서 기반 추가 로드.
 * 웹처럼 추가분(olderPosts)을 따로 보관해 onSnapshot 갱신에 덮이지 않게 한다.
 */
export function usePosts(
  filter: BoardCategory | 'all',
  /** 커뮤니티 묶음이 지정되면 '전체' 도 이 카테고리들로만 제한한다 */
  allowed?: readonly BoardCategory[],
) {
  const [firstPage, setFirstPage] = useState<Post[]>([]);
  const [older, setOlder] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursor = useRef<Cursor>(null);

  useEffect(() => {
    const unsub = subscribePosts(
      (rows, lastDoc) => {
        setFirstPage(rows);
        setLoading(false);
        if (!cursor.current) {
          cursor.current = lastDoc;
          setHasMore(rows.length >= POSTS_PER_PAGE);
        }
      },
      e => {
        setError(e instanceof Error ? e.message : '게시글을 불러오지 못했습니다.');
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor.current) return;
    setLoadingMore(true);
    try {
      const res = await loadMorePosts(cursor.current);
      cursor.current = res.lastDoc;
      setHasMore(res.hasMore);
      setOlder(prev => [...prev, ...res.posts]);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore]);

  /** 첫 페이지와 중복되는 추가분은 버린다 (웹과 동일) */
  const all = useMemo(() => {
    const firstIds = new Set(firstPage.map(p => p.id));
    return [...firstPage, ...older.filter(p => !firstIds.has(p.id))];
  }, [firstPage, older]);

  /** 묶음 + 카테고리 칩을 함께 적용 */
  const inScope = useCallback(
    (p: Post) => {
      if (filter !== 'all') return p.category === filter;
      if (allowed && allowed.length) return allowed.includes(p.category);
      return true;
    },
    [filter, allowed],
  );

  const notices = useMemo(
    () =>
      all
        .filter(p => p.isNotice && inScope(p))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [all, inScope],
  );

  const posts = useMemo(
    () =>
      all
        .filter(p => !p.isNotice && inScope(p))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [all, inScope],
  );

  return { posts, notices, loading, loadingMore, hasMore, loadMore, error };
}
