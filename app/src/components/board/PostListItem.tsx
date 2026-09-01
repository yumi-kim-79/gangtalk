import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BOARD_CATEGORY_LABEL } from '@/constants/board';
import { boardDate } from '@/services/board';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { Post } from '@/types/post';

type Props = { post: Post; onPress: (post: Post) => void; showCategory?: boolean };

/**
 * 웹은 번호/제목/작성자/날짜/추천/조회 6열 테이블이지만,
 * 모바일에서 표는 읽기 어려워 제목 + 메타 한 줄 구조로 바꿨다. (표시 항목은 동일)
 */
function PostListItem({ post, onPress, showCategory = true }: Props) {
  const c = useTheme();
  const s = styles(c);

  return (
    <Pressable
      onPress={() => onPress(post)}
      style={({ pressed }) => [s.row, post.isNotice && s.notice, pressed && s.pressed]}
      android_ripple={{ color: c.chipBg }}
    >
      <View style={s.titleLine}>
        {post.isNotice ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>공지</Text>
          </View>
        ) : null}
        <Text style={s.title} numberOfLines={1}>
          {post.title}
        </Text>
        {post.cmtCount > 0 ? <Text style={s.cmt}>[{post.cmtCount}]</Text> : null}
      </View>

      <View style={s.metaLine}>
        {showCategory && !post.isNotice ? (
          <Text style={s.cat}>{BOARD_CATEGORY_LABEL[post.category] ?? post.category}</Text>
        ) : null}
        <Text style={s.meta} numberOfLines={1}>
          {post.author} · {boardDate(post.updatedAt)} · 조회 {post.views}
          {post.likes > 0 ? ` · 추천 ${post.likes}` : ''}
          {post.images.length > 0 ? ` · 사진 ${post.images.length}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

export default React.memo(PostListItem);

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      paddingHorizontal: spacing.page,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
      backgroundColor: c.surface,
      gap: 4,
    },
    notice: { backgroundColor: c.accentWeak },
    pressed: { backgroundColor: c.chipBg },
    titleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: radius.pill,
      backgroundColor: c.accent,
    },
    badgeText: { fontSize: 10, fontWeight: '800', color: '#ffffff' },
    title: { flex: 1, fontSize: fontSize.md, fontWeight: '600', color: c.fg },
    cmt: { fontSize: fontSize.xs, fontWeight: '700', color: c.accent },
    metaLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    cat: {
      fontSize: fontSize.xs,
      color: c.muted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.chipBorder,
      borderRadius: radius.pill,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    meta: { flex: 1, fontSize: fontSize.xs, color: c.muted },
  });
