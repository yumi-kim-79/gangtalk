import React, { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/common/Icon';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/services/auth';
import type { MainTabParamList } from '@/navigation/types';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

// 이미지는 상대 경로로 — babel module-resolver 의 extensions 에 png 가 없어
// '@/...' 별칭이 에셋까지 확실히 잡아준다는 보장이 없다.
const LOGO = require('../../assets/logo.png');

/** 웹 AppHeader.vue 의 브랜드 문구 — 전 화면 동일 */
const BRAND_TITLE = '강남톡방';
const BRAND_SUB = '강남의 모든 공간, 한눈에.';

/** 일정/달력·고객센터 이식 전까지 메뉴에서 숨긴다 */
const SHOW_TODO_MENU = false;

type Props = {
  /** 검색을 쓰지 않는 화면은 false */
  showSearch?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onChangeSearch?: (v: string) => void;
  onSubmitSearch?: () => void;
  /** 알림벨 왼쪽에 붙는 화면별 액션 (채팅 바로가기 등) */
  right?: React.ReactNode;
};

type MenuItem = {
  key: string;
  emoji: string;
  label: string;
  /** 앱에 아직 없는 화면은 안내만 */
  todo?: boolean;
};

/**
 * 웹 components/common/AppHeader.vue 이식.
 * 웹과 동일하게 **모든 화면이 같은 브랜드 헤더**를 쓴다 (로고 + 강남톡방 + 소개문구,
 * 우측 알림벨 + 햄버거). 화면 이름은 하단 탭이 이미 알려주므로 헤더에 넣지 않는다.
 */
export default function AppHeader({
  showSearch = true,
  searchValue = '',
  searchPlaceholder = '업체명, 지역, 업종을 검색해보세요',
  onChangeSearch,
  onSubmitSearch,
  right,
}: Props) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const s = styles(c);
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const { isLoggedIn } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  /* 웹 notifBadge 는 현재 항상 0 (관리자 알림은 관리자 웹으로 이전됨) */
  const notifBadge = 0;

  const openNotif = useCallback(
    () => navigation.navigate('Profile', { screen: 'ProfileHome' }),
    [navigation],
  );

  /**
   * 웹 메뉴와 같은 구성이되, **앱에 화면이 없는 항목은 노출하지 않는다.**
   * "준비 중" 안내만 뜨는 메뉴는 심사에서 미완성 앱으로 보일 수 있다
   * (Apple 심사지침 2.1 / 4.2). 이식이 끝나면 SHOW_TODO_MENU 를 true 로.
   */
  const menuItems: MenuItem[] = [
    ...(SHOW_TODO_MENU
      ? ([
          { key: 'diary', emoji: '📅', label: '일정/달력', todo: true },
          { key: 'support', emoji: '🎧', label: '고객센터', todo: true },
        ] as MenuItem[])
      : []),
    { key: 'favorites', emoji: '❤️', label: '즐겨찾기' },
    isLoggedIn
      ? { key: 'logout', emoji: '🚪', label: '로그아웃' }
      : { key: 'login', emoji: '🔑', label: '로그인' },
  ];

  const onMenuItem = useCallback(
    async (m: MenuItem) => {
      setMenuOpen(false);
      if (m.todo) {
        Alert.alert(m.label, '앱에서는 준비 중입니다. 웹에서 이용해 주세요.');
        return;
      }
      if (m.key === 'favorites') {
        navigation.navigate('Profile', { screen: 'Favorites' });
        return;
      }
      if (m.key === 'login') {
        navigation.getParent()?.navigate('Auth', { screen: 'Login' });
        return;
      }
      if (m.key === 'logout') {
        try {
          await signOut();
        } catch {
          Alert.alert('로그아웃', '로그아웃에 실패했습니다.');
        }
      }
    },
    [navigation],
  );

  return (
    <View style={[s.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={s.topRow}>
        <View style={s.brand}>
          <Image source={LOGO} style={s.logo} resizeMode="cover" />
          <View style={s.brandText}>
            <Text style={s.title}>{BRAND_TITLE}</Text>
            <Text style={s.subtitle}>{BRAND_SUB}</Text>
          </View>
        </View>

        <View style={s.actions}>
          {right}
          <Pressable onPress={openNotif} hitSlop={6} style={s.iconBtn}>
            <Icon name="bell" size={22} color={c.fg} />
            {notifBadge > 0 ? (
              <View style={s.badge}>
                <Text style={s.badgeText}>{notifBadge}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable onPress={() => setMenuOpen(true)} hitSlop={6} style={s.iconBtn}>
            <Icon name="menu" size={22} color={c.fg} />
          </Pressable>
        </View>
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

      {/* 햄버거 카드형 드롭다운 — 웹 .app-menu-card 와 동일 구성 */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={s.menuDim} onPress={() => setMenuOpen(false)}>
          <Pressable
            style={[s.menuCard, { top: insets.top + 46 }]}
            onPress={() => {}}
          >
            {menuItems.map((m, i) => (
              <Pressable
                key={m.key}
                style={({ pressed }) => [
                  s.menuRow,
                  i > 0 && s.menuDivider,
                  pressed && s.menuRowPressed,
                ]}
                onPress={() => onMenuItem(m)}
              >
                <Text style={s.menuEmoji}>{m.emoji}</Text>
                <Text style={s.menuLabel}>{m.label}</Text>
                <Icon name="chevronRight" size={14} color={c.muted} />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const LOGO_SIZE = 40;

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
      gap: spacing.sm,
      minHeight: 44,
    },

    brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    logo: {
      width: LOGO_SIZE,
      height: LOGO_SIZE,
      borderRadius: radius.sm,
      backgroundColor: c.accentWeak,
    },
    brandText: { flex: 1 },
    title: { fontSize: fontSize.xxl, fontWeight: '900', color: c.accent },
    subtitle: { fontSize: fontSize.sm, color: c.muted, marginTop: 1 },

    actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    iconBtn: { padding: 4 },
    badge: {
      position: 'absolute',
      top: 0,
      right: 0,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 4,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accent,
    },
    badgeText: { fontSize: 9, fontWeight: '800', color: '#ffffff' },

    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 40,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 14,
      backgroundColor: c.chipBg,
    },
    input: { flex: 1, fontSize: fontSize.md, color: c.fg, padding: 0, marginLeft: spacing.sm },
    clear: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    clearText: { fontSize: fontSize.md, color: c.muted },

    menuDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' },
    menuCard: {
      position: 'absolute',
      right: spacing.page,
      minWidth: 210,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      paddingVertical: spacing.xs,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    menuRowPressed: { backgroundColor: c.chipBg },
    menuDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    menuEmoji: { fontSize: fontSize.lg },
    menuLabel: { flex: 1, fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
  });
