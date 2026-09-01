import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SUPPORT_PHONE_TEL } from '@/constants/support';
import { useAuth } from '@/hooks/useAuth';
import {
  HOLIDAYS,
  INCOME_TYPES,
  WEEKDAYS,
  calcTax,
  dateKey,
  digitsOnly,
  formatKRW,
  loadEvents,
  loadMoney,
  monthCells,
  monthTotals,
  newEventId,
  saveEvents,
  saveMoney,
  withComma,
  type DiaryEvent,
  type EventMap,
  type IncomeType,
  type MoneyMap,
  type TaxResult,
} from '@/services/diary';
import { fontSize, radius, spacing, useTheme, type ThemeColors } from '@/theme';

const TODAY = new Date();

/** 일정/달력 — 웹 DiaryPage.vue 이식 (월 격자 · 수입/지출 · 세금 추정) */
export default function DiaryScreen() {
  const c = useTheme();
  const s = styles(c);
  const { uid } = useAuth();

  const [year, setYear] = useState(TODAY.getFullYear());
  const [month0, setMonth0] = useState(TODAY.getMonth());
  const [events, setEvents] = useState<EventMap>({});
  const [money, setMoney] = useState<MoneyMap>({});

  /* 입력 시트 */
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [incomeStr, setIncomeStr] = useState('');
  const [expenseStr, setExpenseStr] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  /* 세금 */
  const [incomeType, setIncomeType] = useState<IncomeType['key']>('freelancer');
  const [tax, setTax] = useState<TaxResult | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([loadEvents(uid), loadMoney(uid)]).then(([e, m]) => {
      if (!alive) return;
      setEvents(e);
      setMoney(m);
    });
    return () => {
      alive = false;
    };
  }, [uid]);

  const cells = useMemo(() => monthCells(year, month0), [year, month0]);
  const totals = useMemo(() => monthTotals(money, year, month0), [money, year, month0]);

  const goPrev = useCallback(() => {
    const d = new Date(year, month0 - 1, 1);
    setYear(d.getFullYear());
    setMonth0(d.getMonth());
  }, [year, month0]);

  const goNext = useCallback(() => {
    const d = new Date(year, month0 + 1, 1);
    setYear(d.getFullYear());
    setMonth0(d.getMonth());
  }, [year, month0]);

  const openDay = useCallback(
    (day: number) => {
      const k = dateKey(year, month0 + 1, day);
      const m = money[k];
      setSheetKey(k);
      setEditingId(null);
      setTitle('');
      setMemo('');
      // 웹과 동일: 0 이면 빈 칸으로 둔다
      setIncomeStr(m?.i ? formatKRW(m.i) : '');
      setExpenseStr(m?.e ? formatKRW(m.e) : '');
    },
    [year, month0, money],
  );

  const closeSheet = useCallback(() => setSheetKey(null), []);

  const onSaveEvent = useCallback(async () => {
    if (!sheetKey) return;
    const t = title.trim();
    if (!t) {
      Alert.alert('일정', '제목을 입력해 주세요.');
      return;
    }
    const next: EventMap = {};
    // 다른 날짜에 있던 같은 id 는 옮긴다 (웹 saveEvent 와 동일)
    for (const [k, rows] of Object.entries(events)) {
      const kept = editingId ? rows.filter(r => r.id !== editingId) : rows;
      if (kept.length) next[k] = kept;
    }
    const item: DiaryEvent = {
      id: editingId ?? newEventId(),
      date: sheetKey,
      title: t,
      memo,
    };
    next[sheetKey] = [...(next[sheetKey] ?? []), item].sort((a, b) =>
      a.title.localeCompare(b.title),
    );

    setEvents(next);
    await saveEvents(uid, next);
    setEditingId(null);
    setTitle('');
    setMemo('');
  }, [sheetKey, title, memo, events, editingId, uid]);

  const onSaveMoney = useCallback(async () => {
    if (!sheetKey) return;
    const next: MoneyMap = {
      ...money,
      [sheetKey]: {
        i: Number(digitsOnly(incomeStr)) || 0,
        e: Number(digitsOnly(expenseStr)) || 0,
      },
    };
    setMoney(next);
    await saveMoney(uid, next);
    Alert.alert('저장', '금액이 저장되었습니다.');
  }, [sheetKey, incomeStr, expenseStr, money, uid]);

  const onRemove = useCallback(
    (ev: DiaryEvent) => {
      Alert.alert('일정 삭제', `'${ev.title}' 을(를) 삭제할까요?`, [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const rows = (events[ev.date] ?? []).filter(r => r.id !== ev.id);
            const next = { ...events };
            if (rows.length) next[ev.date] = rows;
            else delete next[ev.date];
            setEvents(next);
            await saveEvents(uid, next);
          },
        },
      ]);
    },
    [events, uid],
  );

  const onEdit = useCallback((ev: DiaryEvent) => {
    setEditingId(ev.id);
    setTitle(ev.title);
    setMemo(ev.memo);
  }, []);

  const onCalc = useCallback(() => {
    setTax(calcTax(totals.income, totals.expense, incomeType));
  }, [totals, incomeType]);

  const sheetEvents = sheetKey ? events[sheetKey] ?? [] : [];

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* 월 이동 */}
      <View style={s.monthBar}>
        <Pressable onPress={goPrev} hitSlop={10} style={s.navBtn}>
          <Text style={s.navText}>‹</Text>
        </Pressable>
        <Text style={s.monthTitle}>
          {year}년 {month0 + 1}월
        </Text>
        <Pressable onPress={goNext} hitSlop={10} style={s.navBtn}>
          <Text style={s.navText}>›</Text>
        </Pressable>
      </View>

      {/* 요일 */}
      <View style={s.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <Text
            key={w}
            style={[s.weekday, i === 0 && s.sun, i === 6 && s.sat]}
          >
            {w}
          </Text>
        ))}
      </View>

      {/* 날짜 격자 */}
      <View style={s.grid}>
        {cells.map((day, idx) => {
          if (day === null) return <View key={`p${idx}`} style={s.cell} />;

          const k = dateKey(year, month0 + 1, day);
          const dt = new Date(year, month0, day);
          const m = money[k];
          const evCount = (events[k] ?? []).length;
          const holiday = HOLIDAYS[k];
          const isToday =
            year === TODAY.getFullYear() &&
            month0 === TODAY.getMonth() &&
            day === TODAY.getDate();

          return (
            <Pressable
              key={k}
              style={({ pressed }) => [
                s.cell,
                isToday && s.cellToday,
                pressed && s.pressed,
              ]}
              onPress={() => openDay(day)}
            >
              <Text
                style={[
                  s.dayNum,
                  dt.getDay() === 0 && s.sun,
                  dt.getDay() === 6 && s.sat,
                  !!holiday && s.sun,
                ]}
              >
                {day}
              </Text>
              {evCount > 0 ? <View style={s.dot} /> : null}

              <View style={s.badges}>
                <Text style={[s.badge, s.badgeIn]} numberOfLines={1}>
                  입 {formatKRW(m?.i ?? 0)}
                </Text>
                <Text style={[s.badge, s.badgeOut]} numberOfLines={1}>
                  출 {formatKRW(m?.e ?? 0)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* 세금 추정 */}
      <View style={s.card}>
        <Text style={s.cardTitle}>세금 추정</Text>

        <Row label="기간" value={`${year}년 ${month0 + 1}월`} c={c} />
        <Row label="총수입" value={`${formatKRW(totals.income)} 원`} c={c} />
        <Row label="총지출" value={`${formatKRW(totals.expense)} 원`} c={c} />

        <Text style={s.fieldLabel}>소득유형</Text>
        <View style={s.typeRow}>
          {INCOME_TYPES.map(t => {
            const on = incomeType === t.key;
            return (
              <Pressable
                key={t.key}
                style={[s.typeBtn, on && s.typeBtnOn]}
                onPress={() => setIncomeType(t.key)}
              >
                <Text style={[s.typeText, on && s.typeTextOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={s.actionRow}>
          <Pressable style={[s.actBtn, s.actPrimary]} onPress={onCalc}>
            <Text style={s.actPrimaryText}>추정세금 계산</Text>
          </Pressable>
          <Pressable
            style={[s.actBtn, s.actGhost]}
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE_TEL}`).catch(() => {})}
          >
            <Text style={s.actGhostText}>전문세무사 연결</Text>
          </Pressable>
        </View>

        {tax ? (
          <View style={s.taxResult}>
            <Row label="총수입" value={`${formatKRW(tax.income)} 원`} c={c} />
            <Row label="총지출(필요경비)" value={`${formatKRW(tax.expense)} 원`} c={c} />
            <Row
              label="과세표준 추정(= 수입−지출)"
              value={`${formatKRW(tax.taxBase)} 원`}
              c={c}
            />
            <Row label="소득세(국세)" value={`${formatKRW(tax.incomeTax)} 원`} c={c} />
            <Row
              label="지방소득세(소득세의 10%)"
              value={`${formatKRW(tax.localTax)} 원`}
              c={c}
            />
            <Row
              label="종합소득세 합계(국세+지방)"
              value={`${formatKRW(tax.totalDue)} 원`}
              c={c}
            />
            {incomeType === 'freelancer' ? (
              <Row
                label="원천징수(3.3%)"
                value={`${formatKRW(tax.withholding.total)} 원 (소득세 ${formatKRW(
                  tax.withholding.itx,
                )}, 지방세 ${formatKRW(tax.withholding.ltx)})`}
                c={c}
              />
            ) : (
              <Row
                label="갑근세(근로 원천징수)"
                value="간이세액표 기준 월별 원천징수(간이 추정 미적용)"
                c={c}
              />
            )}
            <Row
              label="예상 추가 납부(= 종합소득세 − 원천징수)"
              value={`${formatKRW(tax.finalPayable)} 원`}
              c={c}
              strong
            />
            <Text style={s.footnote}>
              ※ 간이 계산입니다. 실제 산출세액은 공제·감면, 소득구분, 가족수/공제항목,
              간이세액표 적용 등에 따라 달라질 수 있습니다.
            </Text>
          </View>
        ) : null}
      </View>

      {/* 날짜 입력 시트 */}
      <Modal
        visible={sheetKey !== null}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <Pressable style={s.dim} onPress={closeSheet}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{sheetKey}</Text>
              <Pressable onPress={closeSheet} hitSlop={8}>
                <Text style={s.close}>✕</Text>
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLabel}>제목</Text>
              <TextInput
                style={s.input}
                value={title}
                onChangeText={setTitle}
                placeholder="예: 테스트 오픈"
                placeholderTextColor={c.muted}
              />

              <Text style={s.fieldLabel}>메모</Text>
              <TextInput
                style={[s.input, s.textarea]}
                value={memo}
                onChangeText={setMemo}
                placeholder="상세 메모(선택)"
                placeholderTextColor={c.muted}
                multiline
                textAlignVertical="top"
              />

              <Pressable style={[s.actBtn, s.actPrimary]} onPress={onSaveEvent}>
                <Text style={s.actPrimaryText}>
                  {editingId ? '일정 수정' : '일정 저장'}
                </Text>
              </Pressable>

              <View style={s.moneyCard}>
                <Text style={s.cardTitle}>수입·지출 입력</Text>
                <View style={s.moneyRow}>
                  <View style={s.moneyCol}>
                    <Text style={s.fieldLabel}>수입</Text>
                    <TextInput
                      style={s.input}
                      value={incomeStr}
                      onChangeText={v => setIncomeStr(withComma(v))}
                      placeholder="0"
                      placeholderTextColor={c.muted}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={s.moneyCol}>
                    <Text style={s.fieldLabel}>지출</Text>
                    <TextInput
                      style={s.input}
                      value={expenseStr}
                      onChangeText={v => setExpenseStr(withComma(v))}
                      placeholder="0"
                      placeholderTextColor={c.muted}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                <Pressable style={[s.actBtn, s.actGhost]} onPress={onSaveMoney}>
                  <Text style={s.actGhostText}>금액 저장</Text>
                </Pressable>
                <Text style={s.help}>
                  * 금액 저장만 해도 달력에 즉시 반영됩니다. 일정은 비워둬도 됩니다.
                </Text>
              </View>

              {sheetEvents.length ? (
                <View style={s.evList}>
                  <Text style={s.cardTitle}>이 날짜의 일정</Text>
                  {sheetEvents.map(ev => (
                    <View key={ev.id} style={s.evRow}>
                      <View style={s.evBody}>
                        <Text style={s.evTitle}>{ev.title}</Text>
                        {ev.memo ? (
                          <Text style={s.evMemo} numberOfLines={2}>
                            {ev.memo}
                          </Text>
                        ) : null}
                      </View>
                      <Pressable onPress={() => onEdit(ev)} hitSlop={6} style={s.evBtn}>
                        <Text style={s.evBtnText}>수정</Text>
                      </Pressable>
                      <Pressable onPress={() => onRemove(ev)} hitSlop={6} style={s.evBtn}>
                        <Text style={[s.evBtnText, s.danger]}>삭제</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  c,
  strong,
}: {
  label: string;
  value: string;
  c: ThemeColors;
  strong?: boolean;
}) {
  const s = styles(c);
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, strong && s.infoStrong]}>{value}</Text>
    </View>
  );
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
    pressed: { opacity: 0.7 },

    monthBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xl,
      paddingVertical: spacing.md,
    },
    navBtn: { paddingHorizontal: spacing.md },
    navText: { fontSize: 26, color: c.fg },
    monthTitle: { fontSize: fontSize.xl, fontWeight: '800', color: c.fg },

    weekRow: { flexDirection: 'row' },
    weekday: {
      flex: 1,
      textAlign: 'center',
      fontSize: fontSize.sm,
      color: c.muted,
      paddingBottom: spacing.xs,
    },
    sun: { color: '#d84b5d' },
    sat: { color: '#3b6bd6' },

    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: `${100 / 7}%`,
      height: 72,
      paddingTop: 3,
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
    },
    cellToday: { backgroundColor: c.accentWeak },
    dayNum: { fontSize: fontSize.md, fontWeight: '700', color: c.fg },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.accent,
      marginTop: 1,
    },
    badges: { position: 'absolute', left: 2, right: 2, bottom: 2, gap: 1 },
    badge: {
      fontSize: 9,
      textAlign: 'center',
      paddingVertical: 1,
      borderRadius: 6,
      overflow: 'hidden',
    },
    badgeIn: { backgroundColor: '#e5f0ff', color: '#1d4ed8' },
    badgeOut: { backgroundColor: '#ffe5e5', color: '#d92c2c' },

    card: {
      marginTop: spacing.lg,
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

    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
    },
    infoLabel: { flex: 1, fontSize: fontSize.md, color: c.muted },
    infoValue: {
      flex: 1,
      fontSize: fontSize.md,
      fontWeight: '700',
      color: c.fg,
      textAlign: 'right',
    },
    infoStrong: { color: c.accent },

    fieldLabel: {
      fontSize: fontSize.sm,
      fontWeight: '700',
      color: c.muted,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    typeRow: { gap: spacing.sm },
    typeBtn: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.line,
    },
    typeBtnOn: { borderColor: c.accent, backgroundColor: c.accentWeak },
    typeText: { fontSize: fontSize.md, color: c.muted },
    typeTextOn: { color: c.accent, fontWeight: '700' },

    actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    actBtn: {
      flex: 1,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      marginTop: spacing.md,
    },
    actPrimary: { backgroundColor: c.accent },
    actPrimaryText: { fontSize: fontSize.md, fontWeight: '800', color: '#ffffff' },
    actGhost: { borderWidth: 1, borderColor: c.line },
    actGhostText: { fontSize: fontSize.md, fontWeight: '700', color: c.muted },

    taxResult: { marginTop: spacing.lg },
    footnote: {
      marginTop: spacing.md,
      fontSize: fontSize.xs,
      lineHeight: 15,
      color: c.muted,
    },

    dim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' },
    sheet: {
      maxHeight: '88%',
      paddingHorizontal: spacing.page,
      paddingBottom: spacing.xl,
      borderTopLeftRadius: radius.md,
      borderTopRightRadius: radius.md,
      backgroundColor: c.surface,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      marginTop: spacing.sm,
      borderRadius: 2,
      backgroundColor: c.line,
    },
    sheetHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
    },
    sheetTitle: { fontSize: fontSize.xl, fontWeight: '800', color: c.fg },
    close: { fontSize: fontSize.lg, color: c.muted, paddingHorizontal: 4 },

    input: {
      height: 44,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      fontSize: fontSize.md,
      color: c.fg,
      backgroundColor: c.surface,
    },
    textarea: { height: 88, paddingTop: spacing.md },

    moneyCard: {
      marginTop: spacing.xl,
      padding: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: c.chipBg,
    },
    moneyRow: { flexDirection: 'row', gap: spacing.md },
    moneyCol: { flex: 1 },
    help: { marginTop: spacing.sm, fontSize: fontSize.xs, color: c.muted },

    evList: { marginTop: spacing.xl },
    evRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
    },
    evBody: { flex: 1 },
    evTitle: { fontSize: fontSize.md, fontWeight: '700', color: c.fg },
    evMemo: { marginTop: 2, fontSize: fontSize.sm, color: c.muted },
    evBtn: { paddingHorizontal: spacing.sm, paddingVertical: 4 },
    evBtnText: { fontSize: fontSize.sm, fontWeight: '700', color: c.muted },
    danger: { color: '#dc2626' },
  });
