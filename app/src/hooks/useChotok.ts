import { useEffect, useMemo, useState } from 'react';
import {
  defaultRoomId,
  parseChotok,
  subscribeChotok,
  subscribeChotokDoc,
  type ChotokDocMetrics,
  type ChotokMessage,
} from '@/services/chotok';

/**
 * 업체 초톡방 메시지.
 * 마지막 붙여넣기(kind==='paste') 원문에서 맞출방/필요인원도 같이 계산해 준다.
 */
export function useChotok(storeId: string) {
  const [messages, setMessages] = useState<ChotokMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docMetrics, setDocMetrics] = useState<ChotokDocMetrics | null>(null);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    return subscribeChotok(
      storeId,
      defaultRoomId(storeId),
      rows => {
        setMessages(rows);
        setLoading(false);
      },
      () => {
        setError('초톡 내용을 불러오지 못했습니다.');
        setLoading(false);
      },
    );
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    return subscribeChotokDoc(storeId, setDocMetrics, () => setDocMetrics(null));
  }, [storeId]);

  /**
   * 상단 지표 — 웹 ChatBiz.recomputeFromLastPasted(:335-365) 와 같은 우선순위.
   *   1) 메시지 중 가장 최근 붙여넣기 원문
   *   2) 없으면 rooms_biz 문서의 lastPastedTextRaw / lastPastedText
   *   3) 파싱 결과가 0/0 이면 문서의 needRooms / needPeople 로 폴백
   * 앱에는 2·3 이 없어 관리자 수동 저장만 있는 업소가 0/0 으로 떴다.
   */
  const parsed = useMemo(() => {
    let fromText: { roomCount: number; needSum: number } | null = null;

    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].kind === 'paste') {
        fromText = parseChotok(messages[i].text);
        break;
      }
    }
    if (!fromText && docMetrics?.pastedText) {
      fromText = parseChotok(docMetrics.pastedText);
    }
    if (fromText && (fromText.roomCount > 0 || fromText.needSum > 0)) return fromText;

    if (docMetrics && (docMetrics.needRooms > 0 || docMetrics.needPeople > 0)) {
      return { roomCount: docMetrics.needRooms, needSum: docMetrics.needPeople };
    }
    return fromText;
  }, [messages, docMetrics]);

  return { messages, parsed, loading, error };
}
