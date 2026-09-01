import { useEffect, useState } from 'react';
import { incView, subscribeComments, subscribePost } from '@/services/board';
import type { Comment, Post } from '@/types/post';

/** 게시글 상세 + 댓글. 진입 시 조회수 1 증가 (웹과 동일) */
export function usePost(postId: string) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    incView(postId);
    // onError 를 넘기지 않으면 구독 실패 시 loading 이 영원히 true 로 남아
    // 상세 화면이 스피너로 멈춘다
    const unsubPost = subscribePost(
      postId,
      p => {
        setPost(p);
        setLoading(false);
      },
      () => {
        setError('글을 불러오지 못했습니다.');
        setLoading(false);
      },
    );
    const unsubComments = subscribeComments(postId, setComments, () => {
      setComments([]);
    });
    return () => {
      unsubPost();
      unsubComments();
    };
  }, [postId]);

  return { post, comments, loading, error };
}
