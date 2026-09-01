import React from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from '@/components/common/Icon';
import { BOARD_CATEGORY_LABEL } from '@/constants/board';
import { usePost } from '@/hooks/usePost';
import { fullDate } from '@/services/board';
import type { CommunityStackParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { Comment, Post } from '@/types/post';

export default function PostDetailScreen() {
  const c = useTheme();
  const s = styles(c);
  const route = useRoute<RouteProp<CommunityStackParamList, 'PostDetail'>>();
  const { post, comments, loading } = usePost(route.params.postId);

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

      {post.category === 'vote' && (post.optA || post.optB) ? <VoteResult post={post} /> : null}

      <View style={s.commentsHead}>
        <Text style={s.commentsTitle}>댓글 {comments.length}</Text>
      </View>

      {comments.length === 0 ? (
        <Text style={s.noComment}>첫 댓글을 남겨보세요</Text>
      ) : (
        comments.map(cm => <CommentRow key={cm.id} comment={cm} />)
      )}

      <View style={s.loginHint}>
        <Icon name="chat" size={16} color={c.muted} />
        <Text style={s.loginHintText}>댓글 작성은 로그인 후 이용할 수 있습니다</Text>
      </View>
    </ScrollView>
  );
}

/** 투표 글은 결과 막대만 표시 (투표하기는 로그인 필요 — 인증 작업 때 추가) */
function VoteResult({ post }: { post: Post }) {
  const c = useTheme();
  const s = styles(c);
  const total = post.votesA + post.votesB;
  const pctA = total ? Math.round((post.votesA / total) * 100) : 0;
  const pctB = total ? 100 - pctA : 0;

  return (
    <View style={s.vote}>
      <VoteBar label={post.optA || 'A'} count={post.votesA} pct={pctA} colors={c} />
      <VoteBar label={post.optB || 'B'} count={post.votesB} pct={pctB} colors={c} />
      <Text style={s.voteTotal}>총 {total}표</Text>
    </View>
  );
}

function VoteBar({
  label,
  count,
  pct,
  colors,
}: {
  label: string;
  count: number;
  pct: number;
  colors: ThemeColors;
}) {
  const s = styles(colors);
  return (
    <View style={s.voteRow}>
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
    </View>
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

    loginHint: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      margin: spacing.page,
      padding: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: c.chipBg,
    },
    loginHintText: { fontSize: fontSize.sm, color: c.muted },
  });
