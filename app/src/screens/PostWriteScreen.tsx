import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/common/Button';
import ChipTabs from '@/components/common/ChipTabs';
import FormField from '@/components/common/FormField';
import { BOARD_TABS } from '@/constants/board';
import { useAuth } from '@/hooks/useAuth';
import { createPost } from '@/services/board';
import type { CommunityStackParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { BoardCategory } from '@/types/post';
import { ANON_LABEL } from '@/constants/author';

/** '전체'는 글의 카테고리가 될 수 없어 제외 */
const WRITE_TABS = BOARD_TABS.filter(t => t.key !== 'all') as {
  key: BoardCategory;
  label: string;
}[];

export default function PostWriteScreen() {
  const c = useTheme();
  const s = styles(c);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<CommunityStackParamList, 'PostWrite'>>();
  const { uid, profile } = useAuth();

  const [category, setCategory] = useState<BoardCategory>('suggest');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async () => {
    setError('');
    if (!uid) {
      setError('로그인이 필요합니다.');
      return;
    }
    if (!title.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }
    if (!body.trim()) {
      setError('내용을 입력해 주세요.');
      return;
    }
    if (category === 'vote' && (!optA.trim() || !optB.trim())) {
      setError('투표 항목 A / B 를 모두 입력해 주세요.');
      return;
    }

    setBusy(true);
    try {
      const postId = await createPost({
        uid,
        author: profile?.nickname || ANON_LABEL,
        category,
        title,
        body,
        optA,
        optB,
      });
      navigation.replace('PostDetail', { postId });
    } catch (e) {
      setError((e as { message?: string })?.message ?? '글을 저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content, { paddingBottom: insets.bottom + spacing.xl }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.label}>카테고리</Text>
      <ChipTabs
        items={WRITE_TABS}
        value={category}
        onChange={setCategory}
        fadeColor={c.bg}
      />

      <View style={s.form}>
        <FormField
          label="제목"
          value={title}
          onChangeText={setTitle}
          placeholder="제목을 입력하세요"
          maxLength={60}
        />

        {category === 'vote' ? (
          <>
            <FormField label="선택지 A" value={optA} onChangeText={setOptA} placeholder="예: 짜장면" />
            <FormField label="선택지 B" value={optB} onChangeText={setOptB} placeholder="예: 짬뽕" />
          </>
        ) : null}

        <View style={s.bodyWrap}>
          <Text style={s.label}>내용</Text>
          <TextInput
            style={s.bodyInput}
            value={body}
            onChangeText={setBody}
            placeholder="내용을 입력하세요"
            placeholderTextColor={c.muted}
            multiline
            textAlignVertical="top"
          />
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <Button label="등록하기" loading={busy} onPress={onSubmit} />
      </View>
    </ScrollView>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    content: { paddingVertical: spacing.md },
    label: {
      paddingHorizontal: spacing.page,
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: c.fg,
    },
    form: { paddingHorizontal: spacing.page, gap: spacing.md, marginTop: spacing.sm },
    bodyWrap: { gap: 6 },
    bodyInput: {
      minHeight: 200,
      padding: spacing.md,
      borderRadius: radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.chipBorder,
      backgroundColor: c.surface,
      fontSize: fontSize.md,
      lineHeight: 22,
      color: c.fg,
    },
    error: { fontSize: fontSize.sm, color: '#dc2626' },
  });
