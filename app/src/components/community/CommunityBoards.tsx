import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@/components/common/Icon';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

/** 웹 GangTalkPage 의 "주제 별 커뮤니티" 4박스 이식 */
interface BoardCard {
  key: string;
  title: string;
  desc: string;
  /** 아직 열지 않은 게시판 */
  soon?: boolean;
}

const BOARDS: BoardCard[] = [
  { key: 'gangtalk', title: '강톡', desc: '100% 비공개 게시판' },
  { key: 'healing', title: '힐링톡', desc: '명언·건강·여행·다이어트', soon: true },
  { key: 'store', title: '우리 가게 게시판', desc: '공지·소식·가게 이야기', soon: true },
  { key: 'event', title: '이벤트톡', desc: '이벤트·혜택·참여', soon: true },
];

type Props = {
  /** 열려 있는 게시판(강톡)을 눌렀을 때 */
  onOpen: () => void;
};

export default function CommunityBoards({ onOpen }: Props) {
  const c = useTheme();
  const s = styles(c);

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Text style={s.headTitle}>주제 별 커뮤니티</Text>
      </View>

      <View style={s.grid}>
        {BOARDS.map(b => (
          <Pressable
            key={b.key}
            style={({ pressed }) => [
              s.card,
              b.soon ? s.cardSoon : s.cardOpen,
              pressed && s.pressed,
            ]}
            onPress={() =>
              b.soon
                ? Alert.alert(b.title, '서비스 준비 중입니다.\n곧 만나보실 수 있습니다.')
                : onOpen()
            }
          >
            <Text style={[s.title, b.soon ? s.titleSoon : s.titleOpen]}>{b.title}</Text>
            <Text style={[s.desc, b.soon ? s.descSoon : s.descOpen]}>{b.desc}</Text>

            {b.soon ? (
              <View style={s.badge}>
                <Text style={s.badgeText}>서비스 준비중</Text>
              </View>
            ) : (
              <View style={s.arrow}>
                <Icon name="chevronRight" size={16} color="#ffffff" />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { paddingHorizontal: spacing.page, paddingTop: spacing.md },
    head: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
    headTitle: { flex: 1, fontSize: fontSize.lg, fontWeight: '800', color: c.fg },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    card: {
      flexGrow: 1,
      flexBasis: '47%',
      minHeight: 92,
      padding: spacing.md,
      borderRadius: radius.md,
      justifyContent: 'center',
    },
    cardOpen: { backgroundColor: '#8b7ec8' },
    cardSoon: { backgroundColor: c.accentWeak },
    pressed: { opacity: 0.85 },

    title: { fontSize: fontSize.lg, fontWeight: '800', textAlign: 'center' },
    titleOpen: { color: '#ffffff' },
    titleSoon: { color: c.accent },
    desc: { marginTop: 3, fontSize: fontSize.sm, textAlign: 'center' },
    descOpen: { color: '#ffffffcc' },
    descSoon: { color: '#a03465' },

    badge: {
      alignSelf: 'center',
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: '#ffffffaa',
    },
    badgeText: { fontSize: fontSize.xs, fontWeight: '700', color: c.accent },

    arrow: { position: 'absolute', right: spacing.md, bottom: spacing.sm },
  });
