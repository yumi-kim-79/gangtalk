import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { STORE_CATEGORIES } from '@/constants/stores';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

type Props = { value: string; onChange: (key: string) => void };

/**
 * 카테고리 선택.
 * 가로 스크롤은 오른쪽 항목이 잘려 보여 선택지를 놓치기 쉬워서,
 * 웹처럼 전부 보이도록 줄바꿈(wrap) 방식으로 되돌렸다.
 */
export default function CategoryChips({ value, onChange }: Props) {
  const c = useTheme();
  const s = styles(c);

  return (
    <View style={s.wrap}>
      {STORE_CATEGORIES.map(cat => {
        const active = cat.key === value;
        return (
          <Pressable
            key={cat.key}
            onPress={() => onChange(cat.key)}
            style={[s.chip, active && s.chipActive]}
            android_ripple={{ color: c.chipBorder }}
          >
            {cat.badge ? (
              <Text style={[s.badge, active && s.badgeActive]}>{cat.badge}</Text>
            ) : null}
            <Text style={[s.label, active && s.labelActive]}>{cat.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      paddingHorizontal: spacing.page,
      paddingVertical: spacing.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      height: 34,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: c.chipBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.chipBorder,
    },
    chipActive: { backgroundColor: c.chipActiveBg, borderColor: c.chipActiveBg },
    badge: { fontSize: fontSize.xs, fontWeight: '800', color: c.muted },
    badgeActive: { color: c.chipActiveFg },
    label: { fontSize: fontSize.md, color: c.fg },
    labelActive: { color: c.chipActiveFg, fontWeight: '700' },
  });
