import React, { useCallback, useState } from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from '@/components/common/Icon';
import { BOARD_CATEGORY_LABEL } from '@/constants/board';
import { useAuth } from '@/hooks/useAuth';
import { usePost } from '@/hooks/usePost';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { createComment, likePost, votePost } from '@/services/board';
import { fullDate } from '@/services/board';
import type { CommunityStackParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { Comment, Post } from '@/types/post';

export default function PostDetailScreen() {
  const c = useTheme();
  const s = styles(c);
  const route = useRoute<RouteProp<CommunityStackParamList, 'PostDetail'>>();
  const { post, comments, loading } = usePost(route.params.postId);
  const { profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [voted, setVoted] = useState(false);
  const [liked, setLiked] = useState(false);

  const postId = route.params.postId;

  const onLike = useCallback(async () => {
    if (!requireAuth() || liked) return;
    setLiked(true);
    try {
      await likePost(postId);
    } catch {
      setLiked(false);
    }
  }, [requireAuth, liked, postId]);

  const onVote = useCallback(
    async (choice: 'A' | 'B') => {
      if (!requireAuth() || voted) return;
      setVoted(true);
      try {
        await votePost(postId, choice);
      } catch {
        setVoted(false);
      }
    },
    [requireAuth, voted, postId],
  );

  const onSendComment = useCallback(async () => {
    const uid = requireAuth();
    if (!uid || sending || !commentText.trim()) return;
    setSending(true);
    try {
      await createComment({
        postId,
        uid,
        author: profile?.nickname || '익명',
        body: commentText,
      });
      setCommentText('');
    } finally {
      setSending(false);
    }
  }, [requireAuth, sending, commentText, postId, profile]);

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }
  if (!post) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.emptyTitle}>글을 찾을 수 없습니다</Text>
        <Text style={s.emptyDesc}>삭제되었거나 이동된 글입니다</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.head}>
        <View style={s.catRow}>
          {post.isNotice ? (
            <View style={s.noticeBadge}>
              <Text style={s.noticeText}>공지</Text>
            </View>
          ) : null}
          <Text style={s.cat}>{BOARD_CATEGORY_LABEL[post.category] ?? post.category}</Text>
        </View>

        <Text style={s.title}>{post.title}</Text>
        {post.subtitle ? <Text style={s.subtitle}>{post.subtitle}</Text> : null}

        <Text style={s.meta}>
          {post.author} · {fullDate(post.createdAt)}
        </Text>
        <View style={s.statRow}>
          <Text style={s.stat}>조회 {post.views}</Text>
          <Text style={s.stat}>추천 {post.likes}</Text>
          <Text style={s.stat}>댓글 {comments.length}</Text>
        </View>
      </View>

      {post.images.map(uri => (
        <Image key={uri} source={{ uri }} style={s.image} resizeMode="cover" />
      ))}

      <Text style={s.body}>{post.body || '내용이 없습니다.'}</Text>

      {post.category === 'vote' && (post.optA || post.optB) ? (
        <VoteResult post={post} voted={voted} onVote={onVote} />
      ) : null}

      <View style={s.likeRow}>
        <Pressable
          onPress={onLike}
          style={({ pressed }) => [s.likeBtn, liked && s.likeBtnOn, pressed && s.pressed]}
        >
          <Icon name="heart" size={18} color={liked ? '#ffffff' : c.accent} />
          <Text style={[s.likeText, liked && s.likeTextOn]}>추천 {post.likes + (liked ? 1 : 0)}</Text>
        </Pressable>
      </View>

      <View style={s.commentsHead}>
        <Text style={s.commentsTitle}>댓글 {comments.length}</Text>
      </View>

      {comments.length === 0 ? (
        <Text style={s.noComment}>첫 댓글을 남겨보세요</Text>
      ) : (
        comments.map(cm => <CommentRow key={cm.id} comment={cm} />)
      )}

      <View style={s.commentForm}>
        <TextInput
          style={s.commentInput}
          value={commentText}
          onChangeText={setCommentText}
          placeholder="댓글을 입력하세요"
          placeholderTextColor={c.muted}
          multiline
        />
        <Pressable
          onPress={onSendComment}
          disabled={sending || !commentText.trim()}
          style={({ pressed }) => [
            s.sendBtn,
            (!commentText.trim() || sending) && s.sendBtnOff,
            pressed && s.pressed,
          ]}
        >
          <Text style={s.sendText}>{sending ? '등록 중' : '등록'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/** 투표 결과 + 투표하기 (로그인 필요) */
function VoteResult({
  post,
  voted,
  onVote,
}: {
  post: Post;
  voted: boolean;
  onVote: (choice: 'A' | 'B') => void;
}) {
  const c = useTheme();
  const s = styles(c);
  const total = post.votesA + post.votesB;
  const pctA = total ? Math.round((post.votesA / total) * 100) : 0;
  const pctB = total ? 100 - pctA : 0;

  return (
    <View style={s.vote}>
      <VoteBar
        label={post.optA || 'A'}
        count={post.votesA}
        pct={pctA}
        colors={c}
        disabled={voted}
        onPress={() => onVote('A')}
      />
      <VoteBar
        label={post.optB || 'B'}
        count={post.votesB}
        pct={pctB}
        colors={c}
        disabled={voted}
        onPress={() => onVote('B')}
      />
      <Text style={s.voteTotal}>
        총 {total + (voted ? 1 : 0)}표{voted ? ' · 투표 완료' : ' · 항목을 누르면 투표됩니다'}
      </Text>
    </View>
  );
}

function VoteBar({
  label,
  count,
  pct,
  colors,
  disabled,
  onPress,
}: {
  label: string;
  count: number;
  pct: number;
  colors: ThemeColors;
  disabled: boolean;
  onPress: () => void;
}) {
  const s = styles(colors);
  return (
    <Pressable style={s.voteRow} onPress={onPress} disabled={disabled}>
      <View style={s.voteLabelRow}>
        <Text style={s.voteLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={s.votePct}>
          {pct}% ({count})
        </Text>
      </View>
      <View style={s.voteTrack}>
        <View style={[s.voteFill, { width: `${pct}%` }]} />
      </View>
    </Pressable>
  );
}

function CommentRow({ comment }: { comment: Comment }) {
  const c = useTheme();
  const s = styles(c);
  return (
    <View style={s.comment}>
      <Text style={s.commentMeta}>
        {comment.author} · {fullDate(comment.createdAt)}
      </Text>
      <Text style={s.commentBody}>{comment.body}</Text>
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    content: { paddingBottom: spacing.xl },
    center: { alignItems: 'center', justifyContent: 'center', gap: 4 },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    emptyDesc: { fontSize: fontSize.sm, color: c.muted },

    head: {
      paddingHorizontal: spacing.page,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
      gap: 6,
    },
    catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    noticeBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: radius.pill,
      backgroundColor: c.accent,
    },
    noticeText: { fontSize: 10, fontWeight: '800', color: '#ffffff' },
    cat: { fontSize: fontSize.xs, color: c.accent, fontWeight: '700' },
    title: { fontSize: fontSize.xl, fontWeight: '800', color: c.fg },
    subtitle: { fontSize: fontSize.md, color: c.muted },
    meta: { fontSize: fontSize.sm, color: c.muted, marginTop: 2 },
    statRow: { flexDirection: 'row', gap: spacing.md, marginTop: 2 },
    stat: { fontSize: fontSize.xs, color: c.muted },

    image: { width: '100%', aspectRatio: 4 / 3, backgroundColor: c.chipBg },
    body: {
      paddingHorizontal: spacing.page,
      paddingVertical: spacing.lg,
      fontSize: fontSize.md,
      lineHeight: 24,
      color: c.fg,
    },

    vote: { paddingHorizontal: spacing.page, paddingBottom: spacing.lg, gap: spacing.md },
    voteRow: { gap: 4 },
    voteLabelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
    voteLabel: { flex: 1, fontSize: fontSize.md, color: c.fg, fontWeight: '600' },
    votePct: { fontSize: fontSize.sm, color: c.muted },
    voteTrack: { height: 8, borderRadius: radius.pill, backgroundColor: c.chipBg },
    voteFill: { height: 8, borderRadius: radius.pill, backgroundColor: c.accent },
    voteTotal: { fontSize: fontSize.xs, color: c.muted, textAlign: 'right' },

    commentsHead: {
      paddingHorizontal: spacing.page,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
    },
    commentsTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    noComment: {
      paddingHorizontal: spacing.page,
      paddingVertical: spacing.lg,
      fontSize: fontSize.sm,
      color: c.muted,
    },
    comment: {
      paddingHorizontal: spacing.page,
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
      gap: 4,
    },
    commentMeta: { fontSize: fontSize.xs, color: c.muted },
    commentBody: { fontSize: fontSize.md, lineHeight: 21, color: c.fg },

    pressed: { opacity: 0.8 },
    likeRow: { alignItems: 'center', paddingBottom: spacing.lg },
    likeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.accent,
      backgroundColor: c.surface,
    },
    likeBtnOn: { backgroundColor: c.accent },
    likeText: { fontSize: fontSize.md, fontWeight: '700', color: c.accent },
    likeTextOn: { color: '#ffffff' },

    commentForm: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      margin: spacing.page,
    },
    commentInput: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.chipBorder,
      backgroundColor: c.surface,
      fontSize: fontSize.md,
      color: c.fg,
    },
    sendBtn: {
      height: 44,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      backgroundColor: c.accent,
    },
    sendBtnOff: { opacity: 0.4 },
    sendText: { fontSize: fontSize.md, fontWeight: '700', color: '#ffffff' },
  });
