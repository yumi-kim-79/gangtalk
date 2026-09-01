import React, { useCallback, useState } from 'react';
import {
  Alert,
  Clipboard,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from '@/components/common/Icon';
import {
  FAQ,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_KAKAO_ID,
  SUPPORT_KAKAO_URL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_TEL,
  type FaqSegment,
} from '@/constants/support';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

/** 고객센터 — 웹 SupportPage.vue 이식 (운영시간·문의처·FAQ) */
export default function SupportScreen() {
  const c = useTheme();
  const s = styles(c);
  /** 웹과 동일: 첫 항목이 열린 채로 시작하는 단일 아코디언 */
  const [open, setOpen] = useState(0);

  const copy = useCallback((text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('복사되었습니다.', `${label}\n${text}`);
  }, []);

  const call = useCallback(() => {
    Linking.openURL(`tel:${SUPPORT_PHONE_TEL}`).catch(() =>
      Alert.alert('전화 연결', `${SUPPORT_PHONE} 로 직접 걸어 주세요.`),
    );
  }, []);

  const mail = useCallback(() => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() =>
      Alert.alert('메일', SUPPORT_EMAIL),
    );
  }, []);

  const renderSeg = (seg: FaqSegment, i: number) => {
    if (seg.t === 'bold') {
      return (
        <Text key={i} style={s.faqBold}>
          {seg.v}
        </Text>
      );
    }
    if (seg.t === 'mail') {
      return (
        <Text key={i} style={s.faqLink} onPress={mail}>
          {seg.v}
        </Text>
      );
    }
    return <Text key={i}>{seg.v}</Text>;
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.head}>
        <Text style={s.hours}>
          운영시간 <Text style={s.hoursValue}>{SUPPORT_HOURS}</Text>
        </Text>
      </View>

      {/* 문의하기 */}
      <View style={s.card}>
        <Text style={s.cardTitle}>문의하기</Text>

        <View style={s.row}>
          <Text style={s.rowKey}>카카오톡채널</Text>
          <Text style={s.rowValue}>@{SUPPORT_KAKAO_ID}</Text>
          <Pressable
            style={({ pressed }) => [s.smallBtn, pressed && s.pressed]}
            onPress={() => copy(`@${SUPPORT_KAKAO_ID}`, '카카오톡 채널')}
          >
            <Text style={s.smallBtnText}>복사</Text>
          </Pressable>
          {SUPPORT_KAKAO_URL ? (
            <Pressable
              style={({ pressed }) => [s.smallBtn, pressed && s.pressed]}
              onPress={() => Linking.openURL(SUPPORT_KAKAO_URL).catch(() => {})}
            >
              <Text style={s.smallBtnText}>열기</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={s.row}>
          <Text style={s.rowKey}>이메일</Text>
          <Text style={[s.rowValue, s.link]} onPress={mail} numberOfLines={1}>
            {SUPPORT_EMAIL}
          </Text>
          <Pressable
            style={({ pressed }) => [s.smallBtn, pressed && s.pressed]}
            onPress={() => copy(SUPPORT_EMAIL, '이메일')}
          >
            <Text style={s.smallBtnText}>복사</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [s.callBtn, pressed && s.pressed]}
          onPress={call}
        >
          <Text style={s.callBtnText}>전화 문의 {SUPPORT_PHONE}</Text>
        </Pressable>
      </View>

      {/* FAQ */}
      <View style={s.card}>
        <Text style={s.cardTitle}>자주 묻는 질문 (FAQ)</Text>

        {FAQ.map((item, i) => {
          const on = open === i;
          return (
            <View key={item.q} style={s.faqItem}>
              <Pressable
                style={s.faqQRow}
                onPress={() => setOpen(on ? -1 : i)}
              >
                <Text style={s.faqQMark}>Q.</Text>
                <Text style={s.faqQ}>{item.q}</Text>
                <Icon
                  name={on ? 'chevronDown' : 'chevronRight'}
                  size={14}
                  color={c.muted}
                />
              </Pressable>

              {on ? (
                <View style={s.faqARow}>
                  <Text style={s.faqAMark}>A.</Text>
                  <Text style={s.faqA}>{item.a.map(renderSeg)}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.page, paddingBottom: spacing.xl * 2 },

    head: { marginBottom: spacing.md },
    hours: { fontSize: fontSize.md, color: c.muted },
    hoursValue: { color: c.fg, fontWeight: '700' },

    card: {
      marginBottom: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      backgroundColor: c.surface,
    },
    cardTitle: {
      fontSize: fontSize.lg,
      fontWeight: '800',
      color: c.fg,
      marginBottom: spacing.md,
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    rowKey: { fontSize: fontSize.md, color: c.muted, width: 88 },
    rowValue: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: c.fg },
    link: { color: c.accent, textDecorationLine: 'underline' },

    smallBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.line,
    },
    smallBtnText: { fontSize: fontSize.sm, fontWeight: '700', color: c.muted },
    pressed: { opacity: 0.7 },

    callBtn: {
      marginTop: spacing.md,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      backgroundColor: c.accent,
    },
    callBtnText: { fontSize: fontSize.md, fontWeight: '800', color: '#ffffff' },

    faqItem: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
      paddingVertical: spacing.sm,
    },
    faqQRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    faqQMark: { fontSize: fontSize.md, fontWeight: '800', color: '#ff6a6a' },
    faqQ: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: c.fg },

    faqARow: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingBottom: spacing.md,
      paddingRight: spacing.md,
    },
    faqAMark: { fontSize: fontSize.md, fontWeight: '800', color: '#21c36b' },
    faqA: { flex: 1, fontSize: fontSize.md, lineHeight: 20, color: c.muted },
    faqBold: { fontWeight: '800', color: c.fg },
    faqLink: { color: c.accent, textDecorationLine: 'underline' },
  });
