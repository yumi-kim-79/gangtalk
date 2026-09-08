/**
 * 실시간 순위 티커 — 웹 StoreFinder 의 .sf-hot 영역 이식.
 * 찜 수 상위 10곳을 1.2초마다 한 줄씩 세로로 올리고, 탭하면 Top 10 시트를 연다.
 * (웹 hotRanks10 / loopedRanks / tickerStyle 과 같은 규칙 — 찜이 전부 0이면 티시 기준)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { likesOf, tcOf } from '@/services/stores';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';
import type { Store } from '@/types/store';

const ITEM_H = 28;
const TICK_MS = 1200;
const SLIDE_MS = 400;

export interface HotRank {
  id: string;
  name: string;
  intro: string;
}

const toRank = (s: Store): HotRank => ({
  id: s.id,
  name: String(s.name ?? ''),
  intro: String(s.adTitle ?? s.desc ?? s.description ?? ''),
});

/** 웹 hotRanks10 과 같은 계산 (관리자 지정 → 찜 수 → 티시) */
export function hotRanks10(stores: Store[], adminIds: string[] = []): HotRank[] {
  if (adminIds.length) {
    const byId = new Map(stores.map(s => [s.id, s]));
    const picked = adminIds
      .map(id => byId.get(String(id)))
      .filter((s): s is Store => !!s)
      .slice(0, 10);
    if (picked.length) return picked.map(toRank);
  }
  let arr = stores.slice().sort((a, b) => likesOf(b) - likesOf(a));
  // 찜이 전부 0이면 순서가 의미 없어 티시 기준으로 바꾼다 (웹과 동일)
  if (!arr.some(s => likesOf(s) > 0)) {
    arr = stores.slice().sort((a, b) => tcOf(b) - tcOf(a));
  }
  return arr.slice(0, 10).map(toRank);
}

type Props = {
  stores: Store[];
  /** 관리자 지정 순서 (config/marketing.hotRanks) */
  adminIds?: string[];
  onOpenStore: (storeId: string) => void;
};

export default function HotRankTicker({ stores, adminIds = [], onOpenStore }: Props) {
  const c = useTheme();
  const s = styles(c);
  const insets = useSafeAreaInsets();

  const ranks = useMemo(() => hotRanks10(stores, adminIds), [stores, adminIds]);
  const [open, setOpen] = useState(false);
  const y = useRef(new Animated.Value(0)).current;
  const idx = useRef(0);

  useEffect(() => {
    idx.current = 0;
    y.setValue(0);
    if (ranks.length < 2) return;
    const t = setInterval(() => {
      const next = idx.current + 1;
      Animated.timing(y, {
        toValue: -next * ITEM_H,
        duration: SLIDE_MS,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        // 마지막(복제된 첫 항목)까지 올라가면 애니메이션 없이 처음으로 되돌린다
        if (next >= ranks.length) {
          idx.current = 0;
          y.setValue(0);
        } else {
          idx.current = next;
        }
      });
    }, TICK_MS);
    return () => clearInterval(t);
  }, [ranks.length, y]);

  if (!ranks.length) return null;

  // 마지막에 첫 항목을 한 번 더 붙여 순환이 끊겨 보이지 않게 한다 (웹 loopedRanks)
  const looped = [...ranks, ranks[0]];

  return (
    <>
      <Pressable style={s.bar} onPress={() => setOpen(true)}>
        <Text style={s.label}>실시간 순위</Text>
        <View style={s.window}>
          <Animated.View style={{ transform: [{ translateY: y }] }}>
            {looped.map((r, i) => (
              <View key={`${r.id}_${i}`} style={s.item}>
                <Text style={s.rank}>{(i % ranks.length) + 1}</Text>
                <Text style={s.name} numberOfLines={1}>
                  {r.name}
                </Text>
                {r.intro ? (
                  <Text style={s.intro} numberOfLines={1}>
                    {r.intro}
                  </Text>
                ) : null}
              </View>
            ))}
          </Animated.View>
        </View>
        <Text style={s.more}>더보기 ›</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[s.sheet, { paddingBottom: insets.bottom + spacing.md }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>실시간 순위 Top 10</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Text style={s.close}>✕</Text>
              </Pressable>
            </View>
            <ScrollView>
              {ranks.map((r, i) => (
                <Pressable
                  key={r.id}
                  style={s.row}
                  onPress={() => {
                    setOpen(false);
                    onOpenStore(r.id);
                  }}
                >
                  <Text style={[s.rank, s.rowRank]}>{i + 1}</Text>
                  <View style={s.rowBody}>
                    <Text style={s.rowName} numberOfLines={1}>
                      {r.name}
                    </Text>
                    {r.intro ? (
                      <Text style={s.rowIntro} numberOfLines={1}>
                        {r.intro}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.page,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.md,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: c.chipBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.chipBorder,
    },
    label: { fontSize: fontSize.sm, fontWeight: '800', color: c.accent },
    window: { flex: 1, height: ITEM_H, overflow: 'hidden' },
    item: { height: ITEM_H, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    rank: {
      minWidth: 18,
      textAlign: 'center',
      fontSize: fontSize.xs,
      fontWeight: '800',
      color: '#fff',
      backgroundColor: c.accent,
      borderRadius: radius.pill,
      overflow: 'hidden',
      paddingVertical: 2,
    },
    name: { fontSize: fontSize.md, fontWeight: '700', color: c.fg, maxWidth: '45%' },
    intro: { flex: 1, fontSize: fontSize.sm, color: c.muted },
    more: { fontSize: fontSize.sm, color: c.muted },

    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.md,
      borderTopRightRadius: radius.md,
      paddingHorizontal: spacing.page,
      paddingTop: spacing.lg,
      maxHeight: '75%',
    },
    sheetHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: spacing.md,
    },
    sheetTitle: { fontSize: fontSize.xl, fontWeight: '800', color: c.fg },
    close: { fontSize: fontSize.xl, color: c.muted },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    rowRank: { paddingVertical: 3, minWidth: 22 },
    rowBody: { flex: 1, gap: 2 },
    rowName: { fontSize: fontSize.lg, fontWeight: '700', color: c.fg },
    rowIntro: { fontSize: fontSize.sm, color: c.muted },
  });
