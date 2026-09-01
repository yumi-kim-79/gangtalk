import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import AppHeader from '@/components/common/AppHeader';
import ChipTabs from '@/components/common/ChipTabs';
import Icon from '@/components/common/Icon';
import PostListItem from '@/components/board/PostListItem';
import { BOARD_TABS } from '@/constants/board';
import { usePosts } from '@/hooks/usePosts';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { CommunityStackParamList } from '@/navigation/types';
import { fontSize, spacing, useTheme, type ThemeColors } from '@/theme';
import type { BoardCategory, Post } from '@/types/post';

export default function CommunityScreen() {
  const c = useTheme();
  const s = styles(c);
  const navigation =
    useNavigation<NativeStackNavigationProp<CommunityStackParamList, 'PostList'>>();

  const [filter, setFilter] = useState<BoardCategory | 'all'>('all');
  const [keyword, setKeyword] = useState('');
  const { posts, notices, loading, loadingMore, hasMore, loadMore, error } = usePosts(filter);
  const { requireAuth } = useRequireAuth();

  const onWrite = useCallback(() => {
    if (requireAuth()) navigation.navigate('PostWrite');
  }, [requireAuth, navigation]);

  const openPost = useCallback(
    (post: Post) => navigation.navigate('PostDetail', { postId: post.id }),
    [navigation],
  );

  /** 검색은 이미 받아온 글에 대해서만 (Firestore 전문검색 미지원) */
  const visible = useMemo(() => {
    const merged = [...notices, ...posts];
    const q = keyword.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter(p =>
      `${p.title} ${p.body} ${p.author}`.toLowerCase().includes(q),
    );
  }, [notices, posts, keyword]);

  return (
    <View style={s.root}>
      <FlatList
        data={visible}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PostListItem post={item} onPress={openPost} showCategory={filter === 'all'} />
        )}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        windowSize={7}
        removeClippedSubviews
        onEndReachedThreshold={0.4}
        onEndReached={keyword ? undefined : loadMore}
        ListHeaderComponent={
          <>
            <AppHeader
              searchValue={keyword}
              searchPlaceholder="제목, 내용, 작성자 검색"
              onChangeSearch={setKeyword}
              right={
                <Pressable
                  onPress={() => navigation.navigate('ChatList')}
                  hitSlop={8}
                  style={s.chatBtn}
                >
                  <Icon name="chat" size={22} color={c.fg} />
                </Pressable>
              }
            />
            <ChipTabs
              items={BOARD_TABS}
              value={filter}
              onChange={setFilter}
              fadeColor={c.bg}
            />
            {loading ? <ActivityIndicator color={c.accent} style={s.loading} /> : null}
            {error ? <Text style={s.error}>{error}</Text> : null}
          </>
        }
        ListEmptyComponent={
          loading ? undefined : (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>글이 없습니다</Text>
              <Text style={s.emptyDesc}>
                {keyword ? '다른 검색어로 찾아보세요' : '다른 카테고리를 눌러보세요'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={c.accent} style={s.loading} />
          ) : !hasMore && visible.length > 0 ? (
            <Text style={s.end}>마지막 글입니다</Text>
          ) : undefined
        }
      />

      <Pressable style={s.fab} onPress={onWrite} android_ripple={{ color: '#ffffff33' }}>
        <Text style={s.fabText}>글쓰기</Text>
      </Pressable>
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    chatBtn: { padding: 4 },
    fab: {
      position: 'absolute',
      right: spacing.page,
      bottom: spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      height: 48,
      paddingHorizontal: spacing.lg,
      borderRadius: 24,
      backgroundColor: c.accent,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    fabText: { fontSize: fontSize.md, fontWeight: '700', color: '#ffffff' },
    loading: { marginVertical: spacing.lg },
    error: {
      marginHorizontal: spacing.page,
      marginBottom: spacing.md,
      fontSize: fontSize.sm,
      color: c.muted,
    },
    empty: { alignItems: 'center', paddingVertical: 64, gap: 4 },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    emptyDesc: { fontSize: fontSize.sm, color: c.muted },
    end: {
      textAlign: 'center',
      paddingVertical: spacing.lg,
      fontSize: fontSize.sm,
      color: c.muted,
    },
  });
