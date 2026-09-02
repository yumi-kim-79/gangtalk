/**
 * 내 활동 관리 — 글 / 댓글 / 대댓글.
 * 웹 UserSection.vue 의 "내 활동 관리" 패널과 동일한 3탭 + 수정/삭제 구성.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import {
  deleteMyComment,
  deleteMyPost,
  fetchMyComments,
  subscribeMyPosts,
  updateMyComment,
  updateMyPost,
  type MyComment,
} from '@/services/mypage';
import type { MainTabParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { Post } from '@/types/post';

type Tab = 'posts' | 'comments' | 'replies';

const TABS: { key: Tab; label: string }[] = [
  { key: 'posts', label: '글' },
  { key: 'comments', label: '댓글' },
  { key: 'replies', label: '대댓글' },
];

const EMPTY_TEXT: Record<Tab, string> = {
  posts: '작성한 글이 없습니다.',
  comments: '작성한 댓글이 없습니다.',
  replies: '작성한 대댓글이 없습니다.',
};

/** 웹 ymd() 와 같은 표기 */
function ymd(ms: number): string {
  if (!ms) return '-';
  const d = new Date(ms);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())}`;
}

function firstLine(v: string): string {
  return String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

type EditState =
  | { kind: 'post'; id: string; title: string; subtitle: string; body: string }
  | { kind: 'comment'; postId: string; id: string; body: string; isReply: boolean }
  | null;

export default function MyPostsScreen() {
  const c = useTheme();
  const s = styles(c);
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const { uid } = useAuth();

  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<MyComment[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  /* 빈 목록이 "댓글 없음"인지 "못 불러옴"인지 화면에서 구분되게 한다 */
  const [notice, setNotice] = useState('');
  const [edit, setEdit] = useState<EditState>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!uid) {
      setLoadingPosts(false);
      setLoadingComments(false);
      return;
    }
    const unsub = subscribeMyPosts(
      uid,
      rows => {
        setPosts(rows);
        setLoadingPosts(false);
      },
      () => setLoadingPosts(false),
    );
    return unsub;
  }, [uid]);

  const reloadComments = useCallback(async () => {
    if (!uid) return;
    setLoadingComments(true);
    setNotice('');
    try {
      const res = await fetchMyComments(uid);
      setComments(res.items);
      if (res.partial) {
        setNotice(
          '댓글을 전부 불러오지 못했습니다.\n' +
            'Firestore 규칙·색인 배포(npm run deploy:rules, deploy:indexes)가 필요합니다.',
        );
      }
    } catch (e) {
      setComments([]);
      setNotice(e instanceof Error ? e.message : '댓글을 불러오지 못했습니다.');
    } finally {
      setLoadingComments(false);
    }
  }, [uid]);

  useEffect(() => {
    reloadComments().catch(() => undefined);
  }, [reloadComments]);

  const onlyComments = useMemo(() => comments.filter(x => !x.parentId), [comments]);
  const onlyReplies = useMemo(() => comments.filter(x => !!x.parentId), [comments]);

  const goPost = useCallback(
    (postId: string) => {
      if (!postId) return;
      navigation.navigate('Community', { screen: 'PostDetail', params: { postId } });
    },
    [navigation],
  );

  /* ── 삭제 ── */
  const askDeletePost = useCallback((p: Post) => {
    Alert.alert('글 삭제', '이 글을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          deleteMyPost(p.id).catch(e =>
            Alert.alert('삭제 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.'),
          );
        },
      },
    ]);
  }, []);

  const askDeleteComment = useCallback(
    (x: MyComment) => {
      Alert.alert(
        x.parentId ? '대댓글 삭제' : '댓글 삭제',
        '이 댓글을 삭제할까요? 대댓글이 있으면 함께 지워질 수 있어요.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => {
              deleteMyComment(x.postId, x.id)
                .then(reloadComments)
                .catch(e =>
                  Alert.alert(
                    '삭제 실패',
                    e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.',
                  ),
                );
            },
          },
        ],
      );
    },
    [reloadComments],
  );

  /* ── 저장 ── */
  const save = useCallback(async () => {
    if (!edit || saving) return;
    setSaving(true);
    try {
      if (edit.kind === 'post') {
        if (!edit.title.trim()) {
          Alert.alert('제목을 입력해 주세요');
          return;
        }
        await updateMyPost(edit.id, {
          title: edit.title,
          subtitle: edit.subtitle,
          body: edit.body,
        });
      } else {
        if (!edit.body.trim()) {
          Alert.alert('내용을 입력해 주세요');
          return;
        }
        await updateMyComment(edit.postId, edit.id, edit.body);
        await reloadComments();
      }
      setEdit(null);
    } catch (e) {
      Alert.alert('수정 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }, [edit, saving, reloadComments]);

  /* ── 행 ── */
  const renderPost = useCallback(
    ({ item }: { item: Post }) => (
      <View style={s.row}>
        <Pressable style={s.body} onPress={() => goPost(item.id)}>
          <Text style={s.ttl} numberOfLines={1}>
            {item.title || '(제목 없음)'}
          </Text>
          {firstLine(item.body || item.subtitle) ? (
            <Text style={s.sub} numberOfLines={1}>
              {firstLine(item.body || item.subtitle)}
            </Text>
          ) : null}
          <Text style={s.meta} numberOfLines={1}>
            {ymd(item.updatedAt || item.createdAt)} / 조회 {item.views.toLocaleString()} /{' '}
            <Text style={s.red}>추천 {item.likes.toLocaleString()}</Text>
          </Text>
        </Pressable>
        <View style={s.actions}>
          <Pressable
            style={s.mini}
            onPress={() =>
              setEdit({
                kind: 'post',
                id: item.id,
                title: item.title,
                subtitle: item.subtitle,
                body: item.body,
              })
            }
          >
            <Text style={s.miniText}>수정</Text>
          </Pressable>
          <Pressable style={[s.mini, s.miniDanger]} onPress={() => askDeletePost(item)}>
            <Text style={[s.miniText, s.miniDangerText]}>삭제</Text>
          </Pressable>
        </View>
      </View>
    ),
    [s, goPost, askDeletePost],
  );

  const renderComment = useCallback(
    ({ item }: { item: MyComment }) => (
      <View style={s.row}>
        <Pressable style={s.body} onPress={() => goPost(item.postId)}>
          <Text style={s.ttl} numberOfLines={1}>
            {item.parentId ? '대댓글 · ' : '댓글 · '}
            {firstLine(item.body)}
          </Text>
          <Text style={s.sub} numberOfLines={1}>
            게시글: {item.postTitle || item.postId}
          </Text>
          <Text style={s.meta}>{ymd(item.updatedAt)}</Text>
        </Pressable>
        <View style={s.actions}>
          <Pressable
            style={s.mini}
            onPress={() =>
              setEdit({
                kind: 'comment',
                postId: item.postId,
                id: item.id,
                body: item.body,
                isReply: !!item.parentId,
              })
            }
          >
            <Text style={s.miniText}>수정</Text>
          </Pressable>
          <Pressable style={[s.mini, s.miniDanger]} onPress={() => askDeleteComment(item)}>
            <Text style={[s.miniText, s.miniDangerText]}>삭제</Text>
          </Pressable>
        </View>
      </View>
    ),
    [s, goPost, askDeleteComment],
  );

  const loading = tab === 'posts' ? loadingPosts : loadingComments;

  const empty = (
    <View style={s.center}>
      {loading ? (
        <ActivityIndicator color={c.accent} />
      ) : (
        <Text style={s.emptyText}>{EMPTY_TEXT[tab]}</Text>
      )}
    </View>
  );

  const header = (
    <View style={s.head}>
      <Text style={s.headTitle}>내 활동 관리</Text>
      <View style={s.tabs}>
        {TABS.map(t => {
          const on = t.key === tab;
          return (
            <Pressable
              key={t.key}
              style={[s.tab, on && s.tabOn]}
              onPress={() => setTab(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text style={[s.tabText, on && s.tabTextOn]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {notice && tab !== 'posts' ? <Text style={s.notice}>{notice}</Text> : null}
    </View>
  );

  return (
    <View style={s.root}>
      {tab === 'posts' ? (
        <FlatList
          data={loading ? [] : posts}
          keyExtractor={item => item.id}
          renderItem={renderPost}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
        />
      ) : (
        <FlatList
          data={loading ? [] : tab === 'comments' ? onlyComments : onlyReplies}
          keyExtractor={item => `${item.postId}_${item.id}`}
          renderItem={renderComment}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          onRefresh={reloadComments}
          refreshing={loadingComments}
        />
      )}

      <Modal visible={!!edit} animationType="slide" transparent onRequestClose={() => setEdit(null)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>
              {edit?.kind === 'post' ? '글 수정' : edit?.isReply ? '대댓글 수정' : '댓글 수정'}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {edit?.kind === 'post' ? (
                <>
                  <Text style={s.label}>제목</Text>
                  <TextInput
                    style={s.input}
                    value={edit.title}
                    onChangeText={v => setEdit({ ...edit, title: v })}
                    placeholder="제목"
                    placeholderTextColor={c.muted}
                  />
                  <Text style={s.label}>부제목</Text>
                  <TextInput
                    style={s.input}
                    value={edit.subtitle}
                    onChangeText={v => setEdit({ ...edit, subtitle: v })}
                    placeholder="부제목 (선택)"
                    placeholderTextColor={c.muted}
                  />
                  <Text style={s.label}>내용</Text>
                  <TextInput
                    style={[s.input, s.area]}
                    value={edit.body}
                    onChangeText={v => setEdit({ ...edit, body: v })}
                    multiline
                    placeholder="내용"
                    placeholderTextColor={c.muted}
                  />
                </>
              ) : edit ? (
                <>
                  <Text style={s.label}>내용</Text>
                  <TextInput
                    style={[s.input, s.area]}
                    value={edit.body}
                    onChangeText={v => setEdit({ ...edit, body: v })}
                    multiline
                    placeholder="내용"
                    placeholderTextColor={c.muted}
                  />
                </>
              ) : null}
            </ScrollView>
            <View style={s.sheetBtns}>
              <Pressable style={[s.btn, s.btnGhost]} onPress={() => setEdit(null)}>
                <Text style={s.btnGhostText}>취소</Text>
              </Pressable>
              <Pressable style={[s.btn, s.btnPrimary]} onPress={save} disabled={saving}>
                <Text style={s.btnPrimaryText}>{saving ? '저장 중…' : '저장'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },

    head: {
      paddingHorizontal: spacing.page,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    headTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    tabs: { flexDirection: 'row', gap: spacing.xs },
    tab: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: c.chipBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.chipBorder,
    },
    tabOn: { backgroundColor: c.chipActiveBg, borderColor: c.chipActiveBg },
    tabText: { fontSize: fontSize.md, color: c.muted, fontWeight: '600' },
    tabTextOn: { color: c.chipActiveFg },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.page,
      paddingVertical: spacing.md,
      backgroundColor: c.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    body: { flex: 1, gap: 2 },
    ttl: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    sub: { fontSize: fontSize.md, color: c.muted },
    meta: { fontSize: fontSize.sm, color: c.muted },
    red: { color: c.accent },

    actions: { flexDirection: 'row', gap: spacing.xs },
    mini: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: c.chipBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.chipBorder,
    },
    miniText: { fontSize: fontSize.md, color: c.fg, fontWeight: '600' },
    miniDanger: { backgroundColor: c.accentWeak, borderColor: c.accentWeak },
    miniDangerText: { color: c.accent },

    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
    emptyText: { fontSize: fontSize.md, color: c.muted },
    notice: { fontSize: fontSize.sm, color: '#dc2626', lineHeight: 16 },

    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.md,
      borderTopRightRadius: radius.md,
      padding: spacing.page,
      gap: spacing.sm,
      maxHeight: '85%',
    },
    sheetTitle: { fontSize: fontSize.xl, fontWeight: '700', color: c.fg },
    label: { fontSize: fontSize.sm, color: c.muted, marginTop: spacing.sm },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: fontSize.lg,
      color: c.fg,
      backgroundColor: c.bg,
      marginTop: 4,
    },
    area: { minHeight: 140, textAlignVertical: 'top' },
    sheetBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    btn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.lg,
      borderRadius: radius.sm,
    },
    btnGhost: { backgroundColor: c.chipBg },
    btnGhostText: { fontSize: fontSize.lg, color: c.fg, fontWeight: '600' },
    btnPrimary: { backgroundColor: c.accent },
    btnPrimaryText: { fontSize: fontSize.lg, color: '#fff', fontWeight: '700' },
  });
