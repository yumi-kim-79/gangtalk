import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@/components/common/Icon';
import { BOARD_GROUPS } from '@/constants/board';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

type Props = {
  /** 현재 보고 있는 묶음 */
  value: string;
  onChange: (groupKey: string) => void;
};

/**
 * 웹 GangTalkPage 의 "주제 별 커뮤니티" 4박스.
 * 누르면 그 커뮤니티의 카테고리만 남긴 목록으로 들어간다.
 */
export default function CommunityBoards({ value, onChange }: Props) {
  const c = useTheme();
  const s = styles(c);

  return (
    <View style={s.wrap}>
      <Text style={s.headTitle}>주제 별 커뮤니티</Text>

      <View style={s.grid}>
        {BOARD_GROUPS.map(b => {
          const on = b.key === value;
          return (
            <Pressable
              key={b.key}
              style={({ pressed }) => [
                s.card,
                on ? s.cardOn : s.cardOff,
                pressed && s.pressed,
              ]}
              onPress={() => onChange(b.key)}
            >
              <Text style={[s.title, on ? s.titleOn : s.titleOff]}>{b.title}</Text>
              <Text style={[s.desc, on ? s.descOn : s.descOff]}>{b.desc}</Text>
              <View style={s.arrow}>
                <Icon
                  name="chevronRight"
                  size={16}
                  color={on ? '#ffffff' : c.accent}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { paddingHorizontal: spacing.page, paddingTop: spacing.md },
    headTitle: {
      fontSize: fontSize.lg,
      fontWeight: '800',
      color: c.fg,
      marginBottom: spacing.sm,
    },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    card: {
      flexGrow: 1,
      flexBasis: '47%',
      minHeight: 84,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      justifyContent: 'center',
    },
    cardOn: { backgroundColor: '#8b7ec8' },
    cardOff: { backgroundColor: c.accentWeak },
    pressed: { opacity: 0.85 },

    title: { fontSize: fontSize.lg, fontWeight: '800', textAlign: 'center' },
    titleOn: { color: '#ffffff' },
    titleOff: { color: c.accent },
    desc: { marginTop: 3, fontSize: fontSize.sm, textAlign: 'center' },
    descOn: { color: '#ffffffcc' },
    descOff: { color: '#a03465' },

    arrow: { position: 'absolute', right: spacing.sm, bottom: spacing.sm },
  });
