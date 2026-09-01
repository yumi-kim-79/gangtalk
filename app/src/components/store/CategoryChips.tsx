import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { STORE_CATEGORIES } from '@/constants/stores';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

type Props = {
  value: string;
  onChange: (key: string) => void;
  /** 페이드가 자연스럽게 보이도록 화면 배경색을 맞춰준다 */
  fadeColor?: string;
};

const FADE_WIDTH = 28;

/**
 * 카테고리 선택 — 한 줄 가로 스크롤.
 * 줄바꿈 방식은 3줄을 차지해 목록이 밀려서, 칩을 압축(뱃지 제거)하고 한 줄로 되돌렸다.
 * 오른쪽 끝 페이드로 "더 있다"는 신호를 줘서 잘린 것처럼 보이지 않게 한다.
 */
export default function CategoryChips({ value, onChange, fadeColor }: Props) {
  const c = useTheme();
  const s = styles(c);
  const fade = fadeColor ?? c.bg;

  return (
    <View style={s.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.row}
        keyboardShouldPersistTaps="handled"
      >
        {STORE_CATEGORIES.map(cat => {
          const active = cat.key === value;
          return (
            <Pressable
              key={cat.key}
              onPress={() => onChange(cat.key)}
              style={[s.chip, active && s.chipActive]}
              android_ripple={{ color: c.chipBorder }}
            >
              <Text style={[s.label, active && s.labelActive]}>{cat.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View pointerEvents="none" style={s.fade}>
        <Svg width={FADE_WIDTH} height="100%">
          <Defs>
            <LinearGradient id="catFade" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={fade} stopOpacity={0} />
              <Stop offset="1" stopColor={fade} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={FADE_WIDTH} height="100%" fill="url(#catFade)" />
        </Svg>
      </View>
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { position: 'relative' },
    row: {
      paddingHorizontal: spacing.page,
      paddingVertical: spacing.sm,
      gap: 6,
    },
    chip: {
      height: 32,
      justifyContent: 'center',
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      backgroundColor: c.chipBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.chipBorder,
    },
    chipActive: { backgroundColor: c.chipActiveBg, borderColor: c.chipActiveBg },
    label: { fontSize: fontSize.md, color: c.fg },
    labelActive: { color: c.chipActiveFg, fontWeight: '700' },
    fade: { position: 'absolute', right: 0, top: 0, bottom: 0, width: FADE_WIDTH },
  });
