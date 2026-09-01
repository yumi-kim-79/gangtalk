import React, { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import PostListItem from '@/components/board/PostListItem';
import { useAuth } from '@/hooks/useAuth';
import { subscribeMyPosts } from '@/services/mypage';
import type { MainTabParamList } from '@/navigation/types';
import { fontSize, useTheme, type ThemeColors } from '@/theme';
import type { Post } from '@/types/post';

export default function MyPostsScreen() {
  const c = useTheme();
  const s = styles(c);
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const { uid } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    const unsub = subscribeMyPosts(
      uid,
      rows => {
        setPosts(rows);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [uid]);

  const openPost = useCallback(
    (post: Post) =>
      navigation.navigate('Community', { screen: 'PostDetail', params: { postId: post.id } }),
    [navigation],
  );

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={s.root}
      data={posts}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <PostListItem post={item} onPress={openPost} />}
      ListEmptyComponent={
        <View style={s.center}>
          <Text style={s.emptyTitle}>작성한 글이 없습니다</Text>
          <Text style={s.emptyDesc}>강톡 탭에서 첫 글을 남겨보세요</Text>
        </View>
      }
    />
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 4 },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    emptyDesc: { fontSize: fontSize.sm, color: c.muted },
  });
