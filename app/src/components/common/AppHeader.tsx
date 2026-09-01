import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/common/Icon';
import { fontSize, spacing, useTheme, type ThemeColors } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  /** 검색을 쓰지 않는 화면은 false */
  showSearch?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onChangeSearch?: (v: string) => void;
  onSubmitSearch?: () => void;
  /** 우측 액션 (목록/그리드 전환 등) */
  right?: React.ReactNode;
};

/**
 * 웹 components/common/AppHeader.vue 이식.
 * 웹은 헤더 64 + 검색 48 을 고정 높이로 잡아 페이지 전환 점프를 막았는데,
 * 앱은 네이티브 네비게이션이 그 역할을 하므로 고정 높이 대신 안전영역만 처리한다.
 */
export default function AppHeader({
  title,
  subtitle,
  showSearch = true,
  searchValue = '',
  searchPlaceholder = '업체명, 담당자, 이벤트 검색',
  onChangeSearch,
  onSubmitSearch,
  right,
}: Props) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const s = styles(c);

  return (
    <View style={[s.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={s.topRow}>
        <View style={s.titleBox}>
          <Text style={s.title}>{title}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>

      {showSearch ? (
        <View style={s.searchBox}>
          <Icon name="search" size={18} color={c.muted} />
          <TextInput
            style={s.input}
            value={searchValue}
            onChangeText={onChangeSearch}
            onSubmitEditing={onSubmitSearch}
            placeholder={searchPlaceholder}
            placeholderTextColor={c.muted}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {searchValue.length > 0 && Platform.OS === 'android' ? (
            <Pressable onPress={() => onChangeSearch?.('')} style={s.clear}>
              <Text style={s.clearText}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: {
      backgroundColor: c.surface,
      paddingHorizontal: spacing.page,
      paddingBottom: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 34,
    },
    titleBox: { flex: 1 },
    title: { fontSize: fontSize.xl, fontWeight: '800', color: c.accent },
    subtitle: { fontSize: fontSize.xs, color: c.muted, marginTop: 1 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 40,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: 14,
      backgroundColor: c.chipBg,
    },
    searchIcon: { marginRight: spacing.sm },
    input: { flex: 1, fontSize: fontSize.md, color: c.fg, padding: 0, marginLeft: spacing.sm },
    clear: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    clearText: { fontSize: fontSize.md, color: c.muted },
  });
