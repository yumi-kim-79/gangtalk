/**
 * 마케팅 배너 슬라이더 — 웹 StoreFinder 의 배너 영역 이식.
 * 자동 넘김(4초) + 좌우 스와이프 + 핑크 도트 인디케이터.
 * 웹은 translateX 트랙이지만, 앱은 페이징 FlatList 가 관성·접근성 면에서 자연스럽다.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { Banner } from '@/services/banners';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

const AUTO_MS = 4000;
const RATIO = 0.42; // 가로 대비 높이

type Props = { banners: Banner[]; ready: boolean };

export default function BannerSlider({ banners, ready }: Props) {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const s = styles(c);

  /* 페이지 폭은 화면 전체. 카드 좌우 여백은 아이템 '안쪽' 마진으로 준다 —
     아이템 자체에 마진을 주면 실제 폭이 snapToInterval 과 어긋나 스냅이 밀린다. */
  const pageW = width;
  const height = Math.round((width - spacing.page * 2) * RATIO);

  const listRef = useRef<FlatList<Banner>>(null);
  const [index, setIndex] = useState(0);
  /* 사용자가 손으로 넘기는 중에는 자동 넘김이 끼어들지 않게 한다 */
  const paused = useRef(false);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => {
      if (paused.current) return;
      setIndex(prev => {
        const next = (prev + 1) % banners.length;
        listRef.current?.scrollToOffset({ offset: next * pageW, animated: true });
        return next;
      });
    }, AUTO_MS);
    return () => clearInterval(t);
  }, [banners.length, pageW]);

  // 배너 수가 줄면 인덱스가 범위를 벗어날 수 있다
  useEffect(() => {
    if (index >= banners.length) setIndex(0);
  }, [banners.length, index]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / pageW);
      setIndex(Math.max(0, Math.min(i, banners.length - 1)));
      paused.current = false;
    },
    [pageW, banners.length],
  );

  const openLink = useCallback((b: Banner) => {
    if (!b.link) return;
    Linking.openURL(b.link).catch(() => {
      /* 열 수 없는 링크는 무시 — 웹도 조용히 넘어간다 */
    });
  }, []);

  if (!banners.length) {
    // 로딩 중에는 같은 높이의 자리를 잡아 목록이 튀지 않게 한다 (웹 스켈레톤과 동일 의도)
    if (ready) return null;
    return <View style={[s.skeleton, { height }]} />;
  }

  return (
    <View style={s.wrap}>
      <FlatList
        ref={listRef}
        data={banners}
        keyExtractor={b => b.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={pageW}
        decelerationRate="fast"
        onScrollBeginDrag={() => {
          paused.current = true;
        }}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({ length: pageW, offset: pageW * i, index: i })}
        renderItem={({ item }) => (
          <View style={{ width: pageW }}>
          <Pressable
            style={[s.slide, { height }]}
            onPress={() => openLink(item)}
            disabled={!item.link}
          >
            <Image source={{ uri: item.img }} style={s.img} resizeMode="cover" />
            {item.title || item.desc ? (
              <View style={s.caption}>
                {item.title ? (
                  <Text style={s.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                ) : null}
                {item.desc ? (
                  <Text style={s.desc} numberOfLines={1}>
                    {item.desc}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Pressable>
          </View>
        )}
      />
      {banners.length > 1 ? (
        <View style={s.dots}>
          {banners.map((b, i) => (
            <View key={b.id} style={[s.dot, i === index && s.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { paddingTop: spacing.sm, gap: spacing.xs },
    skeleton: {
      marginHorizontal: spacing.page,
      marginTop: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: c.chipBg,
    },
    slide: {
      marginHorizontal: spacing.page,
      borderRadius: radius.md,
      overflow: 'hidden',
      backgroundColor: c.chipBg,
    },
    img: { width: '100%', height: '100%' },
    caption: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: spacing.md,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    title: { fontSize: fontSize.lg, fontWeight: '800', color: '#fff' },
    desc: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.85)' },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.chipBorder },
    dotOn: { backgroundColor: c.accent, width: 14 },
  });
