import { useEffect, useState } from 'react';
import { incView, subscribeComments, subscribePost } from '@/services/board';
import type { Comment, Post } from '@/types/post';

/** 게시글 상세 + 댓글. 진입 시 조회수 1 증가 (웹과 동일) */
export function usePost(postId: string) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    incView(postId);
    const unsubPost = subscribePost(postId, p => {
      setPost(p);
      setLoading(false);
    });
    const unsubComments = subscribeComments(postId, setComments);
    return () => {
      unsubPost();
      unsubComments();
    };
  }, [postId]);

  return { post, comments, loading };
}
