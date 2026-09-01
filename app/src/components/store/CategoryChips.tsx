import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { STORE_CATEGORIES } from '@/constants/stores';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

type Props = { value: string; onChange: (key: string) => void };

/**
 * 웹은 2줄 고정 그리드였지만, 앱에서는 가로 스크롤 칩이 표준이라 형태를 바꿨다.
 * (카테고리 항목·순서·라벨은 그대로)
 */
export default function CategoryChips({ value, onChange }: Props) {
  const c = useTheme();
  const s = styles(c);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.row}
      keyboardShouldPersistTaps="handled"
    >
      {STORE_CATEGORIES.map(cat => {
        const active = cat.key === value;
        const prefix = cat.badge ?? cat.emoji ?? '';
        return (
          <Pressable
            key={cat.key}
            onPress={() => onChange(cat.key)}
            style={[s.chip, active && s.chipActive]}
            android_ripple={{ color: c.chipBorder, borderless: false }}
          >
            <Text style={[s.label, active && s.labelActive]}>
              {prefix ? `${prefix} ` : ''}
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      paddingHorizontal: spacing.page,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    chip: {
      minHeight: 36,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: c.chipBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.chipBorder,
    },
    chipActive: { backgroundColor: c.chipActiveBg, borderColor: c.chipActiveBg },
    label: { fontSize: fontSize.md, color: c.fg },
    labelActive: { color: c.chipActiveFg, fontWeight: '700' },
  });
